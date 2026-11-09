# Metro Map Frontend

React + Vite + MapLibre GL frontend that displays a live map of the transit vehicles in the
Minneapolis–Saint Paul area. The user can follow live vehicle positions on an interactive map, see the
route lines the vehicles run on and add or remove tracked transit routes.

## Overview

The frontend is a single page application built with React, Vite and MapLibre GL. It renders a full
screen interactive map with live vehicle markers, a sidebar with a route add/remove panel and a top
navbar. The map data is served by the FastAPI backend located in `metro_map_backend`.

## Architecture

### Components

- `src/main.jsx` – React entry point that renders the `App` component into the `#root` element.
- `src/App.jsx` – Root component that composes the layout (navbar, map, sidebar) and wires map refresh
  callbacks between the sidebar and `TrainMap` via a ref/imperative handle.
- `src/Navbar.tsx` – Top navigation bar with the app title.
- `src/Sidebar.tsx` – Sidebar that loads the currently tracked routes, renders the add/remove UI, and
  notifies the parent after route add/remove so the map can update.
- `src/RouteInput.tsx` – Form to enter a numeric route id and add it via the backend; invokes a callback on
  successful add.
- `src/RouteList.tsx` – List of tracked routes with a delete button per route; delegates deletion via a
  callback.
- `src/TrainMap.tsx` – MapLibre map component: creates the map, adds GeoJSON sources/layers for route lines
  and vehicle icons, polls `/api/trains` for live vehicle updates, loads/reloads route shapes from
  `/api/route_shapes`, and exposes an imperative handle (`refreshVehicles`, `reloadRouteShapes`,
  `removeRoute`) for parent-triggered updates.
- `src/Constants.tsx` – Shared constants: MapLibre style URL, polling interval, line width, icon offsets,
  icon paths, and per-route icon colors.
- `src/HelperFuncs.tsx` – Small helper functions: `isInteger` (route id validation) and `getRandomColor`.
- `src/assets/style.jsx` – MapLibre GL style object (OpenMapTiles based) used by the map.
- `src/assets/` – Static images / SVG icons used by the map and the app.
- `*.css` – Plain CSS for the layout, navbar, sidebar, and map pane.

### Data flow

1. On mount, `TrainMap` creates a MapLibre map, adds the `trains` GeoJSON source (live vehicle points) and
   the `route-lines` source (route polylines), loads base icons, fetches route shapes, and starts polling.
2. `TrainMap` polls `GET /api/trains` every `POLL_MS` (5 seconds) and pushes the converted GeoJSON feature
   collection into the `trains` source.
3. The sidebar fetches `GET /api/tracked_routes` on mount. `RouteInput` adds routes via
   `POST /api/add_tracked_route`, and `Sidebar` removes routes via `POST /api/remove_tracked_route`.
4. After a successful add, `Sidebar` refreshes the tracked-routes list and triggers a map refresh so route
   shapes/vehicles update immediately. After a successful removal, `Sidebar` refreshes the list and triggers
   `TrainMap.removeRoute(...)` so the route path and vehicle markers are removed immediately (with a backend
   refetch for consistency).

### Map details

- Vehicle markers are rendered as MapLibre symbol icons whose id is built from the mode and route
  (`mode|route`), tinted with the route color from `ICON_COLORS`.
- Route lines are rendered as line layers with rounded joins / caps and an offset that scales with zoom.

## Getting started

### Prerequisites

- Node.js and npm
- The backend (`metro_map_backend`) running and reachable

### Setup

1. `cd metro_map_frontend`
2. Install the dependencies: `npm install`
3. Make sure the backend is running (see `metro_map_backend/README.md`).

### Running

Start the Vite development server:

```bash
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend configured in
`vite.config.js` (currently `http://backend:8000`, which matches the Docker Compose service name; adjust the
proxy target if running the backend elsewhere).

### Running with Docker

From the repository root:

```bash
docker compose up --build
```

This builds and starts the backend and frontend containers defined in the root `docker-compose.yml`. The frontend
dev server is then available at `http://localhost:5173` and proxies `/api` requests to the backend that the backend
container serves at `http://localhost:8000`.

When running through Docker Compose, the `/api` proxy target in `vite.config.js` should point at the backend
service (e.g. `http://backend:8000`) so the frontend container can reach the backend container.

### Build

```bash
npm run build   # production build into dist/
npm run preview # serve the production build
npm run lint    # run oxlint
```

## Notes

- The app talks to the backend exclusively through the `/api/*` REST endpoints and relative URLs, so it
  works against any host serving the backend (the Vite dev server proxies `/api`).
