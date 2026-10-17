import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// ───────────────────────────────────────────────────────────
// Codes TOTP (RFC 6238) — compatibles Google Authenticator, Microsoft
// Authenticator, 1Password… : HMAC-SHA1, 6 chiffres, toutes les 30 s.
// ───────────────────────────────────────────────────────────

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIODE = 30;

export function nouveauSecret(): string {
  // 20 octets = 160 bits (taille recommandée), encodés en base32.
  const octets = randomBytes(20);
  let bits = "";
  for (const o of octets) bits += o.toString(2).padStart(8, "0");
  let s = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) s += B32[parseInt(bits.slice(i, i + 5), 2)];
  return s;
}

function decoderBase32(s: string): Buffer {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const v = B32.indexOf(c);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const octets: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets);
}

export function codeA(secret: string, compteur: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(compteur));
  const h = createHmac("sha1", decoderBase32(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

export function compteurActuel(maintenant = Date.now()): number {
  return Math.floor(maintenant / 1000 / PERIODE);
}

// Vérifie un code (tolérance ±1 période pour le décalage d'horloge du téléphone).
// Renvoie le compteur accepté, ou null. `dernier` = dernier compteur déjà
// utilisé : un même code ne peut pas servir deux fois.
export function verifierTotp(secret: string, saisi: string, dernier: number | null): number | null {
  const code = saisi.replace(/\D/g, "");
  if (code.length !== 6) return null;
  const c = compteurActuel();
  for (const k of [c - 1, c, c + 1]) {
    if (dernier !== null && k <= dernier) continue;
    if (timingSafeEqual(Buffer.from(codeA(secret, k)), Buffer.from(code))) return k;
  }
  return null;
}

// Lien lu par l'application (contenu du QR code).
export function lienOtpauth(secret: string, compte: string, emetteur = "Portail des dépenses VH"): string {
  const libelle = `${encodeURIComponent(emetteur)}:${encodeURIComponent(compte)}`;
  return `otpauth://totp/${libelle}?secret=${secret}&issuer=${encodeURIComponent(emetteur)}&algorithm=SHA1&digits=6&period=${PERIODE}`;
}

// Clé lisible pour la saisie manuelle : groupes de 4 caractères.
export function secretLisible(secret: string): string {
  return secret.match(/.{1,4}/g)!.join(" ");
}
