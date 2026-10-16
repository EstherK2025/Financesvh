import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compteEnAttente2FA, echecCode, fermerAttente2FA, ouvrirSession } from "@/lib/fin-auth";
import { verifierTotp } from "@/lib/totp";

// Étape 2 : code à 6 chiffres affiché par l'application Authenticator.
export async function POST(req: Request) {
  const u = await compteEnAttente2FA();
  if (!u || !u.totpActif || !u.totpSecret)
    return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const pas = verifierTotp(u.totpSecret, String(b.code || ""), u.totpDernier);
  if (pas === null) return NextResponse.json({ error: await echecCode(u) }, { status: 401 });
  await prisma.finUtilisateur.update({ where: { id: u.id }, data: { totpDernier: pas } });
  await fermerAttente2FA();
  await ouvrirSession(u.id);
  return NextResponse.json({ ok: true });
}
