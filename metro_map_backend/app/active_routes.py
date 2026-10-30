from pydantic import BaseModel

# In-memory registry of the transit routes that the map is currently tracking.
class RoutesTracked():
    # Initializes the tracker with the starting set of tracked routes.
    # Input:  routes - frozenset of route ids to track initially.
    # Output: None - stores the initial routes on the instance.

    def __init__(self, routes: frozenset[int]):
        self.routes = routes

    # Returns the transit routes that are currently being tracked.
    # Input:  self - RoutesTracked instance holding the tracked route set.
    # Output: frozenset[int] - the currently tracked route ids.

    def getRoutes(self) -> frozenset[int]:
        return self.routes

    # Removes a single route from the set of tracked routes.
    # Input:  self - RoutesTracked instance holding the tracked route set.
    #        route - transit route id to remove from tracking.
    # Output: None - updates the tracked set (no-op if the route was not tracked).

    def removeRoute(self, route: int) -> None:
        if route in self.routes:
            self.routes = self.routes - frozenset([route])

    # Adds a single route to the set of tracked routes.
    # Input:  self - RoutesTracked instance holding the tracked route set.
    #        route - transit route id to add to tracking.
    # Output: None - updates the tracked set (no-op if the route was already tracked).

    def addRoute(self, route: int) -> None:
        if route not in self.routes:
            self.routes = self.routes | frozenset([route])

    # Replaces the full set of tracked routes.
    # Input:  self - RoutesTracked instance holding the tracked route set.
    #        routes - frozenset of route ids to track from now on.
    # Output: None - updates the tracked set.

    def setRoutes(self, routes: frozenset[int]) -> None:
        self.routes = routes

# Pydantic request schema holding the list of routes that should be tracked.
class RouteListSchema(BaseModel):
    routes: frozenset[int]

# Pydantic request schema holding a single route that should be added or removed.
class RouteSchema(BaseModel):
    route: int