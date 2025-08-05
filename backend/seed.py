from datetime import date, timedelta
import random
import models, database

import random
from datetime import date, timedelta

random.seed(42)
models.Base.metadata.create_all(bind=database.engine)

with database.SessionLocal() as db:

    # ------------------------------------------------------------------
    # 1) Seed pumps (run only if table is empty)
    # ------------------------------------------------------------------
    if not db.query(models.Pump).count():
        db.add_all([
            models.Pump(id=1, name="Pump 1", fuel_type="petrol"),
            models.Pump(id=2, name="Pump 2", fuel_type="petrol"),
            models.Pump(id=3, name="Pump 3", fuel_type="diesel"),
            models.Pump(id=4, name="Pump 4", fuel_type="diesel"),
        ])

    # ------------------------------------------------------------------
    # 2) Seed buying_unit_rate rows (section B above)
    # ------------------------------------------------------------------
    if not db.query(models.BuyingUnitRate).count():
        db.add_all([
            models.BuyingUnitRate(
                date=date(2025, 7, 20),  fuel_type="petrol",
                buying_rate_per_unit=2,  units=5,  total_units=5
            ),
            models.BuyingUnitRate(
                date=date(2025, 7, 21),  fuel_type="diesel",
                buying_rate_per_unit=3,  units=4,  total_units=4
            ),
            models.BuyingUnitRate(
                date=date(2025, 8, 4),   fuel_type="petrol",
                buying_rate_per_unit=3,  units=2,  total_units=7
            ),
            models.BuyingUnitRate(
                date=date(2025, 8, 4),   fuel_type="diesel",
                buying_rate_per_unit=4,  units=6,  total_units=8
            ),
        ])
    # ------------------------------------------------------------------
    # 3) Generate DAILY readings – units = Δmeter
    # ------------------------------------------------------------------
    today   = date.today()
    span    = 20                                   # last 60 days
    dates   = [today - timedelta(days=i) for i in range(span)][::-1]

    # keep previous odometer value per pump
    prev_meter = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}

    for d in dates:
        for pid in (1, 2, 3, 4):
            # random daily increment (e.g. 90–110 litres)
            increment     = round(random.uniform(10, 20), 2)
            new_meter     = prev_meter[pid] + increment
            daily_units   = new_meter - prev_meter[pid]

            db.add(models.PumpReading(
                pump_id      = pid,
                reading_date = d,
                units        = daily_units,
                rate_per_unit= round(random.uniform(1, 5), 2),   # selling price
                meter_reading= new_meter
            ))

            prev_meter[pid] = new_meter  # update for next day

    db.commit()
