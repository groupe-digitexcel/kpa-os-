import DashboardShell from "@/components/DashboardShell";
import HealthStudentPicker from "@/components/HealthStudentPicker";
import HealthRecordForm from "@/components/HealthRecordForm";
import { getHealthRecord } from "@/lib/actions/health";

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const record = studentId ? await getHealthRecord(studentId) : null;

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Health Records</h1>
      <p className="text-sm text-gray-500 mb-6">
        Allergies, conditions, medications, emergency contacts — visible to Director, Secretary, and Teachers
      </p>

      <HealthStudentPicker />

      {studentId ? (
        <HealthRecordForm studentId={studentId} existing={record} />
      ) : (
        <p className="text-sm text-gray-400">Search for a student above to view or edit their health record.</p>
      )}
    </DashboardShell>
  );
}
