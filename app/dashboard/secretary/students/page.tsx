import DashboardShell from "@/components/DashboardShell";
import StudentForm from "@/components/StudentForm";
import ParentCodeButton from "@/components/ParentCodeButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import PhotoUpload from "@/components/PhotoUpload";
import { listStudents, getClassesForDropdown } from "@/lib/actions/students";
import { exportStudentsCsv } from "@/lib/actions/exports";

export default async function StudentsPage() {
  const [students, classes] = await Promise.all([listStudents(), getClassesForDropdown()]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Students</h1>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{students.length} active students</p>
        <ExportCsvButton label="Export CSV" fetchCsv={exportStudentsCsv} filename="students.csv" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classes.length === 0 ? (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-sm text-gray-500">
            No classes exist yet. Ask the Director to create classes first (Director →
            Classes) before enrolling students.
          </div>
        ) : (
          <StudentForm classes={classes as { id: string; name: string }[]} />
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y max-h-[640px] overflow-y-auto">
          {students.map((s: any) => (
            <div key={s.id} className="p-3 text-sm">
              <div className="flex justify-between items-start gap-3">
                <PhotoUpload studentId={s.id} currentPhotoUrl={s.photo_url} />
                <div className="flex-1">
                  <p className="font-medium text-kpa-navy">{s.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {s.class?.name ?? "No class"} · {s.age} yrs · {s.sex}
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.parent?.full_name} · {s.parent?.phone_primary}
                  </p>
                  {s.parent?.id && (
                    <div className="mt-1">
                      <ParentCodeButton parentId={s.parent.id} />
                    </div>
                  )}
                </div>
                {s.total_fee_due > 0 && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                    Owes {s.total_fee_due.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <p className="p-5 text-sm text-gray-400">No students enrolled yet.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
