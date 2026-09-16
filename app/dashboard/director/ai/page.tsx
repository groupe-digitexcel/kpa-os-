import DashboardShell from "@/components/DashboardShell";
import BilingualText from "@/components/BilingualText";

const examples = [
  ["Finance", "Summarize fee collection and outstanding balances for the current academic year.", "Finances", "Résume les encaissements de frais et les soldes impayés pour l’année scolaire en cours."],
  ["Attendance", "Identify attendance patterns that need the Director's attention.", "Présences", "Identifie les tendances de présence qui nécessitent l’attention du directeur."],
  ["Academics", "Summarize class performance from the latest available assessments.", "Académique", "Résume les performances des classes à partir des dernières évaluations disponibles."],
  ["Communication", "Draft a bilingual reminder to parents about outstanding school fees.", "Communication", "Rédige un rappel bilingue aux parents concernant les frais scolaires impayés."],
];

export default function DirectorAiPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-kpa-navy"><BilingualText fr="Centre de commande IA KPA" en="KPA AI Command Center" /></h1>
        <p className="mt-1 text-sm text-gray-500"><BilingualText fr="Posez des questions opérationnelles. L’accès est contrôlé par le rôle du personnel authentifié." en="Ask operational questions. Access is enforced by the authenticated staff role." /></p>
      </div>

      <form action="/api/ai/assistant" method="post" className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <input type="hidden" name="intent" value="dashboard_query" />
        <label className="mb-2 block text-sm font-semibold text-kpa-navy"><BilingualText fr="Question" en="Question" /></label>
        <textarea name="prompt" required rows={5} className="w-full rounded-lg border p-3" placeholder="Ask KPA-OS..." />
        <button className="mt-4 rounded-lg bg-kpa-navy px-5 py-2.5 font-semibold text-white"><BilingualText fr="Interroger l’IA" en="Ask AI" /></button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {examples.map(([enTitle, enText, frTitle, frText]) => (
          <div key={enTitle} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500"><BilingualText fr={frTitle} en={enTitle} /></p>
            <p className="mt-2 text-sm text-gray-700"><BilingualText fr={frText} en={enText} /></p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <BilingualText
          fr="La sortie de l’IA est une assistance et non une couche d’autorisation. Les actions financières, de protection, académiques et relatives aux élèves nécessitent toujours les autorisations et workflows KPA-OS habituels."
          en="AI output is assistance, not an authorization layer. Financial, safeguarding, academic and student actions still require normal KPA-OS permissions and workflows."
        />
      </div>
    </DashboardShell>
  );
}
