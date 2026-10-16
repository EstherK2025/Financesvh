import { prisma } from "@/lib/prisma";
import { ROLES, nomUtilisateur } from "@/lib/finances";
import { exigerUtilisateur } from "../components/garde";
import MotDePasseForm from "./MotDePasseForm";

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const moi = await exigerUtilisateur();
  const leader = moi.leaderId ? await prisma.finUtilisateur.findUnique({ where: { id: moi.leaderId } }) : null;
  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Mon compte</h1>
      <p className="sous">Vos informations et votre sécurité.</p>
      <div className="fin-carte">
        <dl className="fin-dl">
          <dt>Nom</dt>
          <dd>{nomUtilisateur(moi)}</dd>
          <dt>Identifiant</dt>
          <dd>{moi.identifiant || "—"}</dd>
          <dt>Courriel</dt>
          <dd>{moi.courriel}</dd>
          <dt>Niveau</dt>
          <dd>{ROLES[moi.role]}</dd>
          {moi.role !== "superadmin" && (
            <>
              <dt>Mon leader</dt>
              <dd>{leader ? nomUtilisateur(leader) : "Aucun (directement aux finances)"}</dd>
            </>
          )}
          <dt>Connexion</dt>
          <dd>Mot de passe + code par courriel</dd>
        </dl>
      </div>
      <h2>Changer mon mot de passe</h2>
      <MotDePasseForm />
    </div>
  );
}
