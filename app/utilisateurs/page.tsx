import { prisma } from "@/lib/prisma";
import { exigerUtilisateur } from "../components/garde";
import { NB_DEPARTEMENTS, ORGANIGRAMME } from "@/lib/organigramme";
import { mdpTemporaire, titres } from "@/lib/fin-reglages";
import Link from "next/link";
import { EtiquettesInfo, TitreInfo } from "../components/Info";
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
      <EtiquettesInfo
        items={[
          { titre: "Administrateur", texte: "Un ministère : approuve en premier les demandes de ses départements." },
          { titre: "Utilisateur", texte: "Un département : fait les demandes." },
          { titre: "Super administrateur", texte: "Finances et gestion des comptes." },
          { titre: "Nom de la personne", texte: "Saisi par elle-même à sa première connexion ; vous pouvez le modifier à tout moment." },
        ]}
      />
      <div className="fin-note">
        <TitreInfo titre="Mot de passe temporaire universel">
          Pour la première connexion : chaque personne se connecte avec son identifiant et ce mot de passe, puis crée son propre mot de
          passe. <Link href="/reglages">Modifier</Link>
        </TitreInfo>
        <code style={{ display: "block", fontSize: 16, fontWeight: 800, userSelect: "all" }}>{await mdpTemporaire()}</code>
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
