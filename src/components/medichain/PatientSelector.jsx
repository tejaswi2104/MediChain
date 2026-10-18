import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "medichain_selected_patient";

export const getSelectedPatient = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(KEY) || "" : "";

export const setSelectedPatient = (id) => window.localStorage.setItem(KEY, id);

export default function PatientSelector({ onChange }) {
  const [value, setValue] = useState(getSelectedPatient());

  const commit = (v) => {
    const id = String(v || "").trim().toUpperCase();
    setValue(id);
    setSelectedPatient(id);
    if (onChange) onChange(id);
  };

  return (
    <div className="mc-card">
      <p className="text-sm font-semibold mb-2">Select patient (ABHA ID)</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(value);
          }}
          placeholder="ABHA-123"
          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <Button onClick={() => commit(value)}>Load</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => commit("ABHA-123")}>
          Use ABHA-123 · emergency case
        </Button>
        <Button size="sm" variant="outline" onClick={() => commit("ABHA-456")}>
          Use ABHA-456 · routine case
        </Button>
      </div>
    </div>
  );
}