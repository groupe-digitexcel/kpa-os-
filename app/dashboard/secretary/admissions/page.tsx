import DashboardShell from "@/components/DashboardShell";
import AdmissionInquiryForm from "@/components/AdmissionInquiryForm";
import AdmissionPipeline from "@/components/AdmissionPipeline";
import { listAdmissions } from "@/lib/actions/admissions";
import { listClasses } from "@/lib/actions/classes";

export default async function AdmissionsPage() {
  const [admissions, classes] = await Promise.all([listAdmissions(), listClasses()]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Admissions</h1>
      <p className="text-sm text-gray-500 mb-6">Inquiries, visits, waitlist, and enrollment</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdmissionInquiryForm />
        <AdmissionPipeline admissions={admissions as any[]} classes={classes as any} />
      </div>
    </DashboardShell>
  );
}
