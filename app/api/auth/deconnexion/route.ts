import { NextResponse } from "next/server";
import { fermerSession, utilisateurCourant } from "@/lib/fin-auth";
import { journaliser } from "@/lib/fin-securite";

export async function POST() {
  const moi = await utilisateurCourant();
  if (moi) await journaliser("deconnexion", { utilisateurId: moi.id });
  await fermerSession();
  return NextResponse.json({ ok: true });
}
