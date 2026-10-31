import { prisma } from "@/lib/prisma";
import { exigerUtilisateur } from "../components/garde";
import { categories, doubleAuthActive, logo, mdpTemporaire, titres } from "@/lib/fin-reglages";
import Reglages from "./Reglages";
import ReglagesListe from "./ReglagesListe";
import ReglagesDelegue from "./ReglagesDelegue";
import ReglagesPurge from "./ReglagesPurge";
import JournalSecurite from "./JournalSecurite";
import Courriels from "./Courriels";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  const moi = await exigerUtilisateur(true);
  const [mdp, l, deuxFacteurs, listeTitres, delegue, nbDemandes, listeCategories] = await Promise.all([
    mdpTemporaire(),
    logo(),
    doubleAuthActive(),
    titres(),
    prisma.finUtilisateur.findFirst({ where: { role: "delegue" }, include: { _count: { select: { aApprouver: { where: { statut: "attente_leader" } } } } } }),
    prisma.finDemande.count(),
    categories(),
  ]);
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Réglages</h1>
      <p className="sous">Réservé au super administrateur.</p>
      <Reglages deuxFacteurs={deuxFacteurs} mdp={mdp} aUnLogo={Boolean(l?.donnees)} version={l?.updatedAt.getTime() || 0} />
      <ReglagesDelegue
        compte={delegue ? { identifiant: delegue.identifiant || "", actif: delegue.actif, aTraiter: delegue._count.aApprouver } : null}
      />
      <ReglagesListe
        cle="categories"
        valeurs={listeCategories}
        titre="Catégories de dépenses"
        aide="Proposées dans le formulaire de demande. Une catégorie retirée reste affichée sur les demandes qui l'utilisent déjà."
        exemple="Nouvelle catégorie (ex. Transport)"
        libelle="Nouvelle catégorie"
        max={60}
      />
      <ReglagesListe
        cle="titres"
        valeurs={listeTitres}
        titre="Titres des personnes"
        aide="Proposés dans la liste « Titre » (première connexion, comptes). Un titre retiré reste affiché pour les personnes qui l'ont déjà."
        exemple="Nouveau titre (ex. Pasteur)"
        libelle="Nouveau titre"
        max={30}
      />
      <Courriels courrielMoi={moi.courriel || ""} />
      <JournalSecurite />
      <ReglagesPurge nbDemandes={nbDemandes} />
    </div>
  );
}
