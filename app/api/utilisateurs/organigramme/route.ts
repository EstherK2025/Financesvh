import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { ORGANIGRAMME } from "@/lib/organigramme";

// Crée d'un coup les comptes de l'organigramme VH (super administrateur).
// Idempotent : un compte dont l'identifiant existe déjà n'est pas recréé, et un
// ministère qui a déjà un administrateur garde le sien.
// Les comptes n'ont pas encore de courriel : chaque personne le saisit en
// activant son compte via le lien que le super administrateur lui transmet.
export async function POST() {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });

  let crees = 0;
  let existants = 0;
  for (const m of ORGANIGRAMME) {
    let admin =
      (await prisma.finUtilisateur.findUnique({ where: { identifiant: m.identifiant } })) ||
      (await prisma.finUtilisateur.findFirst({ where: { role: "admin", ministere: { equals: m.nom, mode: "insensitive" } } }));
    if (admin) existants++;
    else {
      admin = await prisma.finUtilisateur.create({
        data: { prenom: "Ministère", nom: m.titre, identifiant: m.identifiant, role: "admin", ministere: m.nom },
      });
      crees++;
    }
    for (const dep of m.departements) {
      if (await prisma.finUtilisateur.findUnique({ where: { identifiant: dep.identifiant } })) {
        existants++;
        continue;
      }
      await prisma.finUtilisateur.create({
        data: {
          prenom: "Département",
          nom: dep.nom,
          identifiant: dep.identifiant,
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
