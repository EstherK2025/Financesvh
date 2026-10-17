import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { approbateurPour, notifier, statutInitial } from "@/lib/fin-demandes";
import { lireChamps, lireFichiers } from "@/lib/fin-formulaire";

// Nouvelle demande (multipart) : champs + pièces jointes.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (moi.role === "delegue") return NextResponse.json({ error: "Ce compte sert uniquement à approuver." }, { status: 403 });

  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Formulaire invalide (fichiers trop lourds ?)." }, { status: 400 });
  const c = lireChamps(fd);
  if (!c.ok) return NextResponse.json({ error: c.erreur }, { status: 400 });
  const f = await lireFichiers(fd);
  if (!f.ok) return NextResponse.json({ error: f.erreur }, { status: 400 });
  if (c.champs.type === "remboursement" && f.fichiers.length === 0)
    return NextResponse.json({ error: "Un remboursement exige la facture (photo ou PDF)." }, { status: 400 });

  const approbateurId = await approbateurPour(moi, String(fd.get("destinataireId") || "") || null);
  const d = await prisma.finDemande.create({
    data: {
      ...c.champs,
      statut: statutInitial(approbateurId),
      demandeurId: moi.id,
      approbateurId,
      ministere: moi.ministere,
      departement: moi.departement,
      pieces: { create: f.fichiers },
      historique: { create: { auteurId: moi.id, action: "soumise" } },
    },
  });
  await notifier(d.id, undefined, true);
  return NextResponse.json({ ok: true, id: d.id });
}
