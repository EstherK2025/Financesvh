import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";

// Supprimer TOUTES les demandes (annulées ou non), avec leurs pièces jointes et
// leur historique. Super administrateur, confirmation « SUPPRIMER » obligatoire.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (b.confirmation !== "SUPPRIMER") return NextResponse.json({ error: "Tapez SUPPRIMER pour confirmer." }, { status: 400 });
  const r = await prisma.finDemande.deleteMany({});
  return NextResponse.json({ ok: true, supprimees: r.count });
}
