"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
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
  medium: "#639922",
  low: "#888780",
};

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  critical: "Kritis",
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  in_review: "Ditinjau",
  in_progress: "Diproses",
  resolved: "Selesai",
  rejected: "Ditolak",
};

function buildMarkerIcon(urgency: UrgencyLevel): L.DivIcon {
  const color = URGENCY_HEX[normalizeUrgencyLevel(urgency)];
  const html = `
    <div style="position:relative;width:34px;height:44px;">
      <div style="position:absolute;top:0;left:0;width:34px;height:34px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 12px 28px rgba(15,23,42,0.36);"></div>
      <div style="position:absolute;top:10px;left:10px;width:14px;height:14px;background:white;border-radius:50%;"></div>
      <div style="position:absolute;bottom:1px;left:12px;width:10px;height:4px;background:rgba(15,23,42,0.28);border-radius:999px;filter:blur(2px);"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "complaint-marker",
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

function buildPopupHtml(point: MapPoint, urgency: UrgencyLevel): string {
  const color = URGENCY_HEX[urgency];
  return `
    <div style="font-family:system-ui,sans-serif;min-width:230px;max-width:270px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <span style="display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:${color}14;color:${color};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;padding:5px 9px;">
          <span style="width:8px;height:8px;border-radius:999px;background:${color};display:inline-block;"></span>
          ${URGENCY_LABEL[urgency]}
        </span>
        <span style="font-size:11px;color:#64748b;font-weight:700;">#${point.id}</span>
      </div>
      <p style="font-weight:800;color:#1E2A4A;font-size:14px;line-height:1.35;margin:0 0 7px 0;">${escapeHtml(point.wilayah || "Tanpa wilayah")}</p>
      <p style="color:#64748b;font-size:12px;line-height:1.4;margin:0 0 10px 0;">
        ${escapeHtml(point.category__name || "Kategori belum diklasifikasi")} · ${STATUS_LABEL[point.status] || escapeHtml(point.status)}
      </p>
      <p style="color:#94a3b8;font-size:11px;margin:0 0 12px 0;">${formatCoordinates(point.latitude, point.longitude)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="/complaint/${point.id}" style="display:inline-flex;border-radius:999px;background:#2563EB;color:white;font-size:12px;font-weight:800;text-decoration:none;padding:8px 11px;">
          Lihat Detail
        </a>
        <a href="${buildGoogleMapsUrl(point.latitude, point.longitude)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;border-radius:999px;background:#EFF6FF;color:#2563EB;font-size:12px;font-weight:800;text-decoration:none;padding:8px 11px;">
          Google Maps
        </a>
      </div>
    </div>
  `;
}

interface Props {
  points: MapPoint[];
  height?: string;
}

export default function ComplaintMap({ points, height = "calc(100vh - 200px)" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const validPoints = useMemo(() => sanitizeMapPoints(points), [points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_INDONESIA_CENTER,
      zoom: 5,
      zoomControl: true,
      preferCanvas: true,
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 90,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    });

    addBaseLayers(map, L);
    enableComfortableMapInteraction(map, { scrollWheelZoom: true });

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        let size = 36;
        let bg = "#2563EB";
        if (count >= 50) { size = 52; bg = "#1D4ED8"; }
        else if (count >= 10) { size = 44; bg = "#3B82F6"; }
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${bg};color:white;font-weight:900;font-size:13px;border-radius:18px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 12px 30px rgba(15,23,42,0.35);">${count}</div>`,
          className: "complaint-cluster",
          iconSize: [size, size],
        });
      },
    });

    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    if (validPoints.length === 0) {
      mapRef.current?.setView(DEFAULT_INDONESIA_CENTER, 5, { animate: true });
      return;
    }

    validPoints.forEach((p) => {
      const urgency = normalizeUrgencyLevel(p.urgency_level);
      const marker = L.marker([p.latitude, p.longitude], {
        icon: buildMarkerIcon(urgency),
        zIndexOffset: urgency === "critical" ? 1000 : urgency === "high" ? 500 : 0,
      });
      marker.bindTooltip(`${URGENCY_LABEL[urgency]} · ${p.wilayah || "Aduan"}`, {
        direction: "top",
        opacity: 0.95,
      });
      marker.bindPopup(buildPopupHtml(p, urgency));
      cluster.addLayer(marker);
    });

    if (mapRef.current) {
      const bounds = L.latLngBounds(validPoints.map((p) => [p.latitude, p.longitude] as [number, number]));
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
      }
    }
  }, [validPoints]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="relative z-0 isolate overflow-hidden rounded-2xl bg-blue-50"
    />
  );
}
