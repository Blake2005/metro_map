import asyncio
import logging
from datetime import datetime, timezone

import httpx
from google.transit import gtfs_realtime_pb2
from pydantic import ValidationError

from .config import ROUTES, settings
from .models import RouteInfo, Vehicle, Train
from .store import snapshots

log = logging.getLogger("poller")


# Fetches the vehicle positions from a GTFS realtime feed using an async generator.
# Input:  client - httpx async client used to perform the GET request.
#        url - url of the GTFS realtime VehiclePosition feed.
# Output: async generator yielding raw vehicle dictionaries parsed from the feed.

async def fetch_vehicles(client: httpx.AsyncClient, url: str):
    response = await client.get(url)
    response.raise_for_status()
    
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content) #bytes not json

    for entity in feed.entity:
        if not entity.HasField("vehicle"):
            continue
        v = entity.vehicle
        yield{
            "trip_id": v.trip.trip_id,
            "route_id": v.trip.route_id,
            "direction_id": v.trip.direction_id,
            "latitude": v.position.latitude,
            "longitude": v.position.longitude,
            "bearing": v.position.bearing if v.position.HasField("bearing") else None,
            "timestamp": v.timestamp,  # Unix seconds
        }


# Collects the validated vehicles of all requested routes and refreshes the in-memory snapshots.
# Input:  client - httpx async client used to perform the GET request.
#        route_ids - list of transit route ids to include in the fetch.
#        url - url of the GTFS realtime VehiclePosition feed.
# Output: None - updates the in-memory snapshots for every known route.

async def fetch_all(client: httpx.AsyncClient, route_ids: list[int], url: str) -> None:
    vehicles_per_route: dict[name, list[Vehicle]] = {name: [] for _, name in ROUTES.items()}
    
    async for v in fetch_vehicles(client, url):
        rid = v["route_id"]
        if(rid not in route_ids or rid is None):
            continue
        try:
            name = ROUTES[rid]
            vehicles_per_routes[name].append(Vehicle(**v))
        except ValidationError as e:
            log.warning("Skipping bad vehicle on %s: %s", rid, e)

    now = datetime.now(timezone.utc)
    for name, vehicles in vehicles_per_route.items():
        snapshots[name] = RouteInfo(route=name, vehicles=vehicles, updated_at=now)

# Continuously polls the GTFS realtime vehicle positions feed on a fixed interval.
# Input:  None - uses the configured client and settings.
# Output: None - runs an infinite loop, sleeping between poll cycles.

async def poll_forever() -> None:
    async with httpx.AsyncClient(timeout=settings.request_timeout_secs) as client:
        while True:
            log.info("Polling cycle starting")
            await fetch_all(client, settings.routes_tracked, settings.gtfs_url)



            # response = await client.get(settings.gtfs_url)
            # response.raise_for_status()

            # feed = gtfs_realtime_pb2.FeedMessage()
            # feed.ParseFromString(response.content)
            # print(feed.header)
            # print(feed.entity[0])

            await asyncio.sleep(settings.polling_interval)