import DashboardShell from "@/components/DashboardShell";
import SmsComposer from "@/components/SmsComposer";
import ReportCardGenerator from "@/components/ReportCardGenerator";
import BulkReportCardGenerator from "@/components/BulkReportCardGenerator";
import IdAndCertGenerator from "@/components/IdAndCertGenerator";
import FlyerGenerator from "@/components/FlyerGenerator";
import { getStudentsForDropdown, getRecentDocuments } from "@/lib/actions/documents";
import { getRecentSms } from "@/lib/actions/sms";
import { listClasses } from "@/lib/actions/classes";
import Link from "next/link";

const DOC_LINK: Record<string, string> = {
  report_card: "report-card",
  id_card: "id-card",
  attestation: "certificate",
  certificate: "certificate",
};

export default async function DocumentsPage() {
  const [students, classes, recentDocs, recentSms] = await Promise.all([
    getStudentsForDropdown(),
    listClasses(),
    getRecentDocuments(),
    getRecentSms(10),
  ]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Documents / SMS</h1>
      <p className="text-sm text-gray-500 mb-6">
        Report cards, ID cards, certificates, flyers, and parent SMS — AI-assisted
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SmsComposer classes={classes as any} />
          <FlyerGenerator />
        </div>

        <div className="space-y-6">
          <ReportCardGenerator students={students as any} />
          <BulkReportCardGenerator classes={classes as any} />
          <IdAndCertGenerator students={students as any} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-kpa-navy text-sm">Recent Documents</h2>
          </div>
          {recentDocs.map((d: any) => (
            <Link
              key={d.id}
              href={`/dashboard/secretary/documents/${DOC_LINK[d.doc_type]}/${d.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-kpa-cream"
            >
              <div>
                <p className="font-medium text-kpa-navy">{d.student?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{d.doc_type.replace("_", " ")}</p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(d.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
          {recentDocs.length === 0 && (
            <p className="p-5 text-sm text-gray-400">No documents generated yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-kpa-navy text-sm">Recent SMS</h2>
          </div>
          {recentSms.map((s: any) => (
            <div key={s.id} className="px-4 py-3 text-sm">
              <div className="flex justify-between">
                <p className="font-medium text-kpa-navy">{s.student?.full_name ?? s.phone}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === "sent"
                      ? "bg-green-100 text-green-700"
                      : s.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {s.status === "pending" ? "queued offline" : s.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.message_body}</p>
            </div>
          ))}
          {recentSms.length === 0 && (
            <p className="p-5 text-sm text-gray-400">No SMS sent yet.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
