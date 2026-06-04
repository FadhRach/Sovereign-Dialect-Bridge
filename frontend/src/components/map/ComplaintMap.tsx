"use client";

// PENTING: komponen ini harus di-import dengan dynamic() + ssr: false
// Contoh penggunaan di page.tsx:
//   const ComplaintMap = dynamic(() => import("@/components/map/ComplaintMap"), { ssr: false });

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { MapPoint } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface ComplaintMapProps {
  points: MapPoint[];
}

// TODO: tambah marker clustering dan warna marker berdasarkan urgency
export default function ComplaintMap({ points }: ComplaintMapProps) {
  return (
    <MapContainer
      center={[-2.5, 118]}
      zoom={5}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {points.map((point) => (
        <Marker key={point.id} position={[point.latitude, point.longitude]}>
          <Popup>
            <strong>{point.wilayah}</strong><br />
            {point.category__name} · {point.urgency_level}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
