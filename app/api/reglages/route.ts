import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/fin-auth";
import { changerMdpTemporaire } from "@/lib/fin-reglages";

// Modifier le mot de passe temporaire universel (super administrateur).
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const v = String(b.mdpTemporaire || "").trim();
  if (v.length < 8 || /\s/.test(v)) return NextResponse.json({ error: "8 caractères minimum, sans espace." }, { status: 400 });
  await changerMdpTemporaire(v.slice(0, 60));
  return NextResponse.json({ ok: true });
}
