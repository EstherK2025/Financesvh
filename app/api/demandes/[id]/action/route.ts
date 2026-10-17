import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { actionsPossibles, notifier } from "@/lib/fin-demandes";
import { libelleCompte, nomUtilisateur, signatureValide } from "@/lib/finances";

// Décision sur une demande :
// { action: "approuver"|"refuser"|"payer"|"annuler"|"attribuer", commentaire?, reference?,
//   signature? (PNG data URL, obligatoire pour approuver),
//   signataireNom?, signataireFonction?, justification? (obligatoires pour l'approbateur externe),
//   approbateurId? (attribuer) }
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

  // Signataire : la personne connectée, ou — pour le compte partagé d'approbateur
  // externe — l'identité saisie au moment de la décision.
  const externe = moi.role === "delegue";
  const signataire = {
    signataireNom: externe ? String(b.signataireNom || "").trim().slice(0, 120) : nomUtilisateur(moi),
    signataireFonction: externe ? String(b.signataireFonction || "").trim().slice(0, 120) : libelleCompte(moi),
    justification: externe ? String(b.justification || "").trim().slice(0, 1000) || null : null,
  };
  if (externe && (action === "approuver" || action === "refuser")) {
    if (!signataire.signataireNom || !signataire.signataireFonction)
      return NextResponse.json({ error: "Indiquez votre nom complet et votre fonction dans l'église." }, { status: 400 });
    if (!signataire.justification)
      return NextResponse.json({ error: "Expliquez pourquoi c'est vous qui approuvez cette demande." }, { status: 400 });
  }
  let signature: string | null = null;

  let nouveau: string;
  let histo: string;
  const data: Record<string, unknown> = {};
  switch (action) {
    case "approuver":
      if (!peut.approuver) return interdit();
      signature = signatureValide(b.signature);
      if (!signature) return NextResponse.json({ error: "Signez dans le cadre prévu avant d'approuver." }, { status: 400 });
      // Séparation des tâches : la personne qui a donné la 1re approbation ne
      // peut pas donner aussi l'approbation des finances.
      if (d.statut === "attente_finances") {
        const premiere = await prisma.finHistorique.findFirst({ where: { demandeId: id, action: "approuvee_leader" }, orderBy: { createdAt: "desc" } });
        if (premiere?.auteurId === moi.id)
          return NextResponse.json({ error: "Vous avez déjà donné la 1re approbation : l'approbation des finances doit venir d'une autre personne." }, { status: 403 });
      }
      nouveau = d.statut === "attente_leader" ? "attente_finances" : "approuvee";
      histo = d.statut === "attente_leader" ? "approuvee_leader" : "approuvee_finances";
      if (histo === "approuvee_finances") data.approuveeLe = new Date();
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
    case "attribuer": {
      // Super administrateur : confier la 1re approbation à une autre personne
      // (ex. l'approbateur externe), tant que la demande attend cette étape.
      if (moi.role !== "superadmin" || d.statut !== "attente_leader") return interdit();
      const cible = await prisma.finUtilisateur.findUnique({ where: { id: String(b.approbateurId || "") } });
      if (!cible || !cible.actif || cible.id === d.demandeurId || cible.id === moi.id || !["admin", "superadmin", "delegue"].includes(cible.role))
        return NextResponse.json({ error: "Approbateur invalide." }, { status: 400 });
      nouveau = d.statut;
      histo = "attribuee";
      data.approbateurId = cible.id;
      break;
    }
    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  // Mise à jour conditionnelle : si quelqu'un a décidé entre-temps, on refuse.
  const ok = await prisma.$transaction(async (tx) => {
    const r = await tx.finDemande.updateMany({ where: { id, statut: d.statut }, data: { ...data, statut: nouveau } });
    if (r.count === 0) return false;
    const avecSignataire = externe || histo === "approuvee_leader" || histo === "approuvee_finances";
    await tx.finHistorique.create({
      data: {
        demandeId: id,
        auteurId: moi.id,
        action: histo,
        commentaire: histo === "attribuee" ? `1re approbation confiée à ${nomUtilisateur(await tx.finUtilisateur.findUniqueOrThrow({ where: { id: data.approbateurId as string } }))}` : commentaire,
        signature,
        ...(avecSignataire ? signataire : {}),
      },
    });
    return true;
  });
  if (!ok) return NextResponse.json({ error: "La demande a déjà été traitée. Rechargez la page." }, { status: 409 });
  await notifier(id, action === "refuser" ? commentaire || undefined : undefined);
  return NextResponse.json({ ok: true });
}

function interdit() {
  return NextResponse.json({ error: "Action non autorisée pour cette demande." }, { status: 403 });
}
