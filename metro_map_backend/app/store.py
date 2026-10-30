from .config import ROUTES
from .models import RouteInfo

snapshots: dict[str, RouteInfo] = {
    name: RouteInfo(route = name, vehicles = [], transit_mode = None) for _, name in ROUTES.items() 
}