import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/fin-auth";
import { courrielTest } from "@/lib/fin-email";
import { prisma } from "@/lib/prisma";

// Envoie un courriel de test (super administrateur) et renvoie son résultat.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const to = String(b.to || "").trim().toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Adresse courriel invalide." }, { status: 400 });
  await courrielTest(to);
  const r = await prisma.finCourriel.findFirst({ where: { destinataire: to }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, statut: r?.statut, erreur: r?.erreur });
}
