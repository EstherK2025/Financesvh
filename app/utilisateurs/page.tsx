import { prisma } from "@/lib/prisma";
import { exigerUtilisateur } from "../components/garde";
import { NB_DEPARTEMENTS, ORGANIGRAMME } from "@/lib/organigramme";
import { mdpTemporaire, titres } from "@/lib/fin-reglages";
import Link from "next/link";
import Utilisateurs, { type LigneUtilisateur } from "./Utilisateurs";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const moi = await exigerUtilisateur(true);
  const liste = await prisma.finUtilisateur.findMany({
    orderBy: [{ actif: "desc" }, { ministere: "asc" }, { departement: "asc" }, { prenom: "asc" }],
    include: { _count: { select: { demandes: true } } },
  });
  const lignes: LigneUtilisateur[] = liste.map((u) => ({
    id: u.id,
    titre: u.titre || "",
    prenom: u.prenom,
    nom: u.nom,
    identifiant: u.identifiant || "",
    courriel: u.courriel || "",
    role: u.role,
    ministere: u.ministere || "",
    departement: u.departement || "",
    actif: u.actif,
    active: Boolean(u.motDePasse),
    authenticator: u.totpActif,
    leaderId: u.leaderId || "",
    nbDemandes: u._count.demandes,
    derniereConnexion: u.derniereConnexion ? u.derniereConnexion.toLocaleDateString("fr-CA") : "",
  }));
  return (
    <>
      <h1>Utilisateurs</h1>
      <ul className="fin-legende">
        <li>
          <b>Administrateur</b>
          Un ministère : approuve en premier les demandes de ses départements.
        </li>
        <li>
          <b>Utilisateur</b>
          Un département : fait les demandes.
        </li>
        <li>
          <b>Super administrateur</b>
          Finances et gestion des comptes.
        </li>
        <li>
          <b>Nom de la personne</b>
          Saisi par elle-même à sa première connexion ; vous pouvez le modifier à tout moment.
        </li>
      </ul>
      <div className="fin-note">
        <b className="fin-titre-note">🔑 Mot de passe temporaire universel</b>
        <code style={{ fontSize: 16, fontWeight: 800, userSelect: "all" }}>{await mdpTemporaire()}</code>
        <br />
        Pour la première connexion : chaque personne se connecte avec son identifiant et ce mot de passe, puis crée son propre mot de
        passe. <Link href="/reglages">Modifier</Link>
      </div>
      <Utilisateurs
        lignes={lignes}
        moiId={moi.id}
        titres={await titres()}
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
