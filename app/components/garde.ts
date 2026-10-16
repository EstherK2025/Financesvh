import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant, type UtilisateurCourant } from "@/lib/fin-auth";

// Pages protégées : renvoie l'utilisateur connecté, sinon redirige vers la
// connexion (ou l'installation au tout premier lancement).
export async function exigerUtilisateur(superadmin = false): Promise<UtilisateurCourant> {
  const u = await utilisateurCourant();
  if (!u) {
    if ((await prisma.finUtilisateur.count()) === 0) redirect("/installation");
    redirect("/connexion");
  }
  if (superadmin && u.role !== "superadmin") redirect("/");
  return u;
}
