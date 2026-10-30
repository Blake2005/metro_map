from datetime import datetime
from typing import Literal

from pydantic import BaseModel

# Pydantic model describing the position of a single vehicle as reported by the transit feed.
class Vehicle(BaseModel):
    trip_id: int
    route_id: int
    latitude: float
    longitude: float
    bearing: float | None = None
    speed: float
    location_time: int

# Pydantic model describing a train vehicle together with its direction of travel.
class Train(Vehicle):
    direction: Literal["EB", "WB", "SB", "NB"]


# class Bus(Vehicle):


# Pydantic model describing the vehicle list and status of a single transit route.
class RouteInfo(BaseModel):
    route: str
    vehicles: list[Vehicle]
    transit_mode: str | None = None # None until first fetch
    updated_at: datetime | None = None # None until first fetch