import DashboardShell from "@/components/DashboardShell";
import SuperAdminSecurity from "@/components/SuperAdminSecurity";
import BilingualText from "@/components/BilingualText";

export default function SuperAdminSecurityPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-kpa-navy mb-1">
          <BilingualText fr="Sécurité du compte" en="Account Security" />
        </h1>
        <p className="text-sm text-gray-500">
          <BilingualText fr="Gestion sécurisée du compte Super Administrateur." en="Secure management of the Super Administrator account." />
        </p>
      </div>
      <SuperAdminSecurity />
    </DashboardShell>
  );
}
