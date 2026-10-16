import { prisma } from "@/lib/prisma";
import { exigerUtilisateur } from "../components/garde";
import { doubleAuthActive, logo, mdpTemporaire, titres } from "@/lib/fin-reglages";
import Reglages from "./Reglages";
import ReglagesTitres from "./ReglagesTitres";
import ReglagesDelegue from "./ReglagesDelegue";
import ReglagesPurge from "./ReglagesPurge";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  await exigerUtilisateur(true);
  const [mdp, l, deuxFacteurs, listeTitres, delegue, nbDemandes] = await Promise.all([
    mdpTemporaire(),
    logo(),
    doubleAuthActive(),
    titres(),
    prisma.finUtilisateur.findFirst({ where: { role: "delegue" }, include: { _count: { select: { aApprouver: { where: { statut: "attente_leader" } } } } } }),
    prisma.finDemande.count(),
  ]);
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Réglages</h1>
      <p className="sous">Réservé au super administrateur.</p>
      <Reglages deuxFacteurs={deuxFacteurs} mdp={mdp} aUnLogo={Boolean(l?.donnees)} version={l?.updatedAt.getTime() || 0} />
      <ReglagesDelegue
        compte={delegue ? { identifiant: delegue.identifiant || "", actif: delegue.actif, aTraiter: delegue._count.aApprouver } : null}
      />
      <ReglagesTitres titres={listeTitres} />
      <ReglagesPurge nbDemandes={nbDemandes} />
    </div>
  );
}
