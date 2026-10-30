export const STYLE = "https://tiles.openfreemap.org/styles/liberty";
//https://demotiles.maplibre.org/style.json

export const POLL_MS = 5000;

export const LINE_WIDTH: number = 3;
export const OFFSET_PIXELS: Array<number> = [-6, -2, 2, 6];

export const ICONS = {
  "train_icon": "/icons/train.png",
  "bus_icon": "/icons/bus.png",
};

export const ICON_COLORS: Record<string, string> = {
  "METRO_BLUE_LINE": "#1f77b4",
  "METRO_GREEN_LINE": "#00b012",
  "METRO_GOLD_LINE": "#ada700",
  "METRO_ORANGE_LINE": "#ff6f08",
  "METRO_RED_LINE": "#c01300",
  "DEFAULT": "#ff96ed", // fallback
}