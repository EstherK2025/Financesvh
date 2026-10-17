import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { lireFichiers } from "@/lib/fin-formulaire";
import { courrielJustificatifsRecus } from "@/lib/fin-email";
import { nomUtilisateur } from "@/lib/finances";

// Décaissement approuvé par les finances : justificatifs (preuves de dépense).
//  • POST (demandeur) : ajoute les factures / reçus → les rappels s'arrêtent.
//  • PATCH (finances) : { recus: true } justificatifs remis autrement (en main propre…).
const STATUTS_OK = ["approuvee", "payee"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { id } = await params;
  const d = await prisma.finDemande.findUnique({ where: { id }, include: { demandeur: true } });
  if (!d || d.demandeurId !== moi.id || d.type !== "decaissement" || !STATUTS_OK.includes(d.statut))
    return NextResponse.json({ error: "Action non autorisée pour cette demande." }, { status: 403 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Formulaire invalide (fichiers trop lourds ?)." }, { status: 400 });
  const f = await lireFichiers(fd);
  if (!f.ok) return NextResponse.json({ error: f.erreur }, { status: 400 });
  if (f.fichiers.length === 0) return NextResponse.json({ error: "Ajoutez au moins une facture ou un reçu (photo ou PDF)." }, { status: 400 });
  const commentaire = String(fd.get("commentaire") || "").trim().slice(0, 500) || null;
  await prisma.$transaction([
    prisma.finPiece.createMany({ data: f.fichiers.map((x) => ({ ...x, demandeId: id, justificatif: true })) }),
    prisma.finDemande.update({ where: { id }, data: { justificatifsLe: d.justificatifsLe ?? new Date() } }),
    prisma.finHistorique.create({ data: { demandeId: id, auteurId: moi.id, action: "justificatifs", commentaire: commentaire || `${f.fichiers.length} fichier(s)` } }),
  ]);
  const info = { id, numero: d.numero, type: d.type, categorie: d.categorie, objet: d.objet, montant: d.montant, statut: d.statut, demandeurNom: nomUtilisateur(d.demandeur) };
  const finances = await prisma.finUtilisateur.findMany({ where: { role: "superadmin", actif: true, id: { not: moi.id } } });
  await Promise.all(finances.map((u) => courrielJustificatifsRecus(u.courriel, nomUtilisateur(u), info)));
  return NextResponse.json({ ok: true });
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé aux finances." }, { status: 403 });
  const { id } = await params;
  const d = await prisma.finDemande.findUnique({ where: { id } });
  if (!d || d.type !== "decaissement" || !STATUTS_OK.includes(d.statut) || d.justificatifsLe)
    return NextResponse.json({ error: "Action non autorisée pour cette demande." }, { status: 400 });
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id }, data: { justificatifsLe: new Date() } }),
    prisma.finHistorique.create({ data: { demandeId: id, auteurId: moi.id, action: "justificatifs_recus" } }),
  ]);
  return NextResponse.json({ ok: true });
}
