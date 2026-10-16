import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// Téléverser (POST multipart « logo ») ou retirer (DELETE) le logo.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  const fd = await req.formData().catch(() => null);
  const f = fd?.get("logo");
  if (!f || typeof f === "string" || f.size === 0) return NextResponse.json({ error: "Choisissez une image." }, { status: 400 });
  if (!TYPES.includes(f.type)) return NextResponse.json({ error: "Format accepté : PNG, JPG, WebP ou SVG." }, { status: 400 });
  if (f.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Image trop lourde (2 Mo maximum)." }, { status: 400 });
  const donnees = new Uint8Array(await f.arrayBuffer());
  await prisma.finReglage.upsert({
    where: { cle: "logo" },
    create: { cle: "logo", donnees, typeMime: f.type },
    update: { donnees, typeMime: f.type },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return NextResponse.json({ error: "Réservé au super administrateur." }, { status: 403 });
  await prisma.finReglage.deleteMany({ where: { cle: "logo" } });
  return NextResponse.json({ ok: true });
}
