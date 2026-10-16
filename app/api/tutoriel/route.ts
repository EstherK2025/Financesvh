import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";

// Tutoriel de bienvenue terminé ou passé : il ne s'affichera plus tout seul
// (il reste disponible dans la page Guide).
export async function POST() {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  await prisma.finUtilisateur.update({ where: { id: moi.id }, data: { tutorielVu: true } });
  return NextResponse.json({ ok: true });
}
