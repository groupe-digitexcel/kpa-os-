import { getDocument } from "@/lib/actions/documents";
import { getSchoolSettings } from "@/lib/actions/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export default async function ReportCardPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const [doc, settings] = await Promise.all([getDocument(documentId), getSchoolSettings()]);
  if (!doc) notFound();

  const [frComment, enComment] = (doc.ai_generated_comment ?? "").split(/\n\n|\r\n\r\n/);

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto bg-white shadow-lg print:shadow-none rounded-xl overflow-hidden border-t-4 border-kpa-gold">
        <div className="bg-kpa-navy text-white p-6 text-center">
          <p className="font-bold text-kpa-gold text-xl">{settings.school_name}</p>
          <p className="text-xs text-white/70">{settings.address ?? "Douala, PK17 — Cameroon"}</p>
          <p className="text-sm text-white/80 mt-2">BULLETIN SCOLAIRE / REPORT CARD</p>
        </div>

        <div className="p-8 text-sm">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Row label="Student / Élève" value={doc.student?.full_name} />
            <Row label="Class / Classe" value={doc.student?.class?.name} />
            <Row label="Term / Trimestre" value={doc.term} />
            <Row label="Academic Year" value={doc.academic_year} />
          </div>

          <div className="border-t border-dashed border-gray-300 my-6" />

          {doc.grades_snapshot?.grades?.length > 0 && (
            <>
              <p className="text-xs text-gray-500 uppercase mb-2">Grades / Notes</p>
              <table className="w-full text-sm mb-2">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-1">Subject</th>
                    <th className="pb-1">Assessment</th>
                    <th className="pb-1 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.grades_snapshot.grades.map((g: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1 text-kpa-navy">{g.subject}</td>
                      <td className="py-1 text-gray-500">{g.title}</td>
                      <td className="py-1 text-right font-medium text-kpa-navy">
                        {g.score}/{g.max_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {doc.grades_snapshot.average !== null && (
                <p className="text-sm font-bold text-kpa-navy mb-4">
                  Term Average: {doc.grades_snapshot.average}%
                </p>
              )}
              <div className="border-t border-dashed border-gray-300 my-6" />
            </>
          )}

          <p className="text-xs text-gray-500 uppercase mb-2">Teacher's Comment / Appréciation</p>
          <p className="text-kpa-navy leading-relaxed whitespace-pre-line">
            {frComment}
          </p>
          {enComment && (
            <p className="text-kpa-navy leading-relaxed whitespace-pre-line mt-3">{enComment}</p>
          )}

          <div className="border-t border-dashed border-gray-300 my-8" />

          <div className="grid grid-cols-2 gap-8 text-center text-xs text-gray-400">
            <div>
              <div className="h-12 border-b border-gray-300 mb-1" />
              Teacher's Signature
            </div>
            <div>
              <div className="h-12 border-b border-gray-300 mb-1" />
              Director's Signature
            </div>
          </div>
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
    <div>
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className="font-medium text-kpa-navy">{value ?? "—"}</p>
    </div>
  );
}
