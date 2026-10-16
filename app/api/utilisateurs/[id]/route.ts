import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, fermerSessionsDe, utilisateurCourant } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { ROLES } from "@/lib/finances";
import { organisationDe } from "@/lib/fin-comptes";

// Modifier un compte (super admin) : { prenom?, nom?, role?, ministere?, departement?, leaderId?, actif? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (b.prenom !== undefined) data.prenom = String(b.prenom).trim().slice(0, 80) || u.prenom;
  if (b.nom !== undefined) data.nom = String(b.nom).trim().slice(0, 80) || u.nom;
  const role = b.role !== undefined ? String(b.role) : u.role;
  if (!(role in ROLES)) return NextResponse.json({ error: "Niveau invalide." }, { status: 400 });
  if (id === moi.id && role !== "superadmin")
    return NextResponse.json({ error: "Vous ne pouvez pas retirer votre propre accès super administrateur." }, { status: 400 });
  // Niveau ou rattachement modifié → on recalcule ministère / département / approbateur.
  if (["role", "ministere", "departement", "leaderId"].some((k) => b[k] !== undefined)) {
    const o = await organisationDe(
      role,
      {
        ministere: b.ministere ?? u.ministere,
        departement: b.departement ?? u.departement,
        leaderId: b.leaderId ?? u.leaderId,
      },
      id,
    );
    if (!o.ok) return NextResponse.json({ error: o.erreur }, { status: 400 });
    Object.assign(data, { role }, o.org);
  }
  if (b.actif !== undefined) {
    if (id === moi.id && !b.actif) return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
    data.actif = Boolean(b.actif);
  }
  await prisma.finUtilisateur.update({ where: { id }, data });
  if (u.role === "admin" && data.role !== undefined && data.role !== "admin") {
    // N'est plus administrateur de ministère : ses départements sont détachés.
    await prisma.finUtilisateur.updateMany({ where: { leaderId: id }, data: { leaderId: null, ministere: null } });
  } else if (data.role === "admin" && data.ministere !== u.ministere) {
    // Ministère renommé : ses départements suivent.
    await prisma.finUtilisateur.updateMany({ where: { leaderId: id }, data: { ministere: data.ministere as string } });
  }
  if (data.actif === false) await fermerSessionsDe(id);
  return NextResponse.json({ ok: true });
}

// Renvoyer le lien d'activation / de réinitialisation.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u || !u.actif) return NextResponse.json({ error: "Compte introuvable ou désactivé." }, { status: 404 });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, u.prenom, jeton, Boolean(u.motDePasse));
  return NextResponse.json({ ok: true, lien: lienFinances(`/activer/${jeton}`) });
}
