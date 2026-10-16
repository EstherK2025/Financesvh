import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, fermerSessionsDe, utilisateurCourant } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { ROLES } from "@/lib/finances";
import { leaderValide } from "@/lib/fin-demandes";

// Modifier un compte (super admin) : { prenom?, nom?, role?, leaderId?, actif? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé aux super admins." }, { status: 403 });
  const { id } = await params;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (b.prenom !== undefined) data.prenom = String(b.prenom).trim().slice(0, 80) || u.prenom;
  if (b.nom !== undefined) data.nom = String(b.nom).trim().slice(0, 80) || u.nom;
  if (b.role !== undefined) {
    if (!(String(b.role) in ROLES)) return NextResponse.json({ error: "Niveau invalide." }, { status: 400 });
    if (id === moi.id && b.role !== "superadmin")
      return NextResponse.json({ error: "Vous ne pouvez pas retirer votre propre accès super admin." }, { status: 400 });
    data.role = String(b.role);
  }
  if (b.leaderId !== undefined) {
    const l = await leaderValide(b.leaderId, id);
    if (l === false) return NextResponse.json({ error: "Leader invalide." }, { status: 400 });
    data.leaderId = l;
  }
  if (b.actif !== undefined) {
    if (id === moi.id && !b.actif) return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
    data.actif = Boolean(b.actif);
  }
  await prisma.finUtilisateur.update({ where: { id }, data });
  // Une personne qui n'est plus leader ne garde pas d'équipe.
  if (data.role === "utilisateur") await prisma.finUtilisateur.updateMany({ where: { leaderId: id }, data: { leaderId: null } });
  if (data.actif === false) await fermerSessionsDe(id);
  return NextResponse.json({ ok: true });
}

// Renvoyer le lien d'activation / de réinitialisation.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé aux super admins." }, { status: 403 });
  const { id } = await params;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u || !u.actif) return NextResponse.json({ error: "Compte introuvable ou désactivé." }, { status: 404 });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, u.prenom, jeton, Boolean(u.motDePasse));
  return NextResponse.json({ ok: true, lien: lienFinances(`/activer/${jeton}`) });
}
