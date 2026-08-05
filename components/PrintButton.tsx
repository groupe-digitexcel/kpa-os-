"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90"
    >
      Print Receipt / Imprimer
    </button>
  );
}
