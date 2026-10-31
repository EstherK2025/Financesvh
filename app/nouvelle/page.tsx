import { redirect } from "next/navigation";
import { exigerUtilisateur } from "../components/garde";
import { contexteFormulaire } from "../components/circuit";
import DemandeForm from "../components/DemandeForm";
import { categories } from "@/lib/fin-reglages";

export const dynamic = "force-dynamic";

export default async function NouvellePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const moi = await exigerUtilisateur();
  if (moi.role === "delegue") redirect("/");
  const { type } = await searchParams;
  const ctx = await contexteFormulaire(moi);
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Nouvelle demande</h1>
      <p className="sous">Remplissez le formulaire ; vous serez avisé par courriel à chaque étape.</p>
      <DemandeForm
        initial={{
          type: type === "decaissement" ? "decaissement" : "remboursement",
          categorie: "",
          objet: "",
          description: "",
          montant: "",
          dateDepense: "",
          beneficiaire: "",
          modePaiement: "interac",
          destinataireId: "",
        }}
        destinataires={ctx.destinataires}
        circuit={ctx.circuit}
        categories={await categories()}
      />
    </div>
  );
}
