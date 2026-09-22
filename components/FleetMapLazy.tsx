"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { FleetVehicleRow } from "@/lib/fleet";

const FleetMapInner = dynamic(() => import("@/components/FleetMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 space-x-2">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Caricamento mappa...</span>
    </div>
  ),
});

export default function FleetMapLazy({
  vehicles,
  onSelect,
}: {
  vehicles: FleetVehicleRow[];
  onSelect?: (vehicleId: string) => void;
}) {
  return <FleetMapInner vehicles={vehicles} onSelect={onSelect} />;
}