import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { journaliser } from "@/lib/fin-securite";
import { AUTORISATIONS_REQUISES } from "@/lib/fin-suppressions";
import { nomUtilisateur } from "@/lib/finances";

// Suite d'une demande de suppression (super administrateurs) :
// { action: "autoriser" | "refuser" | "annuler" }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const s = await prisma.finSuppression.findUnique({ where: { id } });
  if (!s || s.statut !== "en_attente") return NextResponse.json({ error: "Cette demande de suppression n'est plus en attente." }, { status: 409 });

  if (b.action === "annuler" || b.action === "refuser") {
    if (b.action === "annuler" && s.demandeurId !== moi.id) return NextResponse.json({ error: "Seule la personne qui l'a demandée peut l'annuler." }, { status: 403 });
    if (b.action === "refuser" && s.demandeurId === moi.id) return NextResponse.json({ error: "Utilisez « Annuler » pour votre propre demande." }, { status: 400 });
    const statut = b.action === "annuler" ? "annulee" : "refusee";
    const r = await prisma.finSuppression.updateMany({ where: { id, statut: "en_attente" }, data: { statut, refusParId: moi.id, termineeLe: new Date() } });
    if (r.count === 0) return NextResponse.json({ error: "Cette demande de suppression n'est plus en attente." }, { status: 409 });
    await prisma.finHistorique.create({
      data: { demandeId: s.demandeId, auteurId: moi.id, action: "suppression_refusee", commentaire: `${s.pieceNom} — ${statut === "annulee" ? "demande annulée" : "suppression refusée"}` },
    });
    await journaliser("suppression_refusee", { utilisateurId: moi.id, detail: `${s.pieceNom} (${statut})` });
    return NextResponse.json({ ok: true, statut });
  }

  if (b.action !== "autoriser") return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  if (s.autorisations.includes(moi.id)) return NextResponse.json({ error: "Vous avez déjà autorisé cette suppression." }, { status: 400 });
  // Ajout atomique de l'autorisation, puis suppression quand le compte y est.
  const resultat = await prisma.$transaction(async (tx) => {
    const r = await tx.finSuppression.updateMany({
      where: { id, statut: "en_attente", NOT: { autorisations: { has: moi.id } } },
      data: { autorisations: { push: moi.id } },
    });
    if (r.count === 0) return null;
    const maj = await tx.finSuppression.findUniqueOrThrow({ where: { id } });
    const uniques = [...new Set(maj.autorisations)];
    if (uniques.length < AUTORISATIONS_REQUISES) return { effectuee: false, nb: uniques.length };
    await tx.finPiece.deleteMany({ where: { id: maj.pieceId } });
    await tx.finSuppression.update({ where: { id }, data: { statut: "effectuee", termineeLe: new Date() } });
    const noms = (await tx.finUtilisateur.findMany({ where: { id: { in: uniques } } })).map(nomUtilisateur).join(", ");
    await tx.finHistorique.create({
      data: { demandeId: maj.demandeId, auteurId: moi.id, action: "piece_supprimee", commentaire: `${maj.pieceNom} — ${maj.motif} — autorisée par ${noms}` },
    });
    return { effectuee: true, nb: uniques.length };
  });
  if (!resultat) return NextResponse.json({ error: "Cette demande de suppression n'est plus en attente." }, { status: 409 });
  await journaliser(resultat.effectuee ? "piece_supprimee" : "suppression_autorisee", {
    utilisateurId: moi.id,
    detail: `${s.pieceNom} (${resultat.nb}/${AUTORISATIONS_REQUISES})`,
  });
  return NextResponse.json({ ok: true, ...resultat });
}
