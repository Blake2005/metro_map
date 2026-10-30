import asyncio, sqlite3
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .models import RouteInfo
from .poller import poll_forever
from .store import snapshots
from .config import settings, ROUTES
from .static_loader import load_static_data, load_route_shapes
from .active_routes import RoutesTracked, RouteListSchema, RouteSchema

logging.basicConfig(level=logging.INFO)


# Initializes the SQLite database connection and creates the positions table if it does not exist yet.
# Input:  None - the database location is taken from the app settings (settings.db_path).
# Output: A sqlite cursor on a new connection to the positions database.

def init_db():
    connection = sqlite3.connect(settings.db_path, check_same_thread=False)
    cursor = connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")    # readers don't block the writer
    cursor.execute("PRAGMA synchronous=NORMAL")  # fine with WAL, much faster writes
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, trip_id INTEGER NOT NULL,
            route_id INTEGER NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL,
            speed REAL NOT NULL, location_time INTEGER NOT NULL, UNIQUE (trip_id, location_time)
        );
        CREATE INDEX IF NOT EXISTS idx_positions_ts ON positions (ts); 
        CREATE INDEX IF NOT EXISTS idx_positions_route_overtime ON positions (route_id, location_time); 
    """)
    # idx_positions_ts creates a lookup table (B tree) of positions by time of insertion
    # idx_positions_route_overtime creates a lookup table of positions by route and time of location
    return cursor

# Reports the outcome of the background poller task, logging instead of letting the exception go unhandled.
# Input:  task - the asyncio task that was created for the poller loop.
# Output: None - logs the error when the task was not cancelled and had an exception.

def _report_task_failure(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception():
        logging.getLogger("poller").error(
            "Poller task died", exc_info=task.exception()
        )


# FastAPI lifespan handler that opens the database, loads the static route data, starts the poller task
# and tears the database down again when the application shuts down.
# Input:  app - the FastAPI application instance whose lifespan is being managed.
# Output: async context manager yielding the app state (database connection, tracked routes, route geojson).

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = init_db()
    app.state.routes_tracked = RoutesTracked(settings.routes_tracked)

    await asyncio.to_thread(load_static_data, settings.static_db_path, settings.gtfs_static_url)  # your remotezip extract
    app.state.routes_geojson = await asyncio.to_thread(
        load_route_shapes, settings.static_db_path, app.state.routes_tracked.getRoutes()
    )

    task = asyncio.create_task(poll_forever(app))
    task.add_done_callback(_report_task_failure)
    yield
    task.cancel()
    app.state.db.close()


app = FastAPI(lifespan=lifespan)

# API endpoint that returns the latest vehicle snapshots keyed by route name.
# Input:  None - reads the in-memory snapshots store.
# Output: dict[str, RouteInfo] - current vehicles per route, keyed by route name.

@app.get("/api/trains", response_model=dict[str, RouteInfo])
async def get_vehicles():
    return snapshots

# API endpoint that returns the GeoJSON line shapes of the currently tracked routes.
# Input:  None - reads the route shapes loaded during startup or on tracked route changes.
# Output: dict - GeoJSON FeatureCollection of LineString route shapes.

@app.get("/api/route_shapes")
async def get_route_shapes():
    return app.state.routes_geojson

# API endpoint that returns the transit routes currently being tracked.
# Input:  None - reads the in-memory tracked routes state.
# Output: dict[int, str] - mapping of route id to route display name.

@app.get("/api/tracked_routes")
async def get_tracked_routes():
    routes: frozenset[int] = app.state.routes_tracked.getRoutes() 
    message_data = {}

    for rid in routes:
        name = ROUTES.get(rid, f"Route: {rid}")
        message_data[rid] = name
    
    return message_data

# API endpoint that replaces the set of tracked routes and reloads their line shapes.
# Input:  input - RouteListSchema holding the new set of tracked route ids.
# Output: None - updates the tracked routes and reloads the route shapes.

@app.post("/api/set_tracked_routes")
async def set_tracked_routes(input: RouteListSchema):
    app.state.routes_tracked.setRoutes(input.routes)
    app.state.routes_geojson = await asyncio.to_thread(
        load_route_shapes, settings.static_db_path, app.state.routes_tracked.getRoutes()
    )

# API endpoint that removes a single route from the tracked set and reloads its line shape.
# Input:  input - RouteSchema holding the route id to remove.
# Output: None - updates the tracked routes and reloads the route shapes.

@app.post("/api/remove_tracked_route")
async def remove_tracked_route(input: RouteSchema):
    app.state.routes_tracked.removeRoute(input.route)
    app.state.routes_geojson = await asyncio.to_thread(
        load_route_shapes, settings.static_db_path, app.state.routes_tracked.getRoutes()
    )
    
# API endpoint that adds a single route to the tracked set and reloads its line shape.
# Input:  input - RouteSchema holding the route id to add.
# Output: None - updates the tracked routes and reloads the route shapes.

@app.post("/api/add_tracked_route")
async def add_tracked_route(input: RouteSchema):
    print(input)
    app.state.routes_tracked.addRoute(input.route)
    app.state.routes_geojson = await asyncio.to_thread(
        load_route_shapes, settings.static_db_path, app.state.routes_tracked.getRoutes()
    )