import { type Ref, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { type FeatureCollection, type GeoJSONSource, Map } from "maplibre-gl";
import { STYLE, POLL_MS, LINE_WIDTH, ICON_COLORS } from "./Constants";
// import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type TrainMapHandle = {
  refreshVehicles: () => Promise<void>;
  reloadRouteShapes: () => Promise<void>;
  removeRoute: (rid: string) => Promise<void>;
};



const baseIcons: Record<string, ImageBitmap | HTMLImageElement> = {};

// Loads the base bus and train icon images into the map image cache.
// Input:  map - MapLibre map instance that loads the images into.
// Output: Promise<void> - resolves once both base icons are loaded.

async function loadBaseIcons(map: Map|null) {
  const [train, bus] = await Promise.all([
    map?.loadImage("/icons/train.png"),
    map?.loadImage("/icons/bus.png"),
  ]);
  if(train != undefined && bus != undefined){
    baseIcons.train = train.data;
    baseIcons.bus = bus.data;
  }
}

// Tints a loaded icon image with the given color using an offscreen canvas.
// Input:  img - icon image (ImageBitmap or HTMLImageElement) to tint.
//        color - color to tint the icon with.
// Output: Promise resolving to the tinted image bitmap.

async function tintImg(img: ImageBitmap | HTMLImageElement, color: string): Promise<ImageBitmap>{
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tintedBitmap = await createImageBitmap(canvas);
  return tintedBitmap;
}

// Generates an icon image consisting of a colored circle behind a tinted vehicle icon.
// Input:  img - base vehicle icon to draw inside the colored circle.
//        color - color of the circle border and icon tint.
//        padding - padding in pixels between the icon and the circle border.
// Output: Promise resolving to the generated icon ImageData.

async function generateIcon(img: ImageBitmap | HTMLImageElement, color: string, padding: number): Promise<ImageData>{;
  const canvas = document.createElement("canvas");

  const width: number = img.width+padding;
  const height: number = img.height+padding;
  const size: number = Math.max(height, width);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draws background circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; // Background color
  ctx.fill();
  ctx.lineWidth = 35;
  ctx.strokeStyle = color; // Border color
  ctx.stroke();

  // tints icon to route color
  const tintedIcon = await tintImg(img, color);
  ctx.drawImage(tintedIcon, padding/2, padding/2);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Convert backend JSON into GeoJSON. Note [lng, lat] order.
// Converts the backend /api/trains response into a GeoJSON FeatureCollection of vehicle position points.
// Input:  data - JSON object keyed by route name, each holding a RouteInfo with its vehicles.
// Output: GeoJSON FeatureCollection of point features for the current vehicle positions.

function toGeoJSON(data: JSON) {
  const features = [];
  for (const [rid, snap] of Object.entries(data)) {
    for (const t of snap.vehicles) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [t.longitude, t.latitude] },
        properties: { mode: snap.transit_mode, route_name: snap.route, rid: rid }, // add direction later
      });
    }
  }
  return { type: "FeatureCollection", features };
}

// MapLibre map component that renders the tracked transit lines and the live vehicle markers.
// Input:  ref - imperative handle used by the parent to refresh or remove routes on state changes.
// Output: JSX - full screen map container element.

export default function TrainMap({ ref }: { ref: Ref<TrainMapHandle> }) {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const trainsDataRef = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const routeLinesDataRef = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });

  // Fetches the current vehicle snapshots and pushes them into the map source.
  // Input:  None - uses the /api/trains endpoint.
  // Output: Promise<void> - resolves once the source data was updated, errors are logged.

  const refreshVehicles = useCallback(async () => {
    try {
      const res = await fetch("/api/trains");
      const data = await res.json();
      const geojson = toGeoJSON(data) as FeatureCollection;
      trainsDataRef.current = geojson;
      mapRef.current?.getSource<GeoJSONSource>("trains")?.setData(geojson);
    } catch (err) {
      console.error("Failed to fetch trains", err);
    }
  }, []);

  // Fetches the GeoJSON route line shapes and pushes them into the map source.
  // Input:  None - uses the /api/route_shapes endpoint.
  // Output: Promise<void> - resolves once the source data was updated, errors are logged.

  const reloadRouteShapes = useCallback(async () => {
    try {
      const res = await fetch("/api/route_shapes");
      const data = (await res.json()) as FeatureCollection;
      routeLinesDataRef.current = data;
      mapRef.current?.getSource<GeoJSONSource>("route-lines")?.setData(data); // data is already formatted
    } catch (err) {
      console.error("Failed to fetch route shapes", err);
    }
  }, []);

  // Removes generated marker images for a route from the map style cache.
  // Input:  rid - route id whose marker images ("rid|mode") should be removed.
  // Output: None - removes matching images when they exist.

  const removeRouteIcons = useCallback((rid: string) => {
    const allImages = mapRef.current?.listImages();
    const markerRegex = new RegExp(`^${rid}\\|`);

    if (allImages != undefined) {
      const matchingImages = allImages.filter((id) => markerRegex.test(id));
      for (const imageName of matchingImages) {
        mapRef.current?.removeImage(imageName);
      }
    }
  }, []);

  // Optimistically removes a route's path and vehicle markers from the map, then refetches backend state.
  // Input:  rid - route id to remove from the rendered sources.
  // Output: Promise<void> - resolves once the map sources have been refreshed.

  const removeRoute = useCallback(async (rid: string) => {
    const ridStr = String(rid);

    const filteredRouteLines = {
      ...routeLinesDataRef.current,
      features: routeLinesDataRef.current.features.filter(
        (feature) => String((feature.properties as Record<string, unknown> | null)?.route_id) !== ridStr
      ),
    } as FeatureCollection;
    
    routeLinesDataRef.current = filteredRouteLines;
    mapRef.current?.getSource<GeoJSONSource>("route-lines")?.setData(filteredRouteLines);

    const filteredTrains = {
      ...trainsDataRef.current,
      features: trainsDataRef.current.features.filter(
        (feature) => String((feature.properties as Record<string, unknown> | null)?.rid) !== ridStr
      ),
    } as FeatureCollection;
    trainsDataRef.current = filteredTrains;
    mapRef.current?.getSource<GeoJSONSource>("trains")?.setData(filteredTrains);

    removeRouteIcons(ridStr);
    await Promise.all([reloadRouteShapes(), refreshVehicles()]);
  }, [refreshVehicles, reloadRouteShapes, removeRouteIcons]);

  useImperativeHandle(ref, () => ({
    refreshVehicles,
    reloadRouteShapes,
    removeRoute,
  }), [refreshVehicles, reloadRouteShapes, removeRoute]);

  // Sets up the map, its sources and layers and starts polling for vehicle positions on mount.
  // Input:  None - runs once when the component mounts.
  // Output: None - returns a cleanup function that clears the interval and removes the map.

  useEffect(() => {
    // guard to check that the containerRef is not null
    // otherwise typescript will flag setting the container
    // to a potential null type
    const container = containerRef.current;
    if(!container) return;

    mapRef.current = new Map({
      container: container,
      style: STYLE,
      center: [-93.20, 44.94], // [lng, lat]: set this to your city
      zoom: 11,
    });
    if(mapRef.current == null) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    // Generates and registers a route colored icon for a vehicle mode and route that is missing from the style.
    // Input:  e - maplibre style imagemissing event holding the icon id ("mode|route").
    // Output: None - adds the generated image to the map when the base icon and color are available.

    mapRef.current?.on("styleimagemissing", async (e) => {
      const [rid, mode] = e.id.split("|");
      const base = baseIcons[mode];
      const color = ICON_COLORS[rid] || ICON_COLORS["DEFAULT"];
      if (!base || !color || mapRef.current?.hasImage(e.id)) return;
      const icon = await generateIcon(base, color, 150);
      mapRef.current?.addImage(e.id, icon);
    });

    // Adds the map sources and layers for the route lines and vehicle icons and starts the initial data loads.
    // Input:  None - uses the map instance and the shared constants.
    // Output: Promise<void> - resolves once the initial loads finished.

    mapRef.current?.on("load", async () => {
      await loadBaseIcons(mapRef.current);

      if (mapRef.current?.getLayer('poi_r1')) {
        mapRef.current?.setLayoutProperty('poi_r1', 'visibility', 'none');
      }

      if (mapRef.current?.getLayer('poi_r7')) {
        mapRef.current?.setLayoutProperty('poi_r7', 'visibility', 'none');
      }

      if (mapRef.current?.getLayer('poi_r20')) {
        mapRef.current?.setLayoutProperty('poi_r20', 'visibility', 'none');
      }

      // const layers = mapRef.current?.getStyle().layers;
      // console.log(layers);

      mapRef.current?.addSource("trains", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      mapRef.current?.addSource("route-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      mapRef.current?.addLayer({
        id: "route-lines",
        type: "line",
        source: "route-lines",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-width": LINE_WIDTH,
          "line-opacity": 1.0,
          "line-offset": [
            "interpolate", ["linear"], ["zoom"],
            10, 3.5,  // 2 pixels at zoom 10
            20, 4  // 8 pixels at zoom 16
          ],
          "line-color": [
            "match", ["get", "route_id"],
            "901", "#0053a0", // swap in your real route_ids and colors
            "902", "#00a651",
            "903", "#c01300",
            "904", "#ff6f08",
            "905", "#ada700",
            "#ff96ed", // fallback
          ],
        },
      });
      mapRef.current?.addLayer({
        id: "trains",
        type: "symbol",
        source: "trains",
        layout: {
          "icon-image": ["concat",
            ["get", "rid"],"|",["get", "mode"]
          ],
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
              10, 0.04,  // 2 pixels at zoom 10
              20, 0.06  // 8 pixels at zoom 160.04,
          ],
          "icon-allow-overlap": true,   // otherwise overlapping icons get hidden
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
        },
        paint: {
          // "icon-opacity": 1.0,
          'icon-halo-color': '#ffffff',    // Background/outline color behind the icon
          'icon-halo-width': 4,              // Thickness of the background halo
          // "icon-color": [
          //   "match", ["get", "route_id"],
          //   "901", "#0053a0", // swap in your real route_ids and colors
          //   "902", "#00a651",
          //   "903", "#c01300",
          //   "904", "#ff6f08",
          //   "905", "#ada700",
          //   "#ff96ed", // fallback
          // ],
        },
      });
      void refreshVehicles();
      timer = setInterval(refreshVehicles, POLL_MS);
      void reloadRouteShapes();
    });

    // Cleans up the polling interval and removes the map when the component unmounts.
    return () => {
      clearInterval(timer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [refreshVehicles, reloadRouteShapes]);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}