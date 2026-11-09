from .config import ROUTES
from .models import RouteInfo

snapshots: dict[int, RouteInfo] = {
    rid: RouteInfo(route_name = name, vehicles = [], transit_mode = None) for rid, name in ROUTES.items() 
}