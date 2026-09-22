"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FleetVehicleRow as FleetVehicle } from "@/lib/fleet";

interface FleetMapProps {
  vehicles: FleetVehicle[];
  onSelect?: (vehicleId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  DISPONIBILE: "Disponibile",
  IN_VIAGGIO: "In viaggio",
  IN_MANUTENZIONE: "In manutenzione",
  NON_IDONEO: "Non idoneo",
};

const STATUS_COLOR: Record<string, string> = {
  DISPONIBILE: "#22c55e",
  IN_VIAGGIO: "#3b82f6",
  IN_MANUTENZIONE: "#f59e0b",
  NON_IDONEO: "#ef4444",
};

export default function FleetMap({ vehicles, onSelect }: FleetMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [fitted, setFitted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    map.setView([41.9028, 12.4964], 6); // Italia
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      setFitted(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const withPos = vehicles.filter((v) => v.lat != null && v.lng != null);

    withPos.forEach((v) => {
      const color = STATUS_COLOR[v.status] ?? "#94a3b8";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:pointer"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const popup = L.popup({ autoClose: false, closeButton: true }).setContent(
        `<div style="min-width:180px">
          <strong>${v.targa}</strong>
          <div class="text-xs">${v.categoria} · ${STATUS_LABEL[v.status] ?? v.status}</div>
          ${v.driverNome ? `<div class="text-xs">Autista: ${v.driverNome} ${v.driverCognome ?? ""}</div>` : ""}
          ${v.luogoRitiro ? `<div class="text-xs">Da: ${v.luogoRitiro}</div>` : ""}
          ${v.luogoConsegna ? `<div class="text-xs">A: ${v.luogoConsegna}</div>` : ""}
          ${v.posizione ? `<div class="text-xs">Ultimo ping: ${v.posizione}</div>` : ""}
        </div>`
      );

      const marker = L.marker([v.lat!, v.lng!], { icon }).addTo(layer);
      marker.bindPopup(popup);
      marker.on("click", () => onSelect?.(v.id));
    });

    if (withPos.length > 0 && !fitted) {
      const bounds = L.latLngBounds(withPos.map((v) => [v.lat!, v.lng!] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      setFitted(true);
    }
  }, [vehicles, fitted, onSelect]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[420px] w-full rounded-xl border border-slate-800 bg-slate-900 z-0" />
      <div className="absolute top-2 right-2 z-[500] bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-300 pointer-events-none">
        {withPosCount(vehicles)}/{vehicles.length} mezzi con posizione
      </div>
    </div>
  );
}

function withPosCount(vehicles: FleetVehicle[]): number {
  return vehicles.filter((v) => v.lat != null && v.lng != null).length;
}

export { STATUS_LABEL as FleetStatusLabel, STATUS_COLOR as FleetStatusColor };