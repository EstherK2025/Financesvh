import { prisma } from "@/lib/prisma";
import { nomUtilisateur } from "@/lib/finances";
import { exigerUtilisateur } from "../components/garde";
import Utilisateurs, { type LigneUtilisateur } from "./Utilisateurs";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const moi = await exigerUtilisateur(true);
  const liste = await prisma.finUtilisateur.findMany({
    orderBy: [{ actif: "desc" }, { prenom: "asc" }, { nom: "asc" }],
    include: { leader: true, _count: { select: { equipe: true } } },
  });
  const lignes: LigneUtilisateur[] = liste.map((u) => ({
    id: u.id,
    prenom: u.prenom,
    nom: u.nom,
    identifiant: u.identifiant || "",
    courriel: u.courriel,
    role: u.role,
    actif: u.actif,
    active: Boolean(u.motDePasse),
    leaderId: u.leaderId || "",
    leaderNom: u.leader ? nomUtilisateur(u.leader) : "",
    equipe: u._count.equipe,
    derniereConnexion: u.derniereConnexion ? u.derniereConnexion.toLocaleDateString("fr-CA") : "",
  }));
  return (
    <>
      <h1>Utilisateurs</h1>
      <p className="sous">
        3 niveaux : <b>Utilisateur</b> (fait des demandes) · <b>Leader</b> (approuve en premier les demandes de son équipe) ·{" "}
        <b>Super admin</b> (finances : approuve, paie, gère les comptes).
      </p>
      <Utilisateurs lignes={lignes} moiId={moi.id} />
    </>
  );
}
