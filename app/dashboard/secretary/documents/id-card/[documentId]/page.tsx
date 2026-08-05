import { getDocument } from "@/lib/actions/documents";
import { getSchoolSettings } from "@/lib/actions/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export default async function IdCardPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const [doc, settings] = await Promise.all([getDocument(documentId), getSchoolSettings()]);
  if (!doc) notFound();

  const student = doc.student;

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 flex flex-col items-center gap-4">
      {/* Card — 85.6mm x 54mm ratio (standard ID card), scaled up for screen */}
      <div className="w-[340px] h-[214px] bg-white rounded-2xl shadow-lg print:shadow-none overflow-hidden border border-gray-200 relative">
        <div className="bg-kpa-navy text-white px-4 py-2 flex items-center justify-between">
          <div>
            <p className="font-bold text-kpa-gold text-xs leading-tight">{settings.school_name.split(" ").slice(0, 2).join(" ")}</p>
            <p className="text-[10px] text-white/70 leading-tight">{settings.address ?? "PK17 Douala"}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-kpa-gold text-[10px] font-bold">
            KPA
          </div>
        </div>

        <div className="p-4 flex gap-4">
          <div className="w-16 h-20 bg-kpa-cream rounded-lg flex items-center justify-center text-[10px] text-gray-400 text-center border border-gray-200 overflow-hidden">
            {student?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              "Photo"
            )}
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-kpa-navy text-sm leading-tight">{student?.full_name}</p>
            <p className="text-gray-500 mt-1">{student?.class?.name}</p>
            <p className="text-gray-400 text-[10px] mt-1">
              {student?.age} yrs · {student?.sex}
            </p>
            <p className="text-gray-400 text-[10px] mt-2">2026 – 2027</p>
          </div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${student?.qr_code}`}
            alt="QR code"
            className="w-14 h-14"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-kpa-gold" />
      </div>

      <div className="print:hidden w-[340px]">
        <PrintButton />
      </div>
    </div>
  );
}
