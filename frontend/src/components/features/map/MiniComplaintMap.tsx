"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint, UrgencyLevel } from "@/types";
import {
  addBaseLayers,
  buildGoogleMapsUrl,
  DEFAULT_INDONESIA_CENTER,
  enableComfortableMapInteraction,
  escapeHtml,
  formatCoordinates,
  normalizeUrgencyLevel,
  sanitizeMapPoints,
} from "./mapUtils";

const URGENCY_HEX: Record<UrgencyLevel, string> = {
  critical: "#E24B4A",
  high: "#EF9F27",
  medium: "#D4A12E",
  low: "#888780",
};

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  critical: "Kritis",
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

interface MiniComplaintMapProps {
  points: MapPoint[];
  height?: string;
}

function buildDotIcon(urgency: UrgencyLevel): L.DivIcon {
  const color = URGENCY_HEX[normalizeUrgencyLevel(urgency)];
  return L.divIcon({
    className: "mini-complaint-dot",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="width:28px;height:28px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 10px 24px rgba(15,23,42,0.34);display:flex;align-items:center;justify-content:center;">
        <span style="width:8px;height:8px;border-radius:999px;background:white;display:block;"></span>
      </div>
    `,
  });
}

function buildPopupHtml(point: MapPoint): string {
  const urgency = normalizeUrgencyLevel(point.urgency_level);
  const color = URGENCY_HEX[urgency];
  return `
    <div style="font-family:system-ui,sans-serif;min-width:210px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="width:10px;height:10px;border-radius:999px;background:${color};display:inline-block;box-shadow:0 0 0 4px ${color}22;"></span>
        <span style="font-size:11px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${URGENCY_LABEL[urgency]}</span>
      </div>
      <p style="font-size:13px;font-weight:800;color:#1E2A4A;margin:0 0 6px 0;line-height:1.35;">${escapeHtml(point.wilayah || "Lokasi aduan")}</p>
      <p style="font-size:11px;color:#64748b;margin:0 0 10px 0;">${escapeHtml(point.category__name || "Kategori belum tersedia")} · ${escapeHtml(point.status)}</p>
      <a href="${buildGoogleMapsUrl(point.latitude, point.longitude)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#EFF6FF;color:#2563EB;font-size:12px;font-weight:800;text-decoration:none;padding:7px 10px;">
        Buka Google Maps
      </a>
    </div>
  `;
}

export default function MiniComplaintMap({ points, height = "220px" }: MiniComplaintMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const validPoints = useMemo(() => sanitizeMapPoints(points), [points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_INDONESIA_CENTER,
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: false,
      wheelPxPerZoomLevel: 90,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    });

    addBaseLayers(map, L);
    enableComfortableMapInteraction(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (validPoints.length === 0) {
      map.setView(DEFAULT_INDONESIA_CENTER, 5, { animate: true });
      return;
    }

    validPoints.forEach((point) => {
      const marker = L.marker([point.latitude, point.longitude], {
        icon: buildDotIcon(point.urgency_level),
      });
      marker.bindTooltip(formatCoordinates(point.latitude, point.longitude), {
        direction: "top",
        opacity: 0.95,
      });
      marker.bindPopup(buildPopupHtml(point));
      layer.addLayer(marker);
    });

    const bounds = L.latLngBounds(validPoints.map((p) => [p.latitude, p.longitude] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: true });
    }
  }, [validPoints]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="relative z-0 isolate overflow-hidden rounded-2xl border border-blue-100 bg-blue-50"
    />
  );
}
