from fastapi import FastAPI, HTTPException
from datetime import date
import models, database
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

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

@app.get('/report/summary')
def summary():
    with database.SessionLocal() as db:
        total  = db.execute(text("""
            SELECT SUM((pr.units) * fr.rate_per_unit)
            FROM pump_readings pr
            JOIN fuel_rates fr ON fr.date = pr.reading_date
              AND fr.fuel_type = (SELECT fuel_type FROM pumps WHERE id = pr.pump_id)
        """)).scalar() or 0

        petrol = db.execute(text("""
            SELECT SUM(pr.units * fr.rate_per_unit)
            FROM pump_readings pr
            JOIN pumps p  ON p.id = pr.pump_id AND p.fuel_type='petrol'
            JOIN fuel_rates fr ON fr.date = pr.reading_date AND fr.fuel_type='petrol'
        """)).scalar() or 0

        diesel = db.execute(text("""
            SELECT SUM(pr.units * fr.rate_per_unit)
            FROM pump_readings pr
            JOIN pumps p  ON p.id = pr.pump_id AND p.fuel_type='diesel'
            JOIN fuel_rates fr ON fr.date = pr.reading_date AND fr.fuel_type='diesel'
        """)).scalar() or 0

        # example: 7-day loss = negative revenue rows in the last 7 days
        loss7 = db.execute(text("""
            WITH diff AS (
              SELECT (pr.units -
                     COALESCE((
                       SELECT pr2.units FROM pump_readings pr2
                       WHERE pr2.pump_id = pr.pump_id
                         AND pr2.reading_date = date(pr.reading_date, '-1 day')
                     ), pr.units)
                     ) * fr.rate_per_unit AS rev
              FROM pump_readings pr
              JOIN fuel_rates fr
                   ON fr.date = pr.reading_date
                   AND fr.fuel_type =
                       (SELECT fuel_type FROM pumps WHERE id = pr.pump_id)
              WHERE pr.reading_date >= date('now', '-7 days')
            )
            SELECT ABS(SUM(rev)) FROM diff WHERE rev < 0;
        """)).scalar() or 0

        return {
            "total":  round(total,  2),
            "petrol": round(petrol, 2),
            "diesel": round(diesel, 2),
            "loss7":  round(loss7, 2)
        }

@app.get('/checking')
def ok():
    with database.SessionLocal() as db:
        rows = db.execute(
        text("""
            SELECT * FROM PumpReading;
        """)                         # ← the whole string wrapped in text(...)
        ).fetchall()
        return {"rows": rows}
    




from datetime import date
from sqlalchemy import text


SQL_BY_RATE = text("""
SELECT
    fr.rate_per_unit,
    SUM(pr.units)                       AS total_units,
    SUM(pr.units) * fr.rate_per_unit    AS total_revenue
FROM pump_readings AS pr
JOIN pumps        AS p  ON p.id         = pr.pump_id
JOIN fuel_rates   AS fr ON fr.fuel_type = p.fuel_type
                        AND fr.date    = pr.reading_date
WHERE p.fuel_type = :fuel                     --  ←─ only the value is bound; query stays the same
GROUP BY fr.rate_per_unit
ORDER BY fr.rate_per_unit;
""")

sql_buy_rate=text("""
    SELECT * FROM buying_unit_rate;
    """)
from decimal import Decimal
@app.get("/report/revenue-cumulative")
def revenue_by_rate():
    out = {"petrol": [], "diesel": []}
    grand_units = Decimal("0")
    grand_revenue = Decimal("0")
    total_buy=Decimal("0")

    with database.SessionLocal() as db:
        for fuel in ("petrol", "diesel"):
            rows = db.execute(SQL_BY_RATE, {"fuel": fuel}).all()
            for rate, units, revenue in rows:
                # accumulate grand totals while we iterate
                grand_units   += Decimal(units)
                grand_revenue += Decimal(revenue)

                out[fuel].append({
                    "rate_per_unit": float(rate),
                    "units"        : float(units),
                    "revenue"      : float(revenue)
                })
    total=out["diesel"][0]['revenue']+out["petrol"][0]['revenue']
    out["total"] = {
        "revenue"  : float(total)
    }
    print(out)
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