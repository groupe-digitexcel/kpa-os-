import DashboardShell from "@/components/DashboardShell";
import PromotionTool from "@/components/PromotionTool";
import BilingualText from "@/components/BilingualText";
import { listClasses } from "@/lib/actions/classes";

export default async function PromotionPage() {
  const classes = await listClasses();

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1"><BilingualText fr="Promotion de fin d’année" en="Year-End Promotion" /></h1>
      <p className="text-sm text-gray-500 mb-6">
        <BilingualText
          fr="Faites passer les élèves au niveau supérieur, diplômez-les ou marquez les abandons. Les soldes de frais suivent l’élève — utilisez ensuite la Grille tarifaire pour définir les frais du nouveau niveau."
          en="Move students up a level, graduate them, or mark drop-outs. Fee balances travel with the student — use Fee Structure afterward to set the new level's fees."
        />
      </p>
      {classes.length === 0 ? (
        <p className="text-sm text-gray-400"><BilingualText fr="Aucune classe n’existe encore." en="No classes exist yet." /></p>
      ) : (
        <PromotionTool classes={classes as any} />
      )}
    </DashboardShell>
  );
}
