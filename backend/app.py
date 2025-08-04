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
    



from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, asc


@app.get("/readings/{fuel}")        # fuel = petrol | diesel
def readings_by_fuel(fuel: str):
    if fuel not in {"petrol", "diesel"}:
        raise HTTPException(400, "fuel must be petrol|diesel")

    stmt = (
        select(models.PumpReading.reading_date,
               models.PumpReading.units)
        .join(models.Pump, models.Pump.id == models.PumpReading.pump_id)
        .where(models.Pump.fuel_type == fuel)
        .order_by(models.PumpReading.reading_date.asc())
    )
    with database.SessionLocal() as db:
        rows = db.execute(stmt).all()
        return [{"date": str(d), "units": u} for d, u in rows]
    
from datetime import date
from sqlalchemy import text

@app.get("/report/revenue-today")
def revenue_today():
    """
    Returns revenue for *today*:
      petrol  = units_sold_today_petrol  × petrol_rate_today
      diesel  = units_sold_today_diesel  × diesel_rate_today
      total   = petrol + diesel
    """
    today = date.today()

    sql = text("""
        WITH deltas AS (
          SELECT
            p.fuel_type               AS fuel,
            pr.reading_date           AS d,
            /* today's units minus yesterday's units for this pump */
            pr.units - COALESCE(
               LAG(pr.units) OVER (
                   PARTITION BY pr.pump_id ORDER BY pr.reading_date
               ),
               pr.units
            ) AS units_sold
          FROM pump_readings pr
          JOIN pumps p ON p.id = pr.pump_id
          WHERE pr.reading_date = :today
        )
        SELECT
          d.fuel                              AS fuel_type,
          SUM(d.units_sold * fr.rate_per_unit) AS revenue
        FROM deltas d
        JOIN fuel_rates fr
             ON fr.date       = :today
            AND fr.fuel_type  = d.fuel
        GROUP BY d.fuel;
    """)

    petrol = diesel = 0.0
    with database.SessionLocal() as db:
        for fuel, rev in db.execute(sql, {"today": today}):
            if fuel == "petrol":
                petrol = rev
            else:
                diesel = rev

    return {
        "petrol": round(petrol, 2),
        "diesel": round(diesel, 2),
        "total":  round(petrol + diesel, 2),
    }
