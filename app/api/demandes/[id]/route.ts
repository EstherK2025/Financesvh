import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { actionsPossibles, approbateurPour, notifier, statutInitial } from "@/lib/fin-demandes";
import { lireChamps, lireFichiers } from "@/lib/fin-formulaire";

// Révision d'une demande refusée puis renvoi dans le circuit (multipart).
// Champs « supprimerPieces » : ids des pièces existantes à retirer.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { id } = await params;
  const d = await prisma.finDemande.findUnique({ where: { id }, include: { pieces: { select: { id: true } } } });
  if (!d || !actionsPossibles(moi, d).reviser)
    return NextResponse.json({ error: "Cette demande ne peut pas être modifiée." }, { status: 403 });

  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Formulaire invalide (fichiers trop lourds ?)." }, { status: 400 });
  const c = lireChamps(fd);
  if (!c.ok) return NextResponse.json({ error: c.erreur }, { status: 400 });
  const f = await lireFichiers(fd);
  if (!f.ok) return NextResponse.json({ error: f.erreur }, { status: 400 });

  const aSupprimer = fd.getAll("supprimerPieces").map(String).filter((p) => d.pieces.some((x) => x.id === p));
  const restantes = d.pieces.length - aSupprimer.length + f.fichiers.length;
  if (c.champs.type === "remboursement" && restantes === 0)
    return NextResponse.json({ error: "Un remboursement exige la facture (photo ou PDF)." }, { status: 400 });

  const approbateurId = await approbateurPour(moi, String(fd.get("destinataireId") || "") || null);
  const commentaire = String(fd.get("commentaire") || "").trim().slice(0, 1000) || null;
  const maj = await prisma.$transaction(async (tx) => {
    // Garde : la demande doit toujours être « à réviser » (pas de double envoi).
    const r = await tx.finDemande.updateMany({
      where: { id, statut: "a_reviser", demandeurId: moi.id },
      data: { ...c.champs, statut: statutInitial(approbateurId), approbateurId, motifRefus: null, ministere: moi.ministere, departement: moi.departement },
    });
    if (r.count === 0) return false;
    if (aSupprimer.length) await tx.finPiece.deleteMany({ where: { id: { in: aSupprimer }, demandeId: id } });
    if (f.fichiers.length) await tx.finPiece.createMany({ data: f.fichiers.map((x) => ({ ...x, demandeId: id })) });
    await tx.finHistorique.create({ data: { demandeId: id, auteurId: moi.id, action: "resoumise", commentaire } });
    return true;
  });
  if (!maj) return NextResponse.json({ error: "La demande a changé entre-temps. Rechargez la page." }, { status: 409 });
  await notifier(id, undefined, true);
  return NextResponse.json({ ok: true });
}
