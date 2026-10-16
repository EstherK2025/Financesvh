import { NextResponse } from "next/server";
import { titreValide } from "@/lib/fin-reglages";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, fermerSessionsDe, utilisateurCourant } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { ROLES_COMPTES as ROLES, courrielParDefaut, nomUtilisateur, normaliserIdentifiant, problemeIdentifiant } from "@/lib/finances";
import { identifiantDeBase, organisationDe } from "@/lib/fin-comptes";

// Modifier un compte (super admin) :
// { titre?, prenom?, nom?, identifiant?, courriel?, role?, ministere?, departement?, leaderId?, actif?, reinitialiserAuthenticator? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (b.titre !== undefined) data.titre = await titreValide(b.titre);
  // Nom de la personne : modifiable, ou vidé (elle le ressaisira).
  if (b.prenom !== undefined) data.prenom = String(b.prenom).trim().replace(/\s+/g, " ").slice(0, 80);
  if (b.nom !== undefined) data.nom = String(b.nom).trim().replace(/\s+/g, " ").slice(0, 80);
  if (b.identifiant !== undefined) {
    const identifiant = normaliserIdentifiant(b.identifiant);
    const pb = problemeIdentifiant(identifiant);
    if (pb) return NextResponse.json({ error: pb }, { status: 400 });
    const autre = await prisma.finUtilisateur.findUnique({ where: { identifiant } });
    if (autre && autre.id !== id) return NextResponse.json({ error: `L'identifiant « ${identifiant} » est déjà pris.` }, { status: 409 });
    data.identifiant = identifiant;
  }
  if (b.courriel !== undefined) {
    const courriel = String(b.courriel).trim().toLowerCase().slice(0, 160);
    if (courriel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) return NextResponse.json({ error: "Courriel invalide." }, { status: 400 });
    const autre = courriel ? await prisma.finUtilisateur.findUnique({ where: { courriel } }) : null;
    if (autre && autre.id !== id) return NextResponse.json({ error: "Ce courriel est déjà utilisé par un autre compte." }, { status: 409 });
    data.courriel = courriel || null;
  }
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
  // Réinitialiser :
  //  • « mot_de_passe » : même responsable — mot de passe et Authenticator
  //    effacés ; à la prochaine connexion (identifiant actuel + mot de passe
  //    temporaire), il choisit seulement un nouveau mot de passe.
  //  • « compte » : nouveau responsable — titre, nom, mot de passe et
  //    Authenticator effacés, identifiant d'origine rétabli (ex. min-cultes) ;
  //    la personne refait une vraie première connexion (nom → prenom.nom).
  let identifiantRetabli: string | null = null;
  if (b.reinitialiser === "mot_de_passe" || b.reinitialiser === "compte") {
    if (u.role === "delegue") return NextResponse.json({ error: "Le compte partagé se gère dans les Réglages." }, { status: 400 });
    Object.assign(data, { motDePasse: null, jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null, totpSecret: null, totpActif: false, totpDernier: null });
    // Comptes créés avant ce réglage : un nom déjà renseigné vaut nom confirmé.
    if (b.reinitialiser === "mot_de_passe" && u.prenom && u.nom) data.nomConfirme = true;
    if (b.reinitialiser === "compte") {
      if (id === moi.id) return NextResponse.json({ error: "Vous ne pouvez pas réinitialiser votre propre compte (utilisez « Réinitialiser le mot de passe »)." }, { status: 400 });
      identifiantRetabli = await identifiantDeBase(u);
      const courrielBase = courrielParDefaut(identifiantRetabli);
      const pris = await prisma.finUtilisateur.findUnique({ where: { courriel: courrielBase } });
      Object.assign(data, {
        titre: null,
        prenom: "",
        nom: "",
        nomConfirme: false,
        tutorielVu: false,
        identifiant: identifiantRetabli,
        // Courriel par défaut de l'ancien responsable → celui du compte.
        ...(u.courriel === courrielParDefaut(u.identifiant || "") || !u.courriel ? { courriel: pris && pris.id !== id ? null : courrielBase } : {}),
      });
    }
  }
  // Téléphone perdu/changé : la personne reconfigurera l'Authenticator à sa prochaine connexion.
  if (b.reinitialiserAuthenticator === true) Object.assign(data, { totpSecret: null, totpActif: false, totpDernier: null });
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
  if (data.actif === false || b.reinitialiser) await fermerSessionsDe(id);
  return NextResponse.json({ ok: true, identifiant: identifiantRetabli || undefined });
}

// Renvoyer le lien d'activation / de réinitialisation.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u || !u.actif) return NextResponse.json({ error: "Compte introuvable ou désactivé." }, { status: 404 });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, nomUtilisateur(u), jeton, Boolean(u.motDePasse));
  return NextResponse.json({ ok: true, lien: lienFinances(`/activer/${jeton}`) });
}

// Supprimer un compte (super admin). Un compte qui a fait des demandes ne peut
// pas être supprimé (l'historique financier doit rester) : le désactiver.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  if (id === moi.id) return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  const u = await prisma.finUtilisateur.findUnique({ where: { id }, include: { _count: { select: { demandes: true } } } });
  if (!u) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (u._count.demandes > 0)
    return NextResponse.json(
      { error: `Ce compte a fait ${u._count.demandes} demande(s) : il ne peut pas être supprimé (historique financier). Désactivez-le plutôt.` },
      { status: 409 },
    );
  await prisma.$transaction(async (tx) => {
    // Demandes qui attendaient son approbation : elles passent aux finances.
    await tx.finDemande.updateMany({ where: { approbateurId: id, statut: "attente_leader" }, data: { statut: "attente_finances", approbateurId: null } });
    // Ses départements (s'il administrait un ministère) se retrouvent sans ministère.
    if (u.role === "admin") await tx.finUtilisateur.updateMany({ where: { leaderId: id }, data: { leaderId: null, ministere: null } });
    await tx.finUtilisateur.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
