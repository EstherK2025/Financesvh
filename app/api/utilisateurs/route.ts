import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, utilisateurCourant } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { ROLES } from "@/lib/finances";
import { leaderValide } from "@/lib/fin-demandes";

// Création d'un compte (super admin) + envoi du lien d'activation.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé aux super admins." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const prenom = String(b.prenom || "").trim().slice(0, 80);
  const nom = String(b.nom || "").trim().slice(0, 80);
  const courriel = String(b.courriel || "").trim().toLowerCase().slice(0, 160);
  const role = String(b.role || "utilisateur");
  if (!prenom || !nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel))
    return NextResponse.json({ error: "Prénom, nom et courriel valide requis." }, { status: 400 });
  if (!(role in ROLES)) return NextResponse.json({ error: "Niveau invalide." }, { status: 400 });
  if (await prisma.finUtilisateur.findUnique({ where: { courriel } }))
    return NextResponse.json({ error: "Un compte existe déjà avec ce courriel." }, { status: 409 });
  const leaderId = await leaderValide(b.leaderId);
  if (leaderId === false) return NextResponse.json({ error: "Leader invalide." }, { status: 400 });

  const u = await prisma.finUtilisateur.create({ data: { prenom, nom, courriel, role, leaderId } });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, u.prenom, jeton);
  return NextResponse.json({ ok: true, id: u.id, lien: lienFinances(`/activer/${jeton}`) });
}
