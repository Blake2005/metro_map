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
  "901": "#1f77b4",
  "902": "#00b012",
  "905": "#ada700",
  "904": "#ff6f08",
  "903": "#c01300",
  "DEFAULT": "#ff96ed", // fallback
}