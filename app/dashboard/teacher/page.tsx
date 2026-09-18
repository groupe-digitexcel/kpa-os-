import DashboardShell from "@/components/DashboardShell";
import ClockInOutWidget from "@/components/ClockInOutWidget";
import BilingualText from "@/components/BilingualText";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { getTeacherClassRoster } from "@/lib/actions/dashboard";
import { getMyTodayAttendance } from "@/lib/actions/staffAttendance";

export default async function TeacherDashboard() {
  const staff = await getEffectiveStaff();
  const { myClass, students } = staff
    ? await getTeacherClassRoster(staff.id)
    : { myClass: null, students: [] };
  const myAttendance = (await getMyTodayAttendance()) as any;

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">
        {(myClass as any)?.name ?? <BilingualText fr="Ma classe" en="My Class" />}
      </h1>
      <p className="text-sm text-gray-500 mb-4">{students.length} <BilingualText fr="élèves inscrits" en="students enrolled" /></p>

      <div className="mb-6">
        <ClockInOutWidget clockInTime={myAttendance?.clock_in ?? null} clockOutTime={myAttendance?.clock_out ?? null} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {students.map((s: any) => (
          <div key={s.id} className="p-3 flex justify-between text-sm">
            <span className="text-kpa-navy font-medium">{s.full_name}</span>
            <span className="text-gray-400">
              {s.age} <BilingualText fr="ans" en="yrs" /> · {s.sex}
            </span>
          </div>
        ))}
        {students.length === 0 && (
          <p className="p-5 text-sm text-gray-400"><BilingualText fr="Aucun élève n’est encore affecté." en="No students assigned yet." /></p>
        )}
      </div>
    </DashboardShell>
  );
}
