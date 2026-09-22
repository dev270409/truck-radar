"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FleetVehicleRow as FleetVehicle } from "@/lib/fleet";

interface FleetMapProps {
  vehicles: FleetVehicle[];
  onSelect?: (vehicleId: string) => void;
}

interface TrackPoint {
  lat: number;
  lng: number;
  posizione: string | null;
  createdAt: string;
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
  const playLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trackRef = useRef<TrackPoint[]>([]);
  const [fitted, setFitted] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingError, setPlayingError] = useState("");

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
    playLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      playLayerRef.current = null;
      markerRef.current = null;
      setFitted(false);
    };
  }, []);

  async function handleReplay(vehicleId: string) {
    setPlayingError("");
    if (playingId === vehicleId) {
      clearReplay();
      return;
    }
    try {
      const res = await fetch(`/api/fleet/track?vehicleId=${vehicleId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento del tracciato");
      const pts: TrackPoint[] = data.track?.points ?? [];
      if (pts.length < 2) {
        setPlayingError("Percorso non disponibile: servono almeno 2 punti di tracking.");
        setPlayingId(null);
        return;
      }
      trackRef.current = pts;
      setPlayingId(vehicleId);
      animateTrack();
    } catch (err) {
      setPlayingError(err instanceof Error ? err.message : String(err));
      setPlayingId(null);
    }
  }

  function clearReplay() {
    const play = playLayerRef.current;
    if (play) play.clearLayers();
    markerRef.current = null;
    setPlayingId(null);
  }

  function animateTrack() {
    const map = mapRef.current;
    const play = playLayerRef.current;
    const pts = trackRef.current;
    if (!map || !play || pts.length < 2) return;

    play.clearLayers();
    const latlngs = pts.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(latlngs, { color: "#f59e0b", weight: 4, opacity: 0.9 }).addTo(play);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#f59e0b;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.6)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const marker = L.marker(latlngs[0], { icon }).addTo(play);
    markerRef.current = marker;
    marker.bindPopup(`<div class="text-xs"><strong>Riproduzione percorso</strong><br/>${pts[0]?.posizione ?? ""}</div>`);
    map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });

    let i = 1;
    const step = () => {
      if (i >= pts.length) {
        marker.closePopup();
        return;
      }
      const p = pts[i];
      marker.setLatLng([p.lat, p.lng]);
      marker.setPopupContent(`<div class="text-xs"><strong>${p.posizione ?? "Posizione"}</strong><br/>${new Date(p.createdAt).toLocaleString("it-IT")}</div>`);
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 11));
      i += 1;
      setTimeout(step, 1200);
    };
    step();
  }

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
        `<div style="min-width:190px">
          <strong>${v.targa}</strong>
          <div class="text-xs">${v.categoria} · ${STATUS_LABEL[v.status] ?? v.status}</div>
          ${v.driverNome ? `<div class="text-xs">Autista: ${v.driverNome} ${v.driverCognome ?? ""}</div>` : ""}
          ${v.luogoRitiro ? `<div class="text-xs">Da: ${v.luogoRitiro}</div>` : ""}
          ${v.luogoConsegna ? `<div class="text-xs">A: ${v.luogoConsegna}</div>` : ""}
          ${v.posizione ? `<div class="text-xs">Ultimo ping: ${v.posizione}</div>` : ""}
          <button data-replay-vehicle="${v.id}" style="margin-top:8px;background:#f59e0b;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">▶ Riproduci percorso</button>
        </div>`
      );

      const marker = L.marker([v.lat!, v.lng!], { icon }).addTo(layer);
      marker.bindPopup(popup);
      marker.on("click", () => {
        onSelect?.(v.id);
        const content = popup.getElement();
        const btn = content?.querySelector<HTMLButtonElement>("[data-replay-vehicle]");
        if (btn) btn.onclick = () => handleReplay(v.id);
      });
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
      {(playingId !== null || playingError) && (
        <div className="absolute top-2 left-2 z-[500] bg-slate-900/95 border border-amber-700 rounded-xl px-3 py-2 text-xs text-slate-200 shadow-xl">
          {playingError ? (
            <div className="flex items-center space-x-2 text-red-300">
              <span>{playingError}</span>
              <button onClick={clearReplay} className="text-slate-300 underline">chiudi</button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Riproduzione percorso in corso...</span>
              <button onClick={clearReplay} className="text-slate-300 underline">ferma</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function withPosCount(vehicles: FleetVehicle[]): number {
  return vehicles.filter((v) => v.lat != null && v.lng != null).length;
}

export { STATUS_LABEL as FleetStatusLabel, STATUS_COLOR as FleetStatusColor };