import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { sansAccents, type Role } from "./finances";

// ───────────────────────────────────────────────────────────
// Authentification de la plateforme Finances :
//   1) identifiant (ou courriel) + mot de passe (hash scrypt, verrouillage après 5 échecs)
//   2) si activée (Réglages) : code à 6 chiffres de l'application Authenticator
//   → session nominative (cookie httpOnly, jeton aléatoire haché en base).
// ───────────────────────────────────────────────────────────

const COOKIE_SESSION = "fin_session";
const COOKIE_2FA = "fin_2fa";
const COOKIE_PREMIERE = "fin_premiere";
const DUREE_PREMIERE_MS = 30 * 60 * 1000; // 30 min pour choisir son mot de passe
const DUREE_SESSION_MS = 12 * 60 * 60 * 1000; // 12 h
const DUREE_CODE_MS = 10 * 60 * 1000; // 10 min pour saisir le code Authenticator
export const MAX_ECHECS = 5;
export const DUREE_VERROU_MS = 15 * 60 * 1000; // 15 min

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

function signer(valeur: string) {
  return createHmac("sha256", secret()).update(valeur).digest("hex");
}

// ── Étape 2 : code de l'application Authenticator ──
// Après le mot de passe, ce cookie signé mémorise le compte pendant 10 min, le
// temps de saisir le code (ou de scanner le QR code au premier passage).
export async function ouvrirAttente2FA(utilisateurId: string) {
  const jar = await cookies();
  const expire = Date.now() + DUREE_CODE_MS;
  const valeur = `${utilisateurId}.${expire}`;
  jar.set(COOKIE_2FA, `${valeur}.${signer("2fa:" + valeur)}`, { ...cookieBase, maxAge: DUREE_CODE_MS / 1000 });
}

export async function compteEnAttente2FA() {
  const jar = await cookies();
  const [id, expire, sig] = (jar.get(COOKIE_2FA)?.value || "").split(".");
  if (!id || !expire || !sig || sig !== signer(`2fa:${id}.${expire}`) || Number(expire) < Date.now()) return null;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  if (!u || !u.actif || !u.motDePasse) return null;
  if (u.verrouJusqua && u.verrouJusqua > new Date()) return null;
  return u;
}

export async function fermerAttente2FA() {
  const jar = await cookies();
  jar.delete(COOKIE_2FA);
}

// Code erroné : compte dans les échecs (verrouillage 15 min après 5).
export async function echecCode(u: { id: string; echecs: number }): Promise<string> {
  const echecs = u.echecs + 1;
  if (echecs >= MAX_ECHECS) {
    await prisma.finUtilisateur.update({ where: { id: u.id }, data: { echecs: 0, verrouJusqua: new Date(Date.now() + DUREE_VERROU_MS) } });
    await fermerAttente2FA();
    return "Trop d'essais : compte verrouillé 15 minutes.";
  }
  await prisma.finUtilisateur.update({ where: { id: u.id }, data: { echecs } });
  const reste = MAX_ECHECS - echecs;
  return `Code incorrect (${reste} essai${reste > 1 ? "s" : ""} restant${reste > 1 ? "s" : ""}). Vérifiez l'heure de votre téléphone.`;
}

// ── Première connexion (mot de passe temporaire universel) ──
// Après le mot de passe temporaire, la personne doit choisir son propre mot de
// passe ; ce cookie signé mémorise le compte concerné pendant 30 min.
export async function ouvrirPremiere(utilisateurId: string) {
  const jar = await cookies();
  const expire = Date.now() + DUREE_PREMIERE_MS;
  const valeur = `${utilisateurId}.${expire}`;
  jar.set(COOKIE_PREMIERE, `${valeur}.${signer("premiere:" + valeur)}`, { ...cookieBase, maxAge: DUREE_PREMIERE_MS / 1000 });
}

export async function comptePremiere() {
  const jar = await cookies();
  const [id, expire, sig] = (jar.get(COOKIE_PREMIERE)?.value || "").split(".");
  if (!id || !expire || !sig || sig !== signer(`premiere:${id}.${expire}`) || Number(expire) < Date.now()) return null;
  const u = await prisma.finUtilisateur.findUnique({ where: { id } });
  return u && u.actif && !u.motDePasse ? u : null;
}

export async function fermerPremiere() {
  const jar = await cookies();
  jar.delete(COOKIE_PREMIERE);
}

export function egalConstant(a: string, b: string): boolean {
  const x = Buffer.from(sha256(a));
  const y = Buffer.from(sha256(b));
  return timingSafeEqual(x, y);
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
  titre: string | null;
  prenom: string;
  nom: string;
  identifiant: string | null;
  courriel: string | null;
  role: Role;
  leaderId: string | null;
  ministere: string | null;
  departement: string | null;
};

export async function utilisateurCourant(): Promise<UtilisateurCourant | null> {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  if (!jeton) return null;
  const s = await prisma.finSession.findUnique({ where: { jetonHash: sha256(jeton) }, include: { utilisateur: true } });
  if (!s || s.expire < new Date() || !s.utilisateur.actif) return null;
  const u = s.utilisateur;
  return { id: u.id, titre: u.titre, prenom: u.prenom, nom: u.nom, identifiant: u.identifiant, courriel: u.courriel, role: u.role as Role, leaderId: u.leaderId, ministere: u.ministere, departement: u.departement };
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

// Retrouve un compte à partir de ce que la personne a saisi : identifiant
// (ex. « estherk ») ou adresse courriel.
export async function trouverCompte(saisie: unknown) {
  // Accents tapés ignorés (« Joël » → « joel »).
  const v = sansAccents(String(saisie ?? "").trim()).toLowerCase();
  if (!v) return null;
  if (v.includes("@")) return prisma.finUtilisateur.findUnique({ where: { courriel: v } });
  const exact = await prisma.finUtilisateur.findUnique({ where: { identifiant: v } });
  if (exact) return exact;
  // Identifiant tapé sans accents (« marie-eve.cote » pour « marie-ève.côté »).
  const cible = sansAccents(v);
  const comptes = await prisma.finUtilisateur.findMany({ where: { identifiant: { not: null } }, select: { id: true, identifiant: true } });
  const trouve = comptes.filter((c) => sansAccents(c.identifiant!) === cible);
  return trouve.length === 1 ? prisma.finUtilisateur.findUnique({ where: { id: trouve[0].id } }) : null;
}
