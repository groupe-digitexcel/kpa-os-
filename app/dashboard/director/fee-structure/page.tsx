import DashboardShell from "@/components/DashboardShell";
import FeeStructureManager from "@/components/FeeStructureManager";
import { listFeeStructures } from "@/lib/actions/feeStructure";

export default async function FeeStructurePage() {
  const structures = await listFeeStructures();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Fee Structure</h1>
      <p className="text-sm text-gray-500 mb-6">Set school fees per level for 2026-2027</p>

      <FeeStructureManager existing={structures as any[]} />
    </DashboardShell>
  );
}
