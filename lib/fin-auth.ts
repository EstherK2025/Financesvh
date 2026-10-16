import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import type { Role } from "./finances";

// ───────────────────────────────────────────────────────────
// Authentification de la plateforme Finances :
//   1) courriel + mot de passe (hash scrypt, verrouillage après 5 échecs)
//   2) code à 6 chiffres envoyé par courriel (double authentification)
//   → session nominative (cookie httpOnly, jeton aléatoire haché en base).
// ───────────────────────────────────────────────────────────

const COOKIE_SESSION = "fin_session";
const COOKIE_2FA = "fin_2fa";
const DUREE_SESSION_MS = 12 * 60 * 60 * 1000; // 12 h
const DUREE_CODE_MS = 10 * 60 * 1000; // 10 min
export const MAX_ECHECS = 5;
export const DUREE_VERROU_MS = 15 * 60 * 1000; // 15 min
const MAX_ESSAIS_CODE = 5;

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function secret() {
  return process.env.FIN_SECRET || process.env.DATABASE_URL || "dev-finances-vh";
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function jetonAleatoire(): string {
  return randomBytes(32).toString("base64url");
}

// ── Mots de passe ──
export function hacherMotDePasse(mdp: string): string {
  const sel = randomBytes(16).toString("hex");
  const hash = scryptSync(mdp, sel, 64).toString("hex");
  return `${sel}:${hash}`;
}

export function verifierMotDePasse(mdp: string, stocke: string | null | undefined): boolean {
  if (!stocke) return false;
  const [sel, hash] = stocke.split(":");
  if (!sel || !hash) return false;
  const attendu = Buffer.from(hash, "hex");
  const calcule = scryptSync(mdp, sel, 64);
  return attendu.length === calcule.length && timingSafeEqual(attendu, calcule);
}

// ── Étape 2 : code par courriel ──
function signer(valeur: string) {
  return createHmac("sha256", secret()).update(valeur).digest("hex");
}

// Crée un code, pose le cookie « en attente de code » et renvoie le code en
// clair (à envoyer par courriel par l'appelant).
export async function creerCode(utilisateurId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Un seul code valide à la fois.
  await prisma.finCode.updateMany({ where: { utilisateurId, utilise: false }, data: { utilise: true } });
  const c = await prisma.finCode.create({
    data: { utilisateurId, codeHash: "", expire: new Date(Date.now() + DUREE_CODE_MS) },
  });
  await prisma.finCode.update({ where: { id: c.id }, data: { codeHash: sha256(c.id + ":" + code) } });
  const jar = await cookies();
  jar.set(COOKIE_2FA, `${c.id}.${signer(c.id)}`, { ...cookieBase, maxAge: DUREE_CODE_MS / 1000 });
  return code;
}

// Code en attente (cookie) → utilisateur concerné, ou null.
export async function codeEnAttente() {
  const jar = await cookies();
  const brut = jar.get(COOKIE_2FA)?.value || "";
  const [id, sig] = brut.split(".");
  if (!id || !sig || sig !== signer(id)) return null;
  const c = await prisma.finCode.findUnique({ where: { id }, include: { utilisateur: true } });
  if (!c || c.utilise || c.expire < new Date() || c.tentatives >= MAX_ESSAIS_CODE) return null;
  return c;
}

export type ResultatCode = { ok: true; utilisateurId: string } | { ok: false; erreur: string };

export async function verifierCode(saisi: string): Promise<ResultatCode> {
  const c = await codeEnAttente();
  if (!c) return { ok: false, erreur: "Code expiré. Reconnectez-vous pour en recevoir un nouveau." };
  const valide = sha256(c.id + ":" + saisi.replace(/\D/g, "")) === c.codeHash;
  if (!valide) {
    const t = c.tentatives + 1;
    await prisma.finCode.update({ where: { id: c.id }, data: { tentatives: t, utilise: t >= MAX_ESSAIS_CODE } });
    const reste = MAX_ESSAIS_CODE - t;
    return {
      ok: false,
      erreur: reste > 0 ? `Code incorrect (${reste} essai${reste > 1 ? "s" : ""} restant${reste > 1 ? "s" : ""}).` : "Trop d'essais. Reconnectez-vous.",
    };
  }
  await prisma.finCode.update({ where: { id: c.id }, data: { utilise: true } });
  const jar = await cookies();
  jar.delete(COOKIE_2FA);
  return { ok: true, utilisateurId: c.utilisateurId };
}

// ── Sessions ──
export async function ouvrirSession(utilisateurId: string) {
  const jeton = jetonAleatoire();
  await prisma.finSession.create({
    data: { jetonHash: sha256(jeton), utilisateurId, expire: new Date(Date.now() + DUREE_SESSION_MS) },
  });
  await prisma.finUtilisateur.update({
    where: { id: utilisateurId },
    data: { derniereConnexion: new Date(), echecs: 0, verrouJusqua: null },
  });
  // Ménage des sessions expirées.
  await prisma.finSession.deleteMany({ where: { expire: { lt: new Date() } } });
  const jar = await cookies();
  jar.set(COOKIE_SESSION, jeton, { ...cookieBase, maxAge: DUREE_SESSION_MS / 1000 });
}

export async function fermerSession() {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  if (jeton) await prisma.finSession.deleteMany({ where: { jetonHash: sha256(jeton) } });
  jar.delete(COOKIE_SESSION);
}

export type UtilisateurCourant = {
  id: string;
  prenom: string;
  nom: string;
  courriel: string;
  role: Role;
  leaderId: string | null;
};

export async function utilisateurCourant(): Promise<UtilisateurCourant | null> {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  if (!jeton) return null;
  const s = await prisma.finSession.findUnique({ where: { jetonHash: sha256(jeton) }, include: { utilisateur: true } });
  if (!s || s.expire < new Date() || !s.utilisateur.actif) return null;
  const u = s.utilisateur;
  return { id: u.id, prenom: u.prenom, nom: u.nom, courriel: u.courriel, role: u.role as Role, leaderId: u.leaderId };
}

// Fermer toutes les sessions d'un compte (désactivation, nouveau mot de passe).
export async function fermerSessionsDe(utilisateurId: string) {
  await prisma.finSession.deleteMany({ where: { utilisateurId } });
}

// ── Lien d'activation / réinitialisation ──
// Renvoie le jeton en clair (à mettre dans le lien du courriel).
export async function creerJetonCompte(utilisateurId: string, joursValidite = 7): Promise<string> {
  const jeton = jetonAleatoire();
  await prisma.finUtilisateur.update({
    where: { id: utilisateurId },
    data: { jetonHash: sha256(jeton), jetonExpire: new Date(Date.now() + joursValidite * 86400_000) },
  });
  return jeton;
}

export async function utilisateurParJeton(jeton: string) {
  if (!jeton) return null;
  const u = await prisma.finUtilisateur.findUnique({ where: { jetonHash: sha256(jeton) } });
  if (!u || !u.actif || !u.jetonExpire || u.jetonExpire < new Date()) return null;
  return u;
}

// Mot de passe d'installation (création du tout premier super admin).
export function motDePasseInstallationValide(saisi: string): boolean {
  // En production, FIN_SETUP_PASSWORD est obligatoire (sinon installation bloquée).
  const attendu = process.env.FIN_SETUP_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "installation");
  if (!attendu) return false;
  const a = Buffer.from(sha256(saisi));
  const b = Buffer.from(sha256(attendu));
  return timingSafeEqual(a, b);
}
