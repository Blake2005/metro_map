# Metro Map Backend

FastAPI backend that powers the live transit map of Minneapolis–Saint Paul. It periodically polls the
Metro Transit real-time vehicle position API, keeps the latest vehicle positions in a local SQLite
database and serves the current vehicle snapshots, the static route line shapes and the tracked-route
state to the frontend through a small REST API.

## Overview

The backend is a Python package (`app/`) that runs on FastAPI with Uvicorn as the ASGI server. On startup
it prepares the SQLite database, downloads and extracts the static GTFS data, builds GeoJSON line shapes
for the tracked routes and then starts a background polling task that runs forever. The polling task
periodically fetches the vehicle positions of every tracked route, validates them and stores them both in
the in-memory snapshot store and in the SQLite database.

## Architecture

### Components

- `app/main.py` – The FastAPI application. Contains the lifespan handler (database init, static data
  load, poller task) and all REST endpoints.
- `app/config.py` – Pydantic settings object (`Settings`) that reads configuration from environment
  variables / a `.env` file, plus the `ROUTES` mapping of known transit route ids to display names.
- `app/models.py` – Pydantic models: `Vehicle` (position of a single vehicle), `Train` (vehicle plus
  direction of travel) and `RouteInfo` (vehicles of one route plus transit mode and update timestamp).
- `app/store.py` – In-memory snapshot store (`snapshots`) keyed by route name.
- `app/poller.py` – The polling loop (`poll_forever`) that fetches positions per tracked route
  (`fetch_route`) and persists them into SQLite (`insert_positions_db`).
- `app/static_loader.py` – Loads the static GTFS data from a remote zip (`load_static_data`) and builds
  the GeoJSON route line shapes (`load_route_shapes`).
- `app/active_routes.py` – In-memory tracked-routes registry (`RoutesTracked`) plus the pydantic request
  schemas (`RouteListSchema`, `RouteSchema`) used by the tracked-route endpoints.

### Data flow

1. On application startup (`lifespan`):
   - `init_db` creates the SQLite `positions` table (WAL journal mode, `synchronous=NORMAL`) with
     indexes for time-based and route/time-based lookups.
   - `RoutesTracked` is initialized with the configured tracked routes.
   - `load_static_data` downloads the GTFS zip from `GTFS_STATIC_URL` and extracts `trips.txt` and
     `shapes.txt`.
   - `load_route_shapes` turns the trips/shapes into a GeoJSON `FeatureCollection` of line shapes.
   - The background task created by `poll_forever` starts polling the tracked routes.
2. While running, the poller fetches `GET {metro_api_url}{route_id}` for every tracked route, validates
   the returned vehicle entries into pydantic `Vehicle` models (skipping invalid entries), builds a
   `RouteInfo` (including the transit mode) and stores it in the snapshot store.
3. Every poll cycle writes the fetched positions into the SQLite `positions` table via a single
   transaction per cycle.
4. The REST endpoints read from the in-memory store / app state and serve the data to the frontend.

### REST API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/trains` | Returns the latest vehicle snapshots keyed by route name. |
| GET | `/api/route_shapes` | Returns the GeoJSON FeatureCollection of route line shapes for the tracked routes. |
| GET | `/api/tracked_routes` | Returns the currently tracked routes as a mapping of route id to route name. |
| POST | `/api/set_tracked_routes` | Replaces the full set of tracked routes. Body: `{"routes": [901, 902, ...]}`. |
| POST | `/api/remove_tracked_route` | Removes a single tracked route. Body: `{"route": 901}`. |
| POST | `/api/add_tracked_route` | Adds a single tracked route. Body: `{"route": 901}`. |

## Getting started

### Prerequisites

- Python 3.12+ (the project currently runs on 3.14 in its virtual environment)
- The Metro Transit API and GTFS feeds must be reachable from the machine running the backend

### Setup

1. `cd metro_map_backend`
2. Create and activate a virtual environment, e.g. `python -m venv .venv` and activate it
   (`source .venv/bin/activate` on Linux / macOS, `source .venv/Scripts/activate` on Windows).
3. Install the Python dependencies: `pip install -r requirements.txt`
4. Copy the example environment file to `.env` and adjust it if needed: `cp .env.example .env`.
5. Make sure the directories for the SQLite database and the static GTFS data exist or can be created
   (the configured paths are `/var/lib/trainmap/vehicles.db` and `/var/lib/trainmap/static_data/gtfs`).

### Configuration

The backend reads its configuration from environment variables / a `.env` file (see `.env.example` for
the required keys and example values):

- `METRO_API_URL` – base url of the Metro Transit vehicle positions API (default:
  `https://svc.metrotransit.org/nextrip/vehicles/`)
- `GTFS_URL` – base url of the GTFS realtime vehicle positions feed
- `GTFS_STATIC_URL` – url of the GTFS zip containing trips and shapes (`https://svc.metrotransit.org/mtgtfs/gtfs.zip`)
- `ROUTES_TRACKED` – list of route ids that are polled and displayed (default: `[901, 902, 903, 904, 905]`)
- `DB_PATH` – sqlite file path for the vehicle positions (default: `/var/lib/trainmap/vehicles.db`)
- `STATIC_DB_PATH` – folder the extracted GTFS files land in (default: `/var/lib/trainmap/static_data/gtfs`)
- `POLLING_INTERVAL` – seconds between poll cycles (default: `10.0`)
- `REQUEST_TIMEOUT_SECS` – timeout for outbound API requests in seconds (default: `8.0`)

### Running

From the `metro_map_backend` directory run:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API is then available at `http://localhost:8000`. With `--reload` Uvicorn will restart the server
when the code changes.

## Frontend interaction

The backend expects the frontend (see `metro_map_frontend`) to call the `/api/*` endpoints described above;
the backend runs a single poller task that serves all tracked routes at once.
