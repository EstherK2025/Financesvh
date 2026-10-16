import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { ORGANIGRAMME } from "@/lib/organigramme";
import { courrielParDefaut } from "@/lib/finances";

// Crée d'un coup les comptes de l'organigramme VH (super administrateur).
// Idempotent : un compte dont l'identifiant existe déjà n'est pas recréé, et un
// ministère qui a déjà un administrateur garde le sien.
// Courriel de chaque compte : identifiant@evhnb.ca. Première connexion avec le
// mot de passe temporaire universel (affiché dans Réglages et Utilisateurs).
export async function POST() {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });

  let crees = 0;
  let existants = 0;
  // Courriel identifiant@evhnb.ca, sauf s'il est déjà pris par un autre compte.
  const courrielLibre = async (identifiant: string) => {
    const c = courrielParDefaut(identifiant);
    return (await prisma.finUtilisateur.findUnique({ where: { courriel: c } })) ? null : c;
  };
  // Complète un compte existant qui n'a pas encore de courriel.
  const completer = async (u: { id: string; courriel: string | null; identifiant: string | null }) => {
    if (!u.courriel && u.identifiant) {
      const c = await courrielLibre(u.identifiant);
      if (c) await prisma.finUtilisateur.update({ where: { id: u.id }, data: { courriel: c } });
    }
  };
  for (const m of ORGANIGRAMME) {
    let admin =
      (await prisma.finUtilisateur.findUnique({ where: { identifiant: m.identifiant } })) ||
      (await prisma.finUtilisateur.findFirst({ where: { role: "admin", ministere: { equals: m.nom, mode: "insensitive" } } }));
    if (admin) {
      existants++;
      await completer(admin);
    } else {
      admin = await prisma.finUtilisateur.create({
        data: { prenom: "Ministère", nom: m.titre, identifiant: m.identifiant, courriel: await courrielLibre(m.identifiant), role: "admin", ministere: m.nom },
      });
      crees++;
    }
    for (const dep of m.departements) {
      const deja = await prisma.finUtilisateur.findUnique({ where: { identifiant: dep.identifiant } });
      if (deja) {
        existants++;
        await completer(deja);
        continue;
      }
      await prisma.finUtilisateur.create({
        data: {
          prenom: "Département",
          nom: dep.nom,
          identifiant: dep.identifiant,
          courriel: await courrielLibre(dep.identifiant),
          role: "utilisateur",
          ministere: admin.ministere,
          departement: dep.nom,
          leaderId: admin.id,
        },
      });
      crees++;
    }
  }
  return NextResponse.json({ ok: true, crees, existants });
}
