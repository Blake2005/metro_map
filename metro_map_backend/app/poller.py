import asyncio, time
import logging
from datetime import datetime, timezone

import httpx
from google.transit import gtfs_realtime_pb2
from pydantic import ValidationError

from .config import ROUTES, settings
from .models import RouteInfo, Vehicle, Train
from .store import snapshots

log = logging.getLogger("poller")


# Inserts the polled vehicle positions into the SQLite positions table inside a single transaction.
# Input:  cursor - sqlite cursor connected to the positions database.
#        ts - unix timestamp (seconds) of the poll cycle.
#        rid - transit route id the positions belong to.
#        vehicles - list of validated vehicle models to persist (duplicates are ignored).
# Output: None - commits on success and rolls back and re-raises on failure.

def insert_positions_db(cursor: sqlite3.Cursor, ts: int, rid: int, vehicles: list[dict]):
    rows = [
        (ts, v.trip_id, rid, v.latitude, v.longitude, v.speed, v.location_time)
        for v in vehicles
    ]
    try:  # one transaction per poll, commits on exit
        cursor.executemany(
            "INSERT OR IGNORE INTO positions "
            "(ts, trip_id, route_id, latitude, longitude, speed, location_time) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)", rows
        )
        cursor.connection.commit()
    except Exception:
        cursor.connection.rollback()
        raise

# Fetches the vehicle positions for a single route from the Metro Transit API and refreshes the snapshot.
# Input:  client - httpx async client used to perform the GET request.
#        rid - transit route id to fetch positions for.
#        base_url - base URL of the vehicle positions endpoint (e.g. .../nextrip/vehicles/).
# Output: None - updates the in-memory snapshot for the route and returns (rid, vehicles).

async def fetch_route(client: httpx.AsyncClient, rid: int, base_url: str) -> None:
    try:
        url = base_url + str(rid)
        response = await client.get(url)
        response.raise_for_status()
    except (httpx.TimeoutException, httpx.TransportError) as e:
        log.warning("fetch failed for %s, %r", url, e)
    except httpx.HTTPStatusError as e:
        log.warning("bad status %s for %s", e.response.status_code, url)
    except ValueError as e:
        log.warning("bad json for %s", url)


    content = response.json()
    vehicles: list[Vehicle] = []

    for entry in content:
        try:
            vehicles.append(Vehicle(**entry))

        except ValidationError as e:
            log.warning("Skipping bad entry on %s: %s", rid, e)

    name = ROUTES.get(rid, f"Unknown route {rid}")
    now = datetime.now(timezone.utc)

    transit_mode: str = "bus"
    if((rid == 902) or (rid == 901)):
        transit_mode = "train"

    snapshots[name] = RouteInfo(route=name, vehicles=vehicles, transit_mode=transit_mode, updated_at=now)
    return (rid, vehicles)

# Continuously polls all tracked routes on a fixed interval and stores the latest positions.
# Input:  app - FastAPI application holding the tracked routes and the database connection.
# Output: None - runs an infinite loop, sleeping between poll cycles.

async def poll_forever(app: FastAPI) -> None:
    async with httpx.AsyncClient(timeout=settings.request_timeout_secs) as client:
        while True:
            try:
                log.info("Polling cycle starting")
                tasks = []
                for rid in app.state.routes_tracked.getRoutes():
                    tasks.append(fetch_route(client, rid, settings.metro_api_url))
                results = await asyncio.gather(*tasks)

                ts = int(time.time())
                for result in results:
                    await asyncio.to_thread(insert_positions_db, app.state.db, ts, result[0], result[1])

            except Exception:
                log.exception("Unexpected error in poll iteration")

            # response = await client.get(settings.gtfs_url)
            # response.raise_for_status()

            # feed = gtfs_realtime_pb2.FeedMessage()
            # feed.ParseFromString(response.content)
            # print(feed.header)
            # print(feed.entity[0])

            await asyncio.sleep(settings.polling_interval)