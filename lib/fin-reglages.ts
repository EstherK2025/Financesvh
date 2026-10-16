import { randomInt } from "crypto";
import { prisma } from "./prisma";

// ───────────────────────────────────────────────────────────
// Réglages modifiables depuis la plateforme (super administrateur).
// ───────────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I

// Mot de passe temporaire universel : sert UNIQUEMENT à la première connexion
// d'un compte qui n'a pas encore choisi son mot de passe. Généré au hasard la
// première fois, puis affiché et modifiable dans la plateforme.
export async function mdpTemporaire(): Promise<string> {
  const r = await prisma.finReglage.findUnique({ where: { cle: "mdp_temporaire" } });
  if (r?.texte) return r.texte;
  const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const valeur = `VH-${code}`;
  await prisma.finReglage.upsert({ where: { cle: "mdp_temporaire" }, create: { cle: "mdp_temporaire", texte: valeur }, update: {} });
  return (await prisma.finReglage.findUnique({ where: { cle: "mdp_temporaire" } }))!.texte!;
}

export async function changerMdpTemporaire(valeur: string) {
  await prisma.finReglage.upsert({ where: { cle: "mdp_temporaire" }, create: { cle: "mdp_temporaire", texte: valeur }, update: { texte: valeur } });
}

export async function logo() {
  return prisma.finReglage.findUnique({ where: { cle: "logo" } });
}

// Double authentification (application Authenticator) : DÉSACTIVÉE par
// défaut ; le super administrateur l'active dans Réglages.
export async function doubleAuthActive(): Promise<boolean> {
  const r = await prisma.finReglage.findUnique({ where: { cle: "double_auth" } });
  return r?.texte === "oui";
}

export async function changerDoubleAuth(active: boolean) {
  const texte = active ? "oui" : "non";
  await prisma.finReglage.upsert({ where: { cle: "double_auth" }, create: { cle: "double_auth", texte }, update: { texte } });
}
