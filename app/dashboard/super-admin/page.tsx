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
          <BilingualText fr="Administration Super Administrateur" en="Super Administrator Administration" />
        </h1>
        <p className="text-sm text-gray-500">
          <BilingualText
            fr="Centre de contrôle des comptes, des accès et de la gouvernance de KPA-OS."
            en="Control center for KPA-OS accounts, access, and governance."
          />
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
        <a href="/dashboard/super-admin" className="rounded-lg bg-kpa-navy px-3 py-2 text-center text-xs font-semibold text-white">
          <BilingualText fr="Personnel" en="Staff" />
        </a>
        <a href="/dashboard/super-admin/security" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-kpa-navy hover:bg-gray-50">
          <BilingualText fr="Sécurité" en="Security" />
        </a>
        <a href="/dashboard/auditor" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-kpa-navy hover:bg-gray-50">
          <BilingualText fr="Audit" en="Audit" />
        </a>
        <a href="/dashboard/director/settings" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-kpa-navy hover:bg-gray-50">
          <BilingualText fr="Paramètres" en="Settings" />
        </a>
      </div>

      <div className="mb-6 rounded-xl border border-kpa-gold/30 bg-kpa-gold/10 p-4">
        <p className="text-sm font-semibold text-kpa-navy">
          <BilingualText fr="Accès Super Administrateur" en="Super Administrator Access" />
        </p>
        <p className="text-xs text-gray-600 mt-1">
          <BilingualText
            fr="Le Super Administrateur est le seul rôle autorisé à créer, activer, désactiver et modifier les rôles des comptes du personnel."
            en="The Super Administrator is the only role authorized to create, activate, deactivate, and change staff account roles."
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
