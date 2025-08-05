from datetime import date, timedelta
import random
import models, database

random.seed(42)
models.Base.metadata.create_all(bind=database.engine)

with database.SessionLocal() as db:
    # pumps
    if not db.query(models.Pump).count():
        db.add_all([
            models.Pump(id=1, name="Pump 1", fuel_type="petrol"),
            models.Pump(id=2, name="Pump 2", fuel_type="petrol"),
            models.Pump(id=3, name="Pump 3", fuel_type="diesel"),
            models.Pump(id=4, name="Pump 4", fuel_type="diesel"),
        ])

    today  = date.today()
    span   = 60                           # last two months
    dates  = [today - timedelta(days=i) for i in range(span)][::-1]

    for d in dates:
        # petrol pumps
        for pid in (1, 2):
            db.add(models.PumpReading(
                pump_id=pid,
                reading_date=d,
                units=round(random.uniform(100, 200),2),        # odometer reading
                rate_per_unit=round(random.uniform(30, 50)),   # random daily price
            ))
        # diesel pumps
        for pid in (3, 4):
            db.add(models.PumpReading(
                pump_id=pid,
                reading_date=d,
                units=round(random.uniform(150, 200),2),
                rate_per_unit=round(random.uniform(20, 30),2),
            ))

    db.commit()

print("Seed complete – 60 days × 4 pumps.")
