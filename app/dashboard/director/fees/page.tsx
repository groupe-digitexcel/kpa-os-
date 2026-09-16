import DashboardShell from "@/components/DashboardShell";
import BilingualText from "@/components/BilingualText";
import { getFeeRegularizationByClass } from "@/lib/actions/dashboard";

export default async function FeesPage() {
  const rows = await getFeeRegularizationByClass();
  const schoolWideTotal = rows.reduce((s, r) => s + r.total, 0);
  const schoolWideOwing = rows.reduce((s, r) => s + r.owingCount, 0);
  const schoolWidePct = schoolWideTotal > 0 ? Math.round(((schoolWideTotal - schoolWideOwing) / schoolWideTotal) * 100) : 0;

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Régularisation des frais" en="Fee Regularization" /></h1>
      <p className="text-sm text-gray-500 mb-6"><BilingualText fr="Objectif : 80 % payés d’ici décembre, 100 % d’ici février" en="Target: 80% paid by December, 100% by February" /></p>

      <div className="bg-kpa-navy text-white rounded-xl p-5 mb-6">
        <p className="text-xs text-white/60 uppercase"><BilingualText fr="Ensemble de l’école" en="School-wide" /></p>
        <p className="text-3xl font-bold text-kpa-gold">{schoolWidePct}% <BilingualText fr="régularisés" en="regularized" /></p>
        <p className="text-sm text-white/70 mt-1">{schoolWideOwing} <BilingualText fr="sur" en="of" /> {schoolWideTotal} <BilingualText fr="élèves doivent encore des frais" en="students still owe fees" /></p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {rows.map((r) => (
          <div key={r.id} className="p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-kpa-navy">{r.name}</p>
              <p className="text-xs text-gray-500">{r.owingCount} <BilingualText fr="sur" en="of" /> {r.total} <BilingualText fr="redevables" en="owing" /></p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${r.paidPct >= 80 ? "text-green-600" : r.paidPct >= 50 ? "text-kpa-gold" : "text-red-600"}`}>{r.paidPct}%</p>
              {r.totalOwed > 0 && <p className="text-xs text-gray-400">{r.totalOwed.toLocaleString()} XAF <BilingualText fr="dus" en="owed" /></p>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-5 text-sm text-gray-400"><BilingualText fr="Aucune classe pour le moment." en="No classes yet." /></p>}
      </div>
    </DashboardShell>
  );
}
