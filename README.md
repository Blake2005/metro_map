# Metro Map

Live transit map for the Minneapolis–Saint Paul area. The app tracks real-time Metro Transit bus/train
vehicle positions, plots them on an interactive map, and lets users follow along with the transit lines
they're interested in.

## Overview

The web app consists of two parts:

- **`metro_map_backend/`** – FastAPI backend that periodically polls the Metro Transit real-time vehicle
  position API, stores the latest positions in SQLite and serves vehicle snapshots plus static route line
  shapes over a small REST API.
- **`metro_map_frontend/`** – React + Vite + MapLibre GL single-page app that renders the live map, the
  vehicle markers and the tracked route lines, and lets users add or remove tracked routes.

## Architecture

1. The backend polls the Metro Transit vehicle positions API for the configured tracked routes
   (`901`–`905`, the Blue/Green/Red/Orange/Gold lines) every few seconds.
2. Vehicle positions are kept in an in-memory snapshot store and persisted to a local SQLite database; the
   static GTFS route line shapes are loaded at startup and refreshed when tracked routes change.
3. The frontend polls the backend for updates, renders vehicle icons and route lines on a MapLibre map, and
   manages the tracked-route set via REST calls.

### REST API (backend)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/trains` | Latest vehicle snapshots keyed by route name. |
| GET | `/api/route_shapes` | GeoJSON FeatureCollection of route line shapes. |
| GET | `/api/tracked_routes` | Currently tracked routes (route id → name). |
| POST | `/api/set_tracked_routes` | Replace the tracked route set. Body: `{"routes": [901, 902, ...]}`. |
| POST | `/api/add_tracked_route` | Add a route. Body: `{"route": 901}`. |
| POST | `/api/remove_tracked_route` | Remove a route. Body: `{"route": 901}`. |

## Getting started

The app can be started in one of two ways: with Docker, using the compose file at the repository root, or locally
without Docker.

### Start the app with Docker

Prerequisites: [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

From the repository root:

```bash
docker compose up --build
```

This builds the backend and frontend images and starts the services defined in [`docker-compose.yml`](docker-compose.yml):

- Backend API: `http://localhost:8000`
- Frontend: `http://localhost:5173`

Once the containers are running, open `http://localhost:5173` in the browser to use the app.

To run the stack in the background:

```bash
docker compose up --build -d
docker compose down
```

The compose setup runs the services in development mode: the backend source directory is bind-mounted into the backend
container and uvicorn is started with `--reload`, and the frontend source directory is bind-mounted into the frontend
container (via an anonymous volume that keeps the image's `node_modules`) with the Vite dev server running hot module
reload.

To run only one of the services, use the service name as the compose target, e.g. `docker compose up --build backend`
or `docker compose up --build frontend` (see the backend / frontend READMEs for details).

### Backend

```bash
cd metro_map_backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API is then available at `http://localhost:8000`.

### Frontend

```bash
cd metro_map_frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend (by default at
`http://100.87.56.104:8000`).

## More info

- Backend details: [`metro_map_backend/README.md`](metro_map_backend/README.md)
- Frontend details: [`metro_map_frontend/README.md`](metro_map_frontend/README.md)
