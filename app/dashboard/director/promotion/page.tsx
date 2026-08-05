import DashboardShell from "@/components/DashboardShell";
import PromotionTool from "@/components/PromotionTool";
import { listClasses } from "@/lib/actions/classes";

export default async function PromotionPage() {
  const classes = await listClasses();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Year-End Promotion</h1>
      <p className="text-sm text-gray-500 mb-6">
        Move students up a level, graduate them, or mark drop-outs. Fee balances travel
        with the student — use Fee Structure afterward to set the new level's fees.
      </p>

      {classes.length === 0 ? (
        <p className="text-sm text-gray-400">No classes exist yet.</p>
      ) : (
        <PromotionTool classes={classes as any} />
      )}
    </DashboardShell>
  );
}
