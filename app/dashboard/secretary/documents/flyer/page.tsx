import PrintButton from "@/components/PrintButton";
import { getSchoolSettings } from "@/lib/actions/settings";

export default async function FlyerPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string; copy?: string }>;
}) {
  const [{ occasion, copy }, settings] = await Promise.all([searchParams, getSchoolSettings()]);

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 flex flex-col items-center gap-4">
      <div className="w-[420px] bg-kpa-navy text-white rounded-2xl shadow-lg print:shadow-none overflow-hidden">
        <div className="p-8 text-center border-b-4 border-kpa-gold">
          <p className="font-bold text-kpa-gold text-2xl">{settings.school_name}</p>
          <p className="text-xs text-white/60 mt-1">{settings.address ?? "Douala, PK17 — Cameroon"}</p>
        </div>

        <div className="p-8">
          {occasion && (
            <p className="text-kpa-gold font-bold text-lg mb-4 text-center">{occasion}</p>
          )}
          <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line text-center">
            {copy || "No copy provided."}
          </p>
        </div>

        <div className="p-6 bg-kpa-gold/10 text-center text-xs text-white/70">
          Nursery + Primary · Anglophone &amp; Francophone · Contact the school office
        </div>
      </div>

      <div className="print:hidden w-[420px]">
        <PrintButton />
      </div>
    </div>
  );
}
