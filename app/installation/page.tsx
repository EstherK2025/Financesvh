import { FIN } from "@/lib/finances";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InstallationForm from "./InstallationForm";
import { titres } from "@/lib/fin-reglages";

export const dynamic = "force-dynamic";

// Premier lancement : création du premier super admin.
export default async function InstallationPage() {
  if ((await prisma.finUtilisateur.count()) > 0) redirect("/connexion");
  return (
    <div className="fin-etroit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FIN.logoComplet} alt="Vases d'Honneur" className="fin-logo-complet" />
      <h1>Installation</h1>
      <p className="sous">Créez le premier compte super admin (GA Maïté). Il crée ensuite tous les autres comptes.</p>
      <InstallationForm titres={await titres()} />
    </div>
  );
}
