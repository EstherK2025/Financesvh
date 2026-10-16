import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, utilisateurCourant } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { ROLES, normaliserIdentifiant, problemeIdentifiant } from "@/lib/finances";
import { organisationDe } from "@/lib/fin-comptes";

// Création d'un compte (super admin) + envoi du lien d'activation.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const prenom = String(b.prenom || "").trim().slice(0, 80);
  const nom = String(b.nom || "").trim().slice(0, 80);
  const courriel = String(b.courriel || "").trim().toLowerCase().slice(0, 160);
  const role = String(b.role || "utilisateur");
  if (!prenom || !nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel))
    return NextResponse.json({ error: "Prénom, nom et courriel valide requis." }, { status: 400 });
  if (!(role in ROLES)) return NextResponse.json({ error: "Niveau invalide." }, { status: 400 });
  const identifiant = normaliserIdentifiant(b.identifiant);
  const pbId = problemeIdentifiant(identifiant);
  if (pbId) return NextResponse.json({ error: pbId }, { status: 400 });
  if (await prisma.finUtilisateur.findUnique({ where: { identifiant } }))
    return NextResponse.json({ error: `L'identifiant « ${identifiant} » est déjà pris.` }, { status: 409 });
  if (await prisma.finUtilisateur.findUnique({ where: { courriel } }))
    return NextResponse.json({ error: "Un compte existe déjà avec ce courriel." }, { status: 409 });
  const o = await organisationDe(role, b);
  if (!o.ok) return NextResponse.json({ error: o.erreur }, { status: 400 });

  const u = await prisma.finUtilisateur.create({ data: { prenom, nom, identifiant, courriel, role, ...o.org } });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, u.prenom, jeton);
  return NextResponse.json({ ok: true, id: u.id, lien: lienFinances(`/activer/${jeton}`) });
}
