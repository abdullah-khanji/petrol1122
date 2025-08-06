from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, event, text
from datetime import date
from pydantic import BaseModel


Base = declarative_base()
class Pump(Base):
    __tablename__ = "pumps"
    id        = Column(Integer, primary_key=True)
    name      = Column(String,  nullable=False)
    fuel_type = Column(String,  nullable=False)  # petrol | diesel

class PumpReading(Base):
    __tablename__ = "pump_readings"
    id            = Column(Integer, primary_key=True)
    pump_id       = Column(Integer, ForeignKey("pumps.id"), nullable=False)
    reading_date  = Column(Date,    nullable=False)
    units         = Column(Float,   nullable=False)  # odometer reading
    rate_per_unit = Column(Float,   nullable=False)  # buying rate PKR/L
    meter_reading = Column(Float,   nullable=False)

class ReadingIn(BaseModel):
    pump_id:       int
    reading_date:  date
    units:         float
    rate_per_unit: float
    meter_reading: float


class BuyingUnitRate(Base):
    __tablename__ = "buying_unit_rate"

    id                  = Column(Integer, primary_key=True)
    date                = Column(Date,    nullable=False)
    fuel_type           = Column(String,  nullable=False)        # petrol | diesel
    buying_rate_per_unit= Column(Float,   nullable=False)        # e.g., 270.5
    units               = Column(Float,   nullable=False)        # how many litres bought
    total_units         = Column(Float,   nullable=False)        # running total

@event.listens_for(BuyingUnitRate, "before_insert")
def _calc_running_total(mapper, connection, target):
    """
    Fetch the previous cumulative total for this fuel_type
    and add `target.units` to derive `target.total_units`.
    """
    prev_total = connection.execute(
        text(
            "SELECT total_units FROM buying_unit_rate"
            " WHERE fuel_type = :ft ORDER BY id DESC LIMIT 1"
        ),
        {"ft": target.fuel_type},
    ).scalar()

    target.total_units = (prev_total or 0) + target.units

class TyreStock(Base):
    __tablename__ = "tyre_stock"

    id              = Column(Integer, primary_key=True)
    tyre            = Column(String,  nullable=False)   # e.g. "175/70-R13"
    buying_price    = Column(Float,   nullable=False)   # per tyre
    available_stock = Column(Integer, nullable=False)   # current inventory
    sold_units      = Column(Integer, nullable=False, default=0)


# ── Pydantic payloads ------------------------------------------------------
class TyrePurchaseIn(BaseModel):
    tyre:            str
    buying_price:    float
    units:           int                                 # how many bought

class TyreSaleIn(BaseModel):
    id:              int                                 # TyreStock.id
    units_sold:      int