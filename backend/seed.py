from datetime import date, timedelta
import random

import models, database

random.seed(42)              # remove for non-repeatable randomness
models.Base.metadata.create_all(bind=database.engine)

with database.SessionLocal() as db:
    # ── pumps (if not present) ──────────────────────────────────────────
    if not db.query(models.Pump).count():
        db.add_all([
            models.Pump(id=1, name="Pump 1", fuel_type="petrol"),
            models.Pump(id=2, name="Pump 2", fuel_type="petrol"),
            models.Pump(id=3, name="Pump 3", fuel_type="diesel"),
            models.Pump(id=4, name="Pump 4", fuel_type="diesel"),
        ])

    # ── price table (static sample) ─────────────────────────────────────
    today   = date.today()
    span    = 60                                    # ~2 months
    dates   = [today - timedelta(days=i) for i in range(span)][::-1]

    for d in dates:
        db.add_all([
            models.FuelRate(date=d, fuel_type="petrol", rate_per_unit=272.5),
            models.FuelRate(date=d, fuel_type="diesel", rate_per_unit=288.4),
        ])

    # ── daily *random* units, no cumulative pattern ─────────────────────
    for d in dates:
        # petrol pumps
        for pid in (1, 2):
            db.add(models.PumpReading(
                pump_id=pid,
                reading_date=d,
                units=random.randint(200, 800)      # 200–800 L sold that day
            ))
        # diesel pumps
        for pid in (3, 4):
            db.add(models.PumpReading(
                pump_id=pid,
                reading_date=d,
                units=random.randint(300, 1200)     # 300–1200 L sold that day
            ))

    db.commit()

print(f"Seed complete: {span} days × 4 pumps inserted (random daily units).")