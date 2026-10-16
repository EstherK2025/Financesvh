import Link from "next/link";
import { utilisateurParJeton } from "@/lib/fin-auth";
import ActiverForm from "./ActiverForm";

export const dynamic = "force-dynamic";

export default async function ActiverPage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const u = await utilisateurParJeton(jeton);
  if (!u)
    return (
      <div className="fin-etroit">
        <h1>Lien expiré</h1>
        <div className="fin-carte">
          <p style={{ marginBottom: 14 }}>Ce lien est invalide ou a expiré.</p>
          <Link href="/oublie" className="fin-btn plein">
            Recevoir un nouveau lien
          </Link>
        </div>
      </div>
    );
  return (
    <div className="fin-etroit">
      <h1>{u.motDePasse ? "Nouveau mot de passe" : `Bienvenue ${u.prenom} !`}</h1>
      <p className="sous">Choisissez un mot de passe sécurisé pour {u.courriel}.</p>
      <ActiverForm jeton={jeton} />
    </div>
  );
}
