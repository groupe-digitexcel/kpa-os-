import DashboardShell from "@/components/DashboardShell";
import DailyAttendanceForm from "@/components/DailyAttendanceForm";
import BilingualText from "@/components/BilingualText";
import { getTodayRosterWithAttendance } from "@/lib/actions/attendance";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { getTeacherClassRoster } from "@/lib/actions/dashboard";

export default async function TeacherAttendancePage() {
  const staff = await getEffectiveStaff();
  const { myClass } = staff ? await getTeacherClassRoster(staff.id) : { myClass: null };
  const roster = myClass ? await getTodayRosterWithAttendance((myClass as any).id) : [];

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">
        {(myClass as any)?.name ?? <BilingualText fr="Ma classe" en="My Class" />} — <BilingualText fr="Présences quotidiennes" en="Daily Attendance" />
      </h1>
      <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleDateString()}</p>
      {!myClass ? <p className="text-sm text-gray-400"><BilingualText fr="Aucune classe ne vous est encore affectée." en="No class assigned to you yet." /></p> : <DailyAttendanceForm initialRoster={roster} />}
    </DashboardShell>
  );
}
