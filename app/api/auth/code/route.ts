import { NextResponse } from "next/server";
import { ouvrirSession, verifierCode } from "@/lib/fin-auth";

// Étape 2 : code reçu par courriel → ouverture de la session.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const r = await verifierCode(String(b.code || ""));
  if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: 401 });
  await ouvrirSession(r.utilisateurId);
  return NextResponse.json({ ok: true });
}
