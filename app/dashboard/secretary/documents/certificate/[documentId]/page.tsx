import { getDocument } from "@/lib/actions/documents";
import { getSchoolSettings } from "@/lib/actions/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const [doc, settings] = await Promise.all([getDocument(documentId), getSchoolSettings()]);
  if (!doc) notFound();

  const isAttestation = doc.doc_type === "attestation";

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 flex justify-center">
      <div className="w-[720px] bg-white shadow-lg print:shadow-none border-[6px] border-double border-kpa-gold p-10 text-center relative">
        <div className="absolute inset-3 border border-kpa-navy/20 pointer-events-none" />

        <p className="text-kpa-gold font-bold text-2xl tracking-wide">{settings.school_name}</p>
        <p className="text-xs text-gray-400 mt-1">{settings.address ?? "Douala, PK17 — Cameroon"}</p>

        <p className="mt-8 text-sm text-gray-500 uppercase tracking-widest">
          {isAttestation ? "Attestation de Scolarité / School Attestation" : "Certificate of Achievement"}
        </p>

        <p className="mt-8 text-gray-600 text-sm">This is to certify that</p>
        <p className="text-3xl font-bold text-kpa-navy my-4" style={{ fontFamily: "Georgia, serif" }}>
          {doc.student?.full_name}
        </p>
        <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
          {isAttestation
            ? `is a duly enrolled student of ${doc.student?.class?.name ?? "Kingdom Passion Academy"} for the ${doc.academic_year} academic year, in good standing.`
            : `has been recognized on the occasion of ${doc.term ?? "the school year"} for outstanding achievement and conduct.`}
        </p>

        <div className="grid grid-cols-2 gap-16 mt-16 text-xs text-gray-400">
          <div>
            <div className="h-10 border-b border-gray-300 mb-1" />
            Date
          </div>
          <div>
            <div className="h-10 border-b border-gray-300 mb-1" />
            Director's Signature &amp; Stamp
          </div>
        </div>
      </div>

      <div className="print:hidden fixed bottom-6 right-6">
        <PrintButton />
      </div>
    </div>
  );
}
