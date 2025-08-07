from fastapi import FastAPI, HTTPException
from datetime import date
import models, database
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from sqlalchemy import select, func, asc, desc
from typing import List, OrderedDict
from typing_extensions import Literal
from collections import defaultdict
import models, database
app = FastAPI()
# allow the Vite dev server & Electron file:// origin
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "file://",                       # Electron in prod
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


models.Base.metadata.create_all(bind=database.engine)

@app.post('/reading')
async def add_reading(r: models.ReadingIn):
    with database.SessionLocal() as db:
        db_obj = models.PumpReading(**r.dict())
        db.add(db_obj)
        db.commit()
        return {"status": "ok", "id": db_obj.id}


# backend/app.py  – append near the bottom
from sqlalchemy import text

from datetime import date
from sqlalchemy import text


SQL_BY_RATE = text("""

SELECT pr.rate_per_unit, SUM(pr.units) as total_units
FROM pump_readings pr
JOIN pumps AS p ON p.id=pr.pump_id
WHERE p.fuel_type=:fuel
GROUP BY pr.rate_per_unit ORDER BY pr.rate_per_unit
;
""")
# rows= db.execute(sql_text, {"fuel": fuel}).all()
        
from decimal import Decimal
@app.get("/report/revenue-cumulative")
def revenue_by_rate():
    out = {"petrol": [], "diesel": []}
    p_grand_units = Decimal("0")
    d_grand_units = Decimal("0")

    with database.SessionLocal() as db:
        rows = db.execute(SQL_BY_RATE, {"fuel": 'petrol'}).all()
        for rate, units in rows:
            # accumulate grand totals while we iterate
            p_grand_units   += Decimal(units)
        rows = db.execute(SQL_BY_RATE, {"fuel": 'diesel'}).all()
        for rate, units in rows:
            # accumulate grand totals while we iterate
            d_grand_units   += Decimal(units)
    out["petrol"]={"units": p_grand_units}
    out["diesel"]={"units": d_grand_units}
    return out


sql_text=text("""
    WITH latest_buy AS (                   -- only PETROL purchases
    SELECT
        bur.fuel_type,
        bur.buying_rate_per_unit,
        bur.date                                   AS start_date,
        LEAD(bur.date) OVER (
            PARTITION BY bur.fuel_type
            ORDER BY   bur.date
        )                                          AS end_date
    FROM buying_unit_rate bur
    WHERE bur.fuel_type = :fuel                 -- ←─ filter
    )

    SELECT
    pr.id,
    pr.reading_date,
    p.fuel_type,
    pr.units,
    pr.rate_per_unit                              AS selling_price,

    lb.buying_rate_per_unit                       AS recent_buy_price,
    ROUND(pr.units * lb.buying_rate_per_unit, 2)  AS cost_amount,
    ROUND(pr.units * pr.rate_per_unit,       2)   AS revenue_amount
    FROM pump_readings pr
    JOIN pumps       p  ON p.id = pr.pump_id
    JOIN latest_buy  lb ON lb.fuel_type = p.fuel_type
                    AND pr.reading_date >= lb.start_date
                    AND (lb.end_date IS NULL OR pr.reading_date < lb.end_date)
    WHERE p.fuel_type = :fuel                       -- ←─ filter (outer)
    ORDER BY pr.reading_date, pr.id;
    """)

from collections import OrderedDict      # OrderedDict keeps insertion order

    
@app.get('/readings3/{fuel}')
def getting_revenue(fuel: str):
    with database.SessionLocal() as db:
        # for fuel in ("petrol", "diesel"):
        #     rows = db.execute(sql_text, {"fuel": fuel}).mappings().all()
        #     rows = [dict(r) for r in rows]
            
        #     total_revenue= round(sum(row['revenue_amount'] for row in rows),2)
        #     print(total_revenue)
        
        if fuel not in {"petrol", "diesel"}:
            raise HTTPException(400, "fuel must be 'petrol' or 'diesel'")
        rows= db.execute(sql_text, {"fuel": fuel}).all()
        
        total_revenue=round(sum(row[7] for row in rows), 2)
        total_cost= round(sum(row[6] for row in rows), 2)
        
        totals = OrderedDict()        # date → dict of running sums

        for r in rows:
            d = r[1]                  # date string, e.g. '2025-08-06'

            if d not in totals:       # initialise once per new date
                totals[d] = {
                    "units"         : 0.0,
                    "selling_price" : 0.0,
                    "cost_amount"   : 0.0,
                    "revenue_amount": 0.0,
                }

            totals[d]["units"]          += r[3]
            totals[d]["selling_price"]  += r[4]
            totals[d]["cost_amount"]    += r[6]
            totals[d]["revenue_amount"] += r[7]


        
    
        return {
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "detail": [
            {
                "date": d,                     # ← add a key name for the date
                "units": s["units"],
                "revenue_amount": s["revenue_amount"],
            }
            for d, s in totals.items()         # ← iterate here
        ],
        }



# ── schema used by POST ----------------------------------------------------
class ReadingInput(BaseModel):
    pump_id:        int
    previous_meter: float = Field(..., ge=0)
    current_meter:  float = Field(..., ge=0)
    unit_rate:      float = Field(..., ge=0)


# ── GET: fetch default values for the entry table --------------------------
@app.get("/pumps/latest-meters")
def latest_meters():
    """
    Returns one row per pump:
       {pump_id, pump_name, fuel_type, previous_meter, unit_rate}
    `previous_meter` and `unit_rate` are pulled from the most recent reading;
    0 if none exist yet.
    """
    with database.SessionLocal() as db:
        pumps = db.query(models.Pump).all()
        rows  = []

        for pump in pumps:
            prev_meter = (
                db.execute(
                    select(models.PumpReading.meter_reading)
                    .where(models.PumpReading.pump_id == pump.id)
                    .order_by(models.PumpReading.id.desc())
                    .limit(1)
                ).scalar()
            ) or 0

            latest_rate = (
                db.execute(
                    select(models.PumpReading.rate_per_unit)
                    .where(models.PumpReading.pump_id == pump.id)
                    .order_by(models.PumpReading.id.desc())
                    .limit(1)
                ).scalar()
            ) or 0

            rows.append({
                "pump_id"       : pump.id,
                "pump_name"     : pump.name,
                "fuel_type"     : pump.fuel_type,
                "previous_meter": round(prev_meter,3),
                "unit_rate"     : round(latest_rate, 3),
            })

        return rows


# ── POST: store the readings the user submits ------------------------------
@app.post("/pumps/readings")
def add_readings(readings: List[ReadingInput]):
    today = date.today()
    inserted = []
    sold_by_fuel = defaultdict(float)

    with database.SessionLocal() as db:
        for r in readings:
            pump = db.get(models.Pump, r.pump_id)
            if not pump:
                raise HTTPException(404, f"Pump {r.pump_id} not found")

            if r.current_meter < r.previous_meter:
                raise HTTPException(
                    400,
                    f"Current meter < previous meter for pump {r.pump_id}"
                )

            units = r.current_meter - r.previous_meter
            sold_by_fuel[pump.fuel_type] += units
            
            db.add(models.PumpReading(
                pump_id       = r.pump_id,
                reading_date  = today,
                units         = units,
                rate_per_unit = r.unit_rate,
                meter_reading = r.current_meter,
            ))
            inserted.append({"pump_id": r.pump_id, "units": units})
        
        # ── NEW: subtract sold units from latest buying_unit_rate row ─────────
        for fuel, units_sold in sold_by_fuel.items():
            db.execute(
                text(
                    """
                    UPDATE buying_unit_rate
                    SET total_units = total_units - :units_sold
                    WHERE id = (
                        SELECT id FROM buying_unit_rate
                        WHERE fuel_type = :fuel
                        ORDER BY id DESC
                        LIMIT 1
                    )
                    """
                ),
                {"units_sold": units_sold, "fuel": fuel},
            )
        db.commit()

    return {"inserted": len(inserted), "detail": inserted}    



@app.get("/pump_readings")
def list_pump_readings():
    """
    Full pump_readings table, joined with pump name,
    sorted ascending by date then id.
    """
    with database.SessionLocal() as db:
        stmt = (
            select(
                models.PumpReading.id,
                models.PumpReading.reading_date,
                models.PumpReading.units,
                models.PumpReading.rate_per_unit,
                models.PumpReading.meter_reading,
                models.Pump.name.label("pump_name"),
                models.Pump.fuel_type,
            )
            .join(models.Pump, models.Pump.id == models.PumpReading.pump_id)
            .order_by(desc(models.PumpReading.reading_date),
                      desc(models.PumpReading.id))
        )
        rows = db.execute(stmt).mappings().all()
        return [dict(r) for r in rows]         # JSON-serialisable
    


class BuyingUnitIn(BaseModel):
    date:                 date
    fuel_type:            Literal["petrol", "diesel"]
    buying_rate_per_unit: float
    units:                float

@app.post("/buying-unit-rate")
def add_buying(buy: BuyingUnitIn):
    with database.SessionLocal() as db:
        db.add(models.BuyingUnitRate(**buy.dict()))
        db.commit()
    return {"status": "ok"}


@app.get("/fuel-stock")
def fuel_stock():
    """
    Return the most-recent total_units for petrol and diesel
    from buying_unit_rate.
    """
    sql = text(
        """
        SELECT fuel_type, total_units
        FROM buying_unit_rate b
        WHERE (b.fuel_type, b.id) IN (
            SELECT fuel_type, MAX(id)            -- newest row per fuel
            FROM buying_unit_rate
            GROUP BY fuel_type
        )
        """
    )

    with database.SessionLocal() as db:
        rows = db.execute(sql).all()

    # rows → [('petrol', 6000.0), ('diesel', 3000.0)]  → dict
    return {fuel: total for fuel, total in rows}



@app.get("/buying_unit_rate")
def list_buying_unit_rate():
    """
    Return all purchase records ordered by date then id.
    """
    with database.SessionLocal() as db:
        rows = (
            db.query(models.BuyingUnitRate)
              .order_by(desc(models.BuyingUnitRate.date),
                        desc(models.BuyingUnitRate.id))
              .all()
        )
        return [
            {
                "id"       : r.id,
                "date"     : r.date.isoformat(),
                "fuel_type": r.fuel_type,
                "buying_rate_per_unit": r.buying_rate_per_unit,
                "units"    : r.units,
                "total_units": r.total_units,
            }
            for r in rows
        ]
    


@app.post("/tyre/purchase")
def add_tyre_purchase(p: models.TyrePurchaseIn):
    with database.SessionLocal() as db:
        db.add(models.TyreStock(
            tyre            = p.tyre,
            buying_price    = p.buying_price,
            available_stock = p.units,
            sold_units      = 0,
        ))
        db.commit()
    return {"status": "ok"}


# ── POST: record a sale (decrements stock) ---------------------------------
@app.post("/tyre/sale")
def tyre_sale(s: models.TyreSaleIn):
    with database.SessionLocal() as db:
        row = db.get(models.TyreStock, s.id)
        if not row:
            raise HTTPException(404, f"Tyre id {s.id} not found")
        if s.units_sold > row.available_stock:
            raise HTTPException(400, "Not enough stock")
        row.available_stock -= s.units_sold
        row.sold_units      += s.units_sold
        db.commit()
    return {"status": "ok"}


# ── GET: list all tyres ----------------------------------------------------
@app.get("/tyre_stock")
def list_tyre_stock():
    with database.SessionLocal() as db:
        rows = (
            db.query(models.TyreStock)
              .order_by(asc(models.TyreStock.tyre))
              .all()
        )
        return [
            {
                "id"   : r.id,
                "tyre" : r.tyre,
                "buying_price"   : r.buying_price,
                "available_stock": r.available_stock,
                "sold_units"     : r.sold_units,
            }
            for r in rows
        ]
    

@app.post("/loans")
def add_loan(l: models.LoanIn):
    with database.SessionLocal() as db:
        db.add(models.Loan(**l.dict()))
        db.commit()
        return {"status": "ok"}

# ───────── list people + totals
@app.get("/loans/people")
def loan_people():
    sql = text("""
        SELECT
          p.id, p.name, p.address, p.phone,
          COALESCE(SUM(l.units * l.unit_rate), 0) AS total_pkr
        FROM persons p
        LEFT JOIN loans l ON l.person_id = p.id
        GROUP BY p.id
        ORDER BY p.name;
    """)
    with database.SessionLocal() as db:
        rows = db.execute(sql).fetchall()
        return [dict(r) for r in rows]

# ───────── detail for one person
@app.get("/loans/person/{pid}")
def loan_detail(pid: int):
    with database.SessionLocal() as db:
        person = db.execute(text("SELECT * FROM persons WHERE id=:pid"), {"pid": pid}).first()
        if not person:
            raise HTTPException(404, "Person not found")
        loans = db.execute(text("""
            SELECT id, date, units, unit_rate, fuel_type,
                   (units * unit_rate) AS pkr
            FROM loans
            WHERE person_id = :pid
            ORDER BY date DESC
        """), {"pid": pid}).fetchall()
        return {"person": dict(person), "loans": [dict(l) for l in loans]}
    


# ---------- create a person ----------
@app.post("/persons")
def create_person(p: models.PersonIn):
    with database.SessionLocal() as db:
        db_obj = models.Person(**p.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return {"id": db_obj.id}

# ---------- create a loan ----------
@app.post("/loans")
def add_loan(l: models.LoanIn):
    with database.SessionLocal() as db:
        db.add(models.Loan(**l.dict()))
        db.commit()
        return {"status": "ok"}
