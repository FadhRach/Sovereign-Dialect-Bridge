"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  addBaseLayers,
  buildGoogleMapsUrl,
  enableComfortableMapInteraction,
  formatCoordinates,
  getValidCoordinates,
} from "./mapUtils";

interface LocationPickerMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onSelect: (latitude: number, longitude: number) => void;
  height?: string;
}

const DEFAULT_CENTER: [number, number] = [-6.9175, 107.6191];

function buildPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "location-picker-pin",
    iconSize: [38, 48],
    iconAnchor: [19, 48],
    popupAnchor: [0, -42],
    html: `
      <div style="position:relative;width:38px;height:48px;">
        <div style="position:absolute;top:0;left:0;width:38px;height:38px;background:#2563EB;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 14px 28px rgba(15,23,42,0.38);"></div>
        <div style="position:absolute;top:11px;left:11px;width:16px;height:16px;background:white;border-radius:50%;"></div>
        <div style="position:absolute;bottom:1px;left:13px;width:12px;height:4px;background:rgba(15,23,42,0.30);border-radius:999px;filter:blur(2px);"></div>
      </div>
    `,
  });
}

function buildSelectedPointPopup(latitude: number, longitude: number): string {
  return `
    <div style="font-family:system-ui,sans-serif;min-width:220px;">
      <span style="display:inline-flex;border-radius:999px;background:#EFF6FF;color:#2563EB;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;padding:5px 9px;margin-bottom:8px;">
        Titik Aduan Dipilih
      </span>
      <p style="font-size:13px;font-weight:800;color:#1E2A4A;margin:0 0 6px 0;">${formatCoordinates(latitude, longitude)}</p>
      <p style="font-size:11px;color:#64748b;margin:0 0 10px 0;">Klik titik lain pada peta untuk memperbarui koordinat.</p>
      <a href="${buildGoogleMapsUrl(latitude, longitude)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;border-radius:999px;background:#2563EB;color:white;font-size:12px;font-weight:800;text-decoration:none;padding:8px 11px;">
        Buka Google Maps
      </a>
    </div>
  `;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onSelect,
  height = "280px",
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 90,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    });

    addBaseLayers(map, L);
    enableComfortableMapInteraction(map, { scrollWheelZoom: true });

    map.on("click", (event) => {
      onSelect(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const coordinates = getValidCoordinates({ latitude, longitude });
    if (!coordinates) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const position: [number, number] = coordinates;
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon: buildPinIcon() }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }
    markerRef.current
      .bindTooltip("Titik aduan", { direction: "top", opacity: 0.95 })
      .bindPopup(buildSelectedPointPopup(position[0], position[1]));
    map.setView(position, Math.max(map.getZoom(), 17), { animate: true });
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="relative z-0 isolate overflow-hidden rounded-2xl border border-blue-100 bg-blue-50"
    />
  );
}
