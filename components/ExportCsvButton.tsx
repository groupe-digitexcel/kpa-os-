"use client";

import { useState, useTransition } from "react";
import BilingualText from "@/components/BilingualText";

export default function ExportCsvButton({ label, fetchCsv, filename }: { label: string; fetchCsv: () => Promise<string>; filename: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const csv = await fetchCsv();
      if (!csv) {
        setError("No data to export.");
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <button onClick={handleClick} disabled={isPending} className="text-xs bg-white border border-gray-300 text-kpa-navy font-semibold px-3 py-1.5 rounded-lg hover:bg-kpa-cream disabled:opacity-50">
        {isPending ? <BilingualText fr="Exportation..." en="Exporting..." /> : label === "Export CSV" ? <BilingualText fr="Exporter CSV" en="Export CSV" /> : label}
      </button>
      {error && <p className="text-xs text-red-500 mt-1"><BilingualText fr="Aucune donnée à exporter." en="No data to export." /></p>}
    </div>
  );
}
