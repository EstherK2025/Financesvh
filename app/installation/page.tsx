import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InstallationForm from "./InstallationForm";

export const dynamic = "force-dynamic";

// Premier lancement : création du premier super admin.
export default async function InstallationPage() {
  if ((await prisma.finUtilisateur.count()) > 0) redirect("/connexion");
  return (
    <div className="fin-etroit">
      <h1>Installation</h1>
      <p className="sous">Créez le premier compte super admin (GA Maïté). Il crée ensuite tous les autres comptes.</p>
      <InstallationForm />
    </div>
  );
}
