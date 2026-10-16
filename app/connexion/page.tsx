import { FIN } from "@/lib/finances";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import ConnexionForm from "./ConnexionForm";

export const dynamic = "force-dynamic";

export default async function ConnexionPage() {
  if (await utilisateurCourant()) redirect("/");
  if ((await prisma.finUtilisateur.count()) === 0) redirect("/installation");
  return (
    <div className="fin-etroit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FIN.logoComplet} alt="Vases d'Honneur" className="fin-logo-complet" />
      <h1>Connexion</h1>
      <p className="sous">Plateforme des demandes de décaissement et de remboursement.</p>
      <ConnexionForm />
    </div>
  );
}
