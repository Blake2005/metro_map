# Metro Map Backend

FastAPI backend that powers the live transit map of Minneapolis–Saint Paul. It periodically polls the
Metro Transit real-time vehicle position API, keeps the latest vehicle positions in a local SQLite
database and serves the current vehicle snapshots, the static route line shapes and the tracked-route
state to the frontend through a small REST API.

## Overview

The backend is a Python package (`app/`) that runs on FastAPI with Uvicorn as the ASGI server. On startup
it initializes the tracked-routes state, downloads and extracts static GTFS data, builds GeoJSON line shapes
for the tracked routes (and loads route metadata), and then starts a background polling task. The poller
periodically fetches vehicle positions for each tracked route, validates them, and updates an in-memory
snapshot store that is served to the frontend via REST endpoints.

> Note: the codebase contains commented-out SQLite persistence helpers (`init_db`/position inserts), but
> vehicle position persistence to SQLite is not currently active; the running behavior uses in-memory
> snapshots.

## Architecture

### Components

- `app/main.py` – The FastAPI application. Contains the lifespan handler (tracked routes, static data/shape
  loading, poller task) and all REST endpoints.
- `app/config.py` – Pydantic settings object (`Settings`) that reads configuration from environment
  variables / a `.env` file, plus the `ROUTES` mapping of known transit route ids to display names.
- `app/models.py` – Pydantic models: `Vehicle` (position of a single vehicle), `Train` (vehicle plus
  direction of travel) and `RouteInfo` (vehicles of one route plus transit mode and update timestamp).
- `app/store.py` – In-memory snapshot store (`snapshots`) keyed by route id (`dict[int, RouteInfo]`).
- `app/poller.py` – The polling loop (`poll_forever`) that fetches positions per tracked route
  (`fetch_route`) and updates the in-memory snapshot store.
- `app/static_loader.py` – Loads static GTFS data from a remote zip (`load_static_data`, extracting
  `trips.txt`, `shapes.txt`, and `routes.txt`), builds GeoJSON route line shapes (`load_route_shapes`), and
  reads route id/name metadata (`get_all_route_ids`).
- `app/active_routes.py` – In-memory tracked-routes registry (`RoutesTracked`) plus the pydantic request
  schemas (`RouteListSchema`, `RouteSchema`) used by the tracked-route endpoints.

### Data flow

1. On application startup (`lifespan`):
   - `RoutesTracked` is initialized with the configured tracked routes.
   - `load_static_data` downloads the GTFS zip from `GTFS_STATIC_URL` and extracts `trips.txt`,
     `shapes.txt`, and `routes.txt` into the static data directory.
   - `load_route_shapes` turns the trips/shapes into a GeoJSON `FeatureCollection` of line shapes for the
     tracked routes.
   - `get_all_route_ids` loads route id → display name mappings from `routes.txt`.
   - The background task created by `poll_forever` starts polling the tracked routes.
2. While running, the poller fetches `GET {metro_api_url}{route_id}` for every tracked route, validates
   the returned vehicle entries into pydantic `Vehicle` models (skipping invalid entries), builds a
   `RouteInfo` (including the transit mode), and stores it in the in-memory snapshot store.
3. When tracked routes are added/removed/set via the API, the backend updates the tracked-routes state,
   reloads route shapes, and (on removal) removes the route’s snapshot entry.
4. The REST endpoints read from the in-memory store / app state and serve the data to the frontend.

### REST API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Returns a simple health/status response. |
| GET | `/api/trains` | Returns the latest vehicle snapshots keyed by route id (`dict[int, RouteInfo]`). |
| GET | `/api/route_shapes` | Returns the GeoJSON FeatureCollection of route line shapes for the tracked routes. |
| GET | `/api/all_routes` | Returns all known route ids mapped to display names (from static GTFS routes data). |
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
5. Make sure the directory for the static GTFS data exists or can be created (configured by
   `STATIC_DB_PATH`, default `/var/lib/trainmap/static_data/gtfs`). `DB_PATH` is still present in settings,
   but SQLite vehicle persistence is not currently active in the running code.

### Configuration

The backend reads its configuration from environment variables / a `.env` file (see `.env.example` for
the required keys and example values):

- `METRO_API_URL` – base url of the Metro Transit vehicle positions API (default:
  `https://svc.metrotransit.org/nextrip/vehicles/`)
- `GTFS_URL` – base url of the GTFS realtime vehicle positions feed
- `GTFS_STATIC_URL` – url of the GTFS zip containing trips and shapes (`https://svc.metrotransit.org/mtgtfs/gtfs.zip`)
- `ROUTES_TRACKED` – list of route ids that are polled and displayed (default: `[901, 902, 903, 904, 905]`)
- `DB_PATH` – configured SQLite file path setting (present in config; vehicle persistence to SQLite is not
  currently active in the running code)
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

### Running with Docker

The backend can also be started through Docker using the compose file at the repository root.

From the repository root run:

```bash
docker compose up --build backend
```

This builds the backend image (see `metro_map_backend/Dockerfile`) and starts the backend container, which runs
uvicorn on `0.0.0.0:8000` with `--reload`.

The API is then available at `http://localhost:8000`.

To start the full stack (backend and frontend) instead, run `docker compose up --build` from the repository root (see
the [root README](../README.md) for the full instructions).

When running through Docker, the backend reads its configuration from environment variables / a `.env` file (see
[Configuration](#configuration)); the `metro_map_backend/` directory is bind-mounted into the container by
`docker-compose.yml`, so an existing `.env` file is picked up automatically.

## Frontend interaction

The backend expects the frontend (see `metro_map_frontend`) to call the `/api/*` endpoints described above;
the backend runs a single poller task that serves all tracked routes at once.
