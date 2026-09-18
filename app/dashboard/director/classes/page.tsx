import DashboardShell from "@/components/DashboardShell";
import ClassForm from "@/components/ClassForm";
import BilingualText from "@/components/BilingualText";
import { listClasses, listTeachers } from "@/lib/actions/classes";

export default async function ClassesPage() {
  const [classes, teachers] = await Promise.all([listClasses(), listTeachers()]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Classes" en="Classes" /></h1>
      <p className="text-sm text-gray-500 mb-6"><BilingualText fr="Maternelle + Primaire, sous-systèmes anglophone et francophone" en="Nursery + Primary, Anglophone & Francophone subsystems" /></p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClassForm teachers={teachers as { id: string; full_name: string }[]} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
          {classes.map((c: any) => (
            <div key={c.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-kpa-navy">{c.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {c.subsystem} · {c.level} · <BilingualText fr="Enseignant" en="Teacher" />: {c.teacher?.full_name ?? <BilingualText fr="Non affecté" en="Unassigned" />}
                </p>
              </div>
              <span className="text-xs bg-kpa-cream text-kpa-navy px-2 py-1 rounded-full font-medium">
                {c.students?.[0]?.count ?? 0} <BilingualText fr="élèves" en="students" />
              </span>
            </div>
          ))}
          {classes.length === 0 && <p className="p-5 text-sm text-gray-400"><BilingualText fr="Aucune classe créée pour le moment." en="No classes created yet." /></p>}
        </div>
      </div>
    </DashboardShell>
  );
}
