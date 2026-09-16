import DashboardShell from "@/components/DashboardShell";
import AddStaffForm from "@/components/AddStaffForm";
import StaffList from "@/components/StaffList";
import BilingualText from "@/components/BilingualText";
import { listStaff } from "@/lib/actions/staff";

export default async function SuperAdminPage() {
  const staff = await listStaff();

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-kpa-navy mb-1">
          <BilingualText fr="Super Administration" en="Super Administration" />
        </h1>
        <p className="text-sm text-gray-500">
          <BilingualText
            fr="Créer et administrer manuellement les comptes du personnel de l’établissement."
            en="Manually create and administer the school staff accounts."
          />
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-kpa-gold/30 bg-kpa-gold/10 p-4">
        <p className="text-sm font-semibold text-kpa-navy">
          <BilingualText fr="Accès Super Administrateur" en="Super Administrator Access" />
        </p>
        <p className="text-xs text-gray-600 mt-1">
          <BilingualText
            fr="Le Super Administrateur peut créer, activer, désactiver et modifier les rôles des comptes du personnel."
            en="The Super Administrator can create, activate, deactivate, and change staff account roles."
          />
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AddStaffForm />
        <StaffList staff={staff as any[]} />
      </div>
    </DashboardShell>
  );
}
