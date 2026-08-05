import DashboardShell from "@/components/DashboardShell";
import SettingsForm from "@/components/SettingsForm";
import { getSchoolSettings } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const settings = await getSchoolSettings();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">School Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Name, address, and contact info shown on receipts, report cards, and certificates
      </p>

      <SettingsForm settings={settings} />

      <div className="max-w-lg mt-4 bg-kpa-cream rounded-lg p-3 text-xs text-gray-500">
        Note: this drop wires the school name/address into the login screen and
        payment receipts as a first pass. Report cards, certificates, ID cards, and
        the desktop app window title still show "Kingdom Passion Academy" directly —
        say the word and I'll finish wiring all of them to pull from here.
      </div>
    </DashboardShell>
  );
}
