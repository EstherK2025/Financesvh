import { prisma } from "@/lib/prisma";
import { exigerUtilisateur } from "../components/garde";
import { NB_DEPARTEMENTS, ORGANIGRAMME } from "@/lib/organigramme";
import { mdpTemporaire } from "@/lib/fin-reglages";
import Link from "next/link";
import Utilisateurs, { type LigneUtilisateur } from "./Utilisateurs";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const moi = await exigerUtilisateur(true);
  const liste = await prisma.finUtilisateur.findMany({
    orderBy: [{ actif: "desc" }, { ministere: "asc" }, { departement: "asc" }, { prenom: "asc" }],
  });
  const lignes: LigneUtilisateur[] = liste.map((u) => ({
    id: u.id,
    prenom: u.prenom,
    nom: u.nom,
    identifiant: u.identifiant || "",
    courriel: u.courriel || "",
    role: u.role,
    ministere: u.ministere || "",
    departement: u.departement || "",
    actif: u.actif,
    active: Boolean(u.motDePasse),
    leaderId: u.leaderId || "",
    derniereConnexion: u.derniereConnexion ? u.derniereConnexion.toLocaleDateString("fr-CA") : "",
  }));
  return (
    <>
      <h1>Utilisateurs</h1>
      <p className="sous">
        <b>Administrateur</b> = un ministère (approuve en premier les demandes de ses départements) · <b>Utilisateur</b> = un
        département (fait les demandes) · <b>Super administrateur</b> = finances et gestion des comptes.
      </p>
      <div className="fin-note">
        🔑 <b>Mot de passe temporaire universel</b> (première connexion) :{" "}
        <code style={{ fontSize: 16, fontWeight: 800, userSelect: "all" }}>{await mdpTemporaire()}</code>
        <br />
        Chaque personne se connecte avec son <b>identifiant</b> et ce mot de passe, puis crée son propre mot de passe. <Link href="/reglages">Modifier</Link>
      </div>
      <Utilisateurs
        lignes={lignes}
        moiId={moi.id}
        organigramme={{
          total: ORGANIGRAMME.length + NB_DEPARTEMENTS,
          manquants:
            ORGANIGRAMME.length +
            NB_DEPARTEMENTS -
            lignes.filter((l) => ORGANIGRAMME.some((m) => m.identifiant === l.identifiant || m.departements.some((d) => d.identifiant === l.identifiant))).length,
        }}
      />
    </>
  );
}
