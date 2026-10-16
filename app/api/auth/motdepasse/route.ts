import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fermerSessionsDe, hacherMotDePasse, ouvrirSession, utilisateurCourant, verifierMotDePasse } from "@/lib/fin-auth";
import { problemeMotDePasse } from "@/lib/finances";

// Changer son mot de passe (connecté). Ferme les autres sessions.
export async function POST(req: Request) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const u = await prisma.finUtilisateur.findUnique({ where: { id: moi.id } });
  if (!u || !verifierMotDePasse(String(b.actuel || ""), u.motDePasse))
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  const nouveau = String(b.nouveau || "");
  const pb = problemeMotDePasse(nouveau);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });
  await prisma.finUtilisateur.update({ where: { id: u.id }, data: { motDePasse: hacherMotDePasse(nouveau) } });
  await fermerSessionsDe(u.id);
  await ouvrirSession(u.id);
  return NextResponse.json({ ok: true });
}
