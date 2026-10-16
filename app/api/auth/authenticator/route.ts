import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { compteEnAttente2FA, echecCode, fermerAttente2FA, ouvrirSession } from "@/lib/fin-auth";
import { lienOtpauth, nouveauSecret, secretLisible, verifierTotp } from "@/lib/totp";

// Premier passage avec la double authentification activée : configuration de
// l'application Authenticator.
//  GET  → QR code à scanner + clé pour la saisie manuelle
//  POST → { code } : premier code de l'application → Authenticator activé, connecté.
export async function GET() {
  const u = await compteEnAttente2FA();
  if (!u || u.totpActif) return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  // La clé reste la même tant que l'enrôlement n'est pas terminé (rechargement de page).
  const secret = u.totpSecret || nouveauSecret();
  if (!u.totpSecret) await prisma.finUtilisateur.update({ where: { id: u.id }, data: { totpSecret: secret } });
  const lien = lienOtpauth(secret, u.identifiant || u.courriel || u.id);
  const qr = await QRCode.toDataURL(lien, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  return NextResponse.json({ qr, cle: secretLisible(secret), lien }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const u = await compteEnAttente2FA();
  if (!u || u.totpActif || !u.totpSecret) return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const pas = verifierTotp(u.totpSecret, String(b.code || ""), null);
  if (pas === null) return NextResponse.json({ error: await echecCode(u) }, { status: 401 });
  await prisma.finUtilisateur.update({ where: { id: u.id }, data: { totpActif: true, totpDernier: pas, echecs: 0 } });
  await fermerAttente2FA();
  await ouvrirSession(u.id);
  return NextResponse.json({ ok: true });
}
