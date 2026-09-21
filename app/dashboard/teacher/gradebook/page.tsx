import DashboardShell from "@/components/DashboardShell";
import Gradebook from "@/components/Gradebook";
import BilingualText from "@/components/BilingualText";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { getTeacherClassRoster } from "@/lib/actions/dashboard";
import { listSubjects, listAssessments } from "@/lib/actions/gradebook";

export default async function GradebookPage() {
  const staff = await getEffectiveStaff();
  const { myClass } = staff ? await getTeacherClassRoster(staff.id) : { myClass: null };
  if (!myClass) return <DashboardShell><h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Carnet de notes" en="Gradebook" /></h1><p className="text-sm text-gray-400"><BilingualText fr="Aucune classe ne vous est encore affectée." en="No class assigned to you yet." /></p></DashboardShell>;
  const [subjects, assessments] = await Promise.all([listSubjects(), listAssessments((myClass as any).id)]);
  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Carnet de notes" en="Gradebook" /></h1>
      <p className="text-sm text-gray-500 mb-6">{(myClass as any).name}</p>
      {assessments.length === 0 && <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-sm text-gray-500 mb-6"><BilingualText fr="Aucune évaluation pour le moment — créez la première ci-dessous." en="No assessments yet — create your first one below." /></div>}
      <Gradebook classId={(myClass as any).id} subjects={subjects as any} assessments={assessments as any} />
    </DashboardShell>
  );
}
