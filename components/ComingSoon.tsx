import DashboardShell from "@/components/DashboardShell";

export default function ComingSoon({ title, step }: { title: string; step: string }) {
  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">{title}</h1>
      <div className="mt-6 bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <p className="text-gray-400 text-sm">This module ships in {step}.</p>
      </div>
    </DashboardShell>
  );
}
