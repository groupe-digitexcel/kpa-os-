import { getPaymentByReceipt } from "@/lib/actions/payments";
import { getSchoolSettings } from "@/lib/actions/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

const TYPE_LABELS: Record<string, string> = {
  school_fee: "School Fee / Frais de Scolarité",
  exam_fee: "Exam Fee / Frais d'Examen",
  xmas_party: "Xmas Party / Fête de Noël",
  end_of_year_party: "End of Year Party",
  uniform: "Uniform / Uniforme",
  sportswear: "Sportswear",
  other: "Other / Autre",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;
  const [payment, settings] = await Promise.all([getPaymentByReceipt(receiptId), getSchoolSettings()]);

  if (!payment) notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      <div className="max-w-md mx-auto bg-white shadow-lg print:shadow-none rounded-xl overflow-hidden border-t-4 border-kpa-gold">
        <div className="bg-kpa-navy text-white p-6 text-center">
          <p className="font-bold text-kpa-gold text-lg">{settings.school_name}</p>
          <p className="text-xs text-white/70">{settings.address ?? "Douala, PK17 — Cameroon"}</p>
          <p className="text-xs text-white/70 mt-1">OFFICIAL RECEIPT / REÇU OFFICIEL</p>
        </div>

        <div className="p-6 text-sm">
          <div className="flex justify-between mb-4 text-gray-500">
            <span>{payment.receipt_number}</span>
            <span>{new Date(payment.paid_at).toLocaleString("fr-FR")}</span>
          </div>

          <Row label="Student / Élève" value={payment.student?.full_name} />
          <Row label="Class / Classe" value={payment.student?.class?.name ?? "—"} />
          <Row label="Payment For / Motif" value={TYPE_LABELS[payment.payment_type]} />
          <Row label="Method / Mode" value={payment.method.replace("_", " ").toUpperCase()} />

          <div className="border-t border-dashed border-gray-300 my-4" />

          <div className="flex justify-between items-center text-lg font-bold text-kpa-navy">
            <span>Amount / Montant</span>
            <span>{Number(payment.amount).toLocaleString()} XAF</span>
          </div>

          <div className="border-t border-dashed border-gray-300 my-4" />

          <p className="text-xs text-gray-400">
            Collected by / Perçu par: {payment.staff?.full_name}
          </p>
          {payment.notes && (
            <p className="text-xs text-gray-400 mt-1">Notes: {payment.notes}</p>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Thank you / Merci — Kingdom Passion Academy
          </p>
        </div>

        <div className="p-4 print:hidden">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-kpa-navy">{value ?? "—"}</span>
    </div>
  );
}
