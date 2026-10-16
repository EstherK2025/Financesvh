import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { actionsPossibles, notifier } from "@/lib/fin-demandes";

// Décision sur une demande : { action: "approuver"|"refuser"|"payer"|"annuler", commentaire?, reference? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const commentaire = String(b.commentaire || "").trim().slice(0, 1000) || null;

  const d = await prisma.finDemande.findUnique({ where: { id } });
  if (!d) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  const peut = actionsPossibles(moi, d);

  let nouveau: string;
  let histo: string;
  const data: Record<string, unknown> = {};
  switch (action) {
    case "approuver":
      if (!peut.approuver) return interdit();
      nouveau = d.statut === "attente_leader" ? "attente_finances" : "approuvee";
      histo = d.statut === "attente_leader" ? "approuvee_leader" : "approuvee_finances";
      break;
    case "refuser":
      if (!peut.refuser) return interdit();
      if (!commentaire) return NextResponse.json({ error: "Indiquez le motif du refus." }, { status: 400 });
      nouveau = "a_reviser";
      histo = "refusee";
      data.motifRefus = commentaire;
      break;
    case "payer":
      if (!peut.payer) return interdit();
      nouveau = "payee";
      histo = "payee";
      data.payeLe = new Date();
      data.referencePaiement = String(b.reference || "").trim().slice(0, 120) || null;
      break;
    case "annuler":
      if (!peut.annuler) return interdit();
      nouveau = "annulee";
      histo = "annulee";
      break;
    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  // Mise à jour conditionnelle : si quelqu'un a décidé entre-temps, on refuse.
  const ok = await prisma.$transaction(async (tx) => {
    const r = await tx.finDemande.updateMany({ where: { id, statut: d.statut }, data: { ...data, statut: nouveau } });
    if (r.count === 0) return false;
    await tx.finHistorique.create({ data: { demandeId: id, auteurId: moi.id, action: histo, commentaire } });
    return true;
  });
  if (!ok) return NextResponse.json({ error: "La demande a déjà été traitée. Rechargez la page." }, { status: 409 });
  await notifier(id, action === "refuser" ? commentaire || undefined : undefined);
  return NextResponse.json({ ok: true });
}

function interdit() {
  return NextResponse.json({ error: "Action non autorisée pour cette demande." }, { status: 403 });
}
