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
- `src/App.jsx` – Root component that composes the layout: navbar on top, map on the left, sidebar on
  the right.
- `src/Navbar.tsx` – Top navigation bar with the app title and placeholder links / button.
- `src/Sidebar.tsx` – Sidebar that loads the currently tracked routes and renders the route add/remove UI.
- `src/RouteInput.tsx` – Form to enter a numeric route id and add it via the backend.
- `src/RouteList.tsx` – List of tracked routes with a delete button per route.
- `src/TrainMap.tsx` – MapLibre map component: creates the map, adds the GeoJSON sources / layers for
  route lines and vehicle icons, converts backend data into GeoJSON and polls the backend for updates.
- `src/Constants.tsx` – Shared constants: MapLibre style url, polling interval, line width, icon offsets,
  icon paths and per-route icon colors.
- `src/HelperFuncs.tsx` – Small helper functions: `isInteger` (route id validation) and `getRandomColor`.
- `src/assets/style.jsx` – MapLibre GL style object (OpenMapTiles based) used by the map.
- `src/assets/` – Static images / svg icons used by the map and the app.
- `*.css` – Plain CSS for the layout, navbar, sidebar and map pane.

### Data flow

1. On mount, `TrainMap` creates a MapLibre map, adds the `trains` GeoJSON source (live vehicle points) and
   the `route-lines` source (route polylines), then loads base icons and fetches the route shapes.
2. `TrainMap` polls `GET /api/trains` every `POLL_MS` (5 seconds) and pushes the converted GeoJSON feature
   collection into the `trains` source.
3. The sidebar fetches `GET /api/tracked_routes` on mount, and `RouteInput` / `RouteList` add or remove
   routes by calling the backend endpoints `POST /api/add_tracked_route` and
   `POST /api/remove_tracked_route`.
4. After a successful add, `RouteInput` notifies the sidebar through the `onRouteInput` callback so the
   tracked routes list refreshes.

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
`vite.config.js` (default backend address `http://100.87.56.104:8000`).

### Build

```bash
npm run build   # production build into dist/
npm run preview # serve the production build
npm run lint    # run oxlint
```

## Notes

- The app talks to the backend exclusively through the `/api/*` REST endpoints and relative URLs, so it
  works against any host serving the backend (the Vite dev server proxies `/api`).
