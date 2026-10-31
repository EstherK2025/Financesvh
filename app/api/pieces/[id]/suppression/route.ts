import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { journaliser } from "@/lib/fin-securite";
import { AUTORISATIONS_REQUISES, nbSuperAdminsActifs } from "@/lib/fin-suppressions";
import { courrielAutorisationSuppression } from "@/lib/fin-email";
import { nomUtilisateur, reference } from "@/lib/finances";

// Demander la suppression d'une pièce jointe (super administrateur).
// { motif, confirmation: "SUPPRIMER" } → en attente de 2 autres autorisations.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (b.confirmation !== "SUPPRIMER") return NextResponse.json({ error: "Tapez SUPPRIMER pour confirmer." }, { status: 400 });
  const motif = String(b.motif || "").trim().slice(0, 500);
  if (motif.length < 5) return NextResponse.json({ error: "Expliquez pourquoi ce fichier doit être supprimé." }, { status: 400 });
  const piece = await prisma.finPiece.findUnique({ where: { id }, select: { id: true, nom: true, demandeId: true, demande: { select: { numero: true } } } });
  if (!piece) return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  if ((await nbSuperAdminsActifs()) < AUTORISATIONS_REQUISES)
    return NextResponse.json(
      { error: `Il faut au moins ${AUTORISATIONS_REQUISES} super administrateurs actifs pour supprimer un justificatif (autorisation de ${AUTORISATIONS_REQUISES} personnes).` },
      { status: 400 },
    );
  if (await prisma.finSuppression.findFirst({ where: { pieceId: id, statut: "en_attente" } }))
    return NextResponse.json({ error: "Une suppression de ce fichier attend déjà des autorisations." }, { status: 409 });
  const s = await prisma.finSuppression.create({
    data: { demandeId: piece.demandeId, pieceId: id, pieceNom: piece.nom, motif, demandeurId: moi.id, autorisations: [moi.id] },
  });
  await prisma.finHistorique.create({
    data: { demandeId: piece.demandeId, auteurId: moi.id, action: "suppression_demandee", commentaire: `${piece.nom} — ${motif}` },
  });
  await journaliser("suppression_demandee", { utilisateurId: moi.id, detail: `${reference(piece.demande.numero)} · ${piece.nom} · ${motif}` });
  const autres = await prisma.finUtilisateur.findMany({ where: { role: "superadmin", actif: true, id: { not: moi.id } } });
  await Promise.all(
    autres.map((u) => courrielAutorisationSuppression(u.courriel, nomUtilisateur(u), { demandeId: piece.demandeId, numero: piece.demande.numero, fichier: piece.nom, motif, par: nomUtilisateur(moi) })),
  );
  return NextResponse.json({ ok: true, id: s.id });
}
