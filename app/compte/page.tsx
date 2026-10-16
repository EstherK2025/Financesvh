import { prisma } from "@/lib/prisma";
import { ROLES, libelleOrg, nomUtilisateur } from "@/lib/finances";
import { exigerUtilisateur } from "../components/garde";
import { doubleAuthActive } from "@/lib/fin-reglages";
import MotDePasseForm from "./MotDePasseForm";

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const moi = await exigerUtilisateur();
  const tot = (await prisma.finUtilisateur.findUnique({ where: { id: moi.id }, select: { totpActif: true } }))?.totpActif;
  const leader = moi.leaderId ? await prisma.finUtilisateur.findUnique({ where: { id: moi.leaderId } }) : null;
  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Mon compte</h1>
      <p className="sous">Vos informations et votre sécurité.</p>
      <div className="fin-carte">
        <dl className="fin-dl">
          <dt>Nom</dt>
          <dd>{nomUtilisateur(moi)}</dd>
          <dt>Titre</dt>
          <dd>{moi.titre || "—"}</dd>
          <dt>Identifiant</dt>
          <dd>{moi.identifiant || "—"}</dd>
          <dt>Courriel</dt>
          <dd>{moi.courriel || "—"}</dd>
          <dt>Niveau</dt>
          <dd>{ROLES[moi.role]}</dd>
          {moi.role !== "superadmin" && (
            <>
              <dt>Ministère</dt>
              <dd>{libelleOrg(moi.ministere, moi.departement) || "—"}</dd>
              {moi.role === "utilisateur" && (
                <>
                  <dt>Approuvé par</dt>
                  <dd>{leader ? nomUtilisateur(leader) : "Directement les finances"}</dd>
                </>
              )}
            </>
          )}
          <dt>Connexion</dt>
          <dd>
            {(await doubleAuthActive())
              ? `Mot de passe + application Authenticator${tot ? " (configurée)" : " (à configurer à la prochaine connexion)"}`
              : "Identifiant + mot de passe"}
          </dd>
        </dl>
      </div>
      <h2>Changer mon mot de passe</h2>
      <MotDePasseForm />
    </div>
  );
}
