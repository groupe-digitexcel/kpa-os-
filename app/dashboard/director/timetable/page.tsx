import DashboardShell from "@/components/DashboardShell";
import TimetableEditor from "@/components/TimetableEditor";
import { listClasses, listTeachers } from "@/lib/actions/classes";
import { listSubjects } from "@/lib/actions/gradebook";

export default async function TimetablePage() {
  const [classes, teachers, subjects] = await Promise.all([listClasses(), listTeachers(), listSubjects()]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Timetable</h1>
      <p className="text-sm text-gray-500 mb-6">Weekly class schedule</p>

      {classes.length === 0 ? (
        <p className="text-sm text-gray-400">Create classes first (Director → Classes).</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-gray-400">
          No subjects yet — a teacher needs to create at least one subject via the Gradebook first.
        </p>
      ) : (
        <TimetableEditor classes={classes as any} subjects={subjects as any} teachers={teachers as any} />
      )}
    </DashboardShell>
  );
}
