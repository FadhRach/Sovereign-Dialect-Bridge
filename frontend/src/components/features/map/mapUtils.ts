import type { MapPoint, UrgencyLevel } from "@/types";
import type L from "leaflet";

export const DEFAULT_INDONESIA_CENTER: [number, number] = [-2.5, 118];
export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const STREET_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const LABEL_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_ATTRIBUTION = "Tiles &copy; Esri";
export const STREET_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const URGENCY_LEVELS: UrgencyLevel[] = ["low", "medium", "high", "critical"];

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getValidCoordinates(point: {
  latitude?: unknown;
  longitude?: unknown;
}): [number, number] | null {
  const latitude = parseCoordinate(point.latitude);
  const longitude = parseCoordinate(point.longitude);

  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

export function normalizeUrgencyLevel(value: unknown): UrgencyLevel {
  return URGENCY_LEVELS.includes(value as UrgencyLevel) ? (value as UrgencyLevel) : "low";
}

export function sanitizeMapPoints(points: readonly MapPoint[] | null | undefined): MapPoint[] {
  if (!Array.isArray(points)) return [];

  return points.reduce<MapPoint[]>((validPoints, point) => {
    if (!point) return validPoints;

    const coordinates = getValidCoordinates(point);
    if (!coordinates) return validPoints;

    validPoints.push({
      ...point,
      latitude: coordinates[0],
      longitude: coordinates[1],
      urgency_level: normalizeUrgencyLevel(point.urgency_level),
    });
    return validPoints;
  }, []);
}

export function buildGoogleMapsUrl(latitude: number, longitude: number, zoom = 17): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&zoom=${zoom}`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function addBaseLayers(map: L.Map, leaflet: typeof L): L.Layer {
  const street = leaflet.tileLayer(STREET_TILE_URL, {
    attribution: STREET_ATTRIBUTION,
    maxZoom: 19,
  });
  const hybrid = leaflet.layerGroup([
    leaflet.tileLayer(SATELLITE_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION,
      maxZoom: 19,
    }),
    leaflet.tileLayer(LABEL_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION,
      maxZoom: 19,
    }),
  ]);

  street.addTo(map);
  leaflet.control.layers(
    {
      "Peta Jalan": street,
      "Satelit + Label Jalan": hybrid,
    },
    undefined,
    { position: "topright", collapsed: true }
  ).addTo(map);

  return street;
}

export function enableComfortableMapInteraction(map: L.Map, options?: { scrollWheelZoom?: boolean }) {
  map.doubleClickZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
  map.touchZoom.enable();

  if (options?.scrollWheelZoom) {
    map.scrollWheelZoom.enable();
  } else {
    map.scrollWheelZoom.disable();
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());
    map.on("mouseover", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());
  }
}
