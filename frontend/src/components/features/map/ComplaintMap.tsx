"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { MapPoint, UrgencyLevel } from "@/types";

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
  const color = URGENCY_HEX[urgency];
  const html = `
    <div style="position:relative;width:30px;height:38px;">
      <div style="position:absolute;top:0;left:0;width:30px;height:30px;background:${color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>
      <div style="position:absolute;top:9px;left:9px;width:12px;height:12px;background:white;border-radius:50%;"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "complaint-marker",
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

interface Props {
  points: MapPoint[];
  height?: string;
}

export default function ComplaintMap({ points, height = "calc(100vh - 200px)" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-2.5, 118],
      zoom: 5,
      zoomControl: true,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

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
          html: `<div style="width:${size}px;height:${size}px;background:${bg};color:white;font-weight:700;font-size:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(37,99,235,0.4);">${count}</div>`,
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

    points.forEach((p) => {
      const urgency = (p.urgency_level as UrgencyLevel) || "low";
      const marker = L.marker([p.latitude, p.longitude], {
        icon: buildMarkerIcon(urgency),
        zIndexOffset: urgency === "critical" ? 1000 : urgency === "high" ? 500 : 0,
      });
      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:200px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${URGENCY_HEX[urgency]};"></span>
            <span style="font-size:11px;font-weight:700;color:#1E2A4A;text-transform:uppercase;letter-spacing:0.5px;">${URGENCY_LABEL[urgency]}</span>
          </div>
          <p style="font-weight:600;color:#1E2A4A;font-size:13px;margin:0 0 4px 0;">${escapeHtml(p.wilayah || "Tanpa wilayah")}</p>
          <p style="color:#6b7280;font-size:11px;margin:0 0 8px 0;">
            ${escapeHtml(p.category__name || "Kategori belum diklasifikasi")} · ${STATUS_LABEL[p.status] || p.status}
          </p>
          <a href="/complaint/${p.id}" style="display:inline-block;font-size:12px;font-weight:600;color:#2563EB;text-decoration:none;">
            Lihat Detail →
          </a>
        </div>
      `;
      marker.bindPopup(popupHtml);
      cluster.addLayer(marker);
    });

    if (points.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
      }
    }
  }, [points]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden" />;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
