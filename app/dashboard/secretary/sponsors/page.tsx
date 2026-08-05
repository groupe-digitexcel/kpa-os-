import DashboardShell from "@/components/DashboardShell";
import SponsorForm from "@/components/SponsorForm";
import SponsorPipeline from "@/components/SponsorPipeline";
import { listSponsors } from "@/lib/actions/sponsors";

export default async function SponsorsPage() {
  const sponsors = await listSponsors();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Sponsors / Institutional Support</h1>
      <p className="text-sm text-gray-500 mb-6">Sponsoring letters and follow-ups with institutions</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SponsorForm />
        <SponsorPipeline sponsors={sponsors as any[]} />
      </div>
    </DashboardShell>
  );
}
