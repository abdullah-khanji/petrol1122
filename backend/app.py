from fastapi import FastAPI, HTTPException
from datetime import date
import models, database
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from sqlalchemy import select, func

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

from sqlalchemy import select, func, and_

@app.get("/readings2/{fuel}")       # fuel = petrol | diesel
def readings_by_fuel(fuel: str):
    if fuel not in {"petrol", "diesel"}:
        raise HTTPException(400, "fuel must be 'petrol' or 'diesel'")

    stmt = (
        select(
            models.PumpReading.reading_date.label("reading_date"),
            func.sum(models.PumpReading.units).label("total_units"),
            models.FuelRate.rate_per_unit.label("rate_per_unit")
        )
        # pumps → readings
        .join(models.Pump, models.Pump.id == models.PumpReading.pump_id)
        # fuel_rates ↔︎ (fuel_type, date)
        .join(
            models.FuelRate,
            and_(
                models.FuelRate.fuel_type == models.Pump.fuel_type,
                models.FuelRate.date == models.PumpReading.reading_date
            )
        )
        .where(models.Pump.fuel_type == fuel)                     # petrol / diesel
        .group_by(
            models.PumpReading.reading_date,
            models.FuelRate.rate_per_unit
        )
        .order_by(models.PumpReading.reading_date.asc())
    )

    with database.SessionLocal() as db:
        rows = db.execute(stmt).all()

    # shape the API response
    return [
        {
            "date": str(date),
            "fuel_type": fuel,
            "units": float(units),
            "rate_per_unit": float(rate)
        }
        for date, units, rate in rows
    ]
    
    
    
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
        
        return {
            "total_revenue":total_revenue,
            "total_cost":total_cost,
            "detail":[
        {
            "date": str(reading_date),
            "fuel_type": fuel_type,
            "units": units,
            "recent_buy_price":recent_buy_price,
            "selling_price":selling_price,
            "cost_amount": float(cost_amount),
            "revenue_amount": float(revenue_amount)
        }
        for id, reading_date, fuel_type, units, selling_price,recent_buy_price, cost_amount, revenue_amount in rows
    ]}



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
                    .order_by(models.PumpReading.reading_date.desc())
                    .limit(1)
                ).scalar()
            ) or 0

            latest_rate = (
                db.execute(
                    select(models.PumpReading.rate_per_unit)
                    .where(models.PumpReading.pump_id == pump.id)
                    .order_by(models.PumpReading.reading_date.desc())
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
            db.add(models.PumpReading(
                pump_id       = r.pump_id,
                reading_date  = today,
                units         = units,
                rate_per_unit = r.unit_rate,
                meter_reading = r.current_meter,
            ))
            inserted.append({"pump_id": r.pump_id, "units": units})

        db.commit()

    return {"inserted": len(inserted), "detail": inserted}    