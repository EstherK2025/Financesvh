import { headers } from "next/headers";
import { prisma } from "./prisma";

// ───────────────────────────────────────────────────────────
// Sécurité : limitation des tentatives (stockée en base, donc partagée entre
// toutes les instances du serveur) et journal de sécurité.
// ───────────────────────────────────────────────────────────

export type Regle = { max: number; fenetreMs: number; blocageMs: number };

const MIN = 60_000;
export const REGLES = {
  // Mot de passe : 5 échecs par identifiant, 20 par adresse IP, en 15 min → blocage 15 min.
  connexionId: { max: 5, fenetreMs: 15 * MIN, blocageMs: 15 * MIN },
  connexionIp: { max: 20, fenetreMs: 15 * MIN, blocageMs: 15 * MIN },
  // Codes Authenticator : 10 échecs par IP en 15 min (le compte, lui, se verrouille après 5).
  codeIp: { max: 10, fenetreMs: 15 * MIN, blocageMs: 15 * MIN },
  // Mot de passe oublié : 3 demandes par identifiant, 10 par IP, par heure.
  oublieId: { max: 3, fenetreMs: 60 * MIN, blocageMs: 60 * MIN },
  oublieIp: { max: 10, fenetreMs: 60 * MIN, blocageMs: 60 * MIN },
  // Liens d'activation, première connexion, installation : 10 échecs par IP par heure.
  lienIp: { max: 10, fenetreMs: 60 * MIN, blocageMs: 60 * MIN },
} satisfies Record<string, Regle>;

// Adresse IP du visiteur (fournie par Vercel dans x-forwarded-for).
export async function ipClient(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "inconnue").trim().slice(0, 64);
}

// Minutes d'attente restantes si l'une des clés est bloquée, sinon 0.
export async function bloque(cles: string[]): Promise<number> {
  const lignes = await prisma.finTentative.findMany({ where: { cle: { in: cles }, bloqueJusqua: { gt: new Date() } } });
  if (lignes.length === 0) return 0;
  const fin = Math.max(...lignes.map((l) => l.bloqueJusqua!.getTime()));
  return Math.max(1, Math.ceil((fin - Date.now()) / MIN));
}

// Compte une tentative (échec, ou demande pour « mot de passe oublié »).
// Renvoie true si une des clés vient d'atteindre sa limite.
export async function compter(entrees: [cle: string, regle: Regle][]): Promise<boolean> {
  let atteint = false;
  const maintenant = new Date();
  for (const [cle, r] of entrees) {
    const t = await prisma.finTentative.findUnique({ where: { cle } });
    const nouvelleFenetre = !t || maintenant.getTime() - t.debut.getTime() > r.fenetreMs;
    const compteur = nouvelleFenetre ? 1 : t.compteur + 1;
    const bloquer = compteur >= r.max;
    if (bloquer) atteint = true;
    const data = {
      compteur: bloquer ? 0 : compteur,
      debut: nouvelleFenetre || bloquer ? maintenant : t!.debut,
      bloqueJusqua: bloquer ? new Date(maintenant.getTime() + r.blocageMs) : (t?.bloqueJusqua ?? null),
    };
    await prisma.finTentative.upsert({ where: { cle }, create: { cle, ...data }, update: data });
  }
  // Ménage occasionnel des entrées périmées.
  if (Math.random() < 0.05) await prisma.finTentative.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * MIN) } } }).catch(() => {});
  return atteint;
}

// Réussite : on efface le compteur de ces clés.
export async function effacer(cles: string[]) {
  await prisma.finTentative.deleteMany({ where: { cle: { in: cles } } });
}

export function messageBloque(min: number) {
  return `Trop de tentatives. Réessayez dans ${min} minute${min > 1 ? "s" : ""}.`;
}

// ── Journal de sécurité ──
export const EVENEMENTS: Record<string, string> = {
  connexion: "Connexion réussie",
  connexion_echec: "Mot de passe incorrect",
  connexion_bloquee: "Tentatives bloquées (trop d'essais)",
  code_echec: "Code Authenticator incorrect",
  authenticator_configure: "Authenticator configuré",
  premiere_connexion: "Première connexion terminée",
  mdp_oublie: "Lien « mot de passe oublié » demandé",
  mdp_change: "Mot de passe changé",
  mdp_lien: "Mot de passe choisi par lien",
  deconnexion: "Déconnexion",
  compte_cree: "Compte créé",
  compte_modifie: "Compte modifié",
  compte_reinitialise: "Compte ou mot de passe réinitialisé",
  compte_supprime: "Compte supprimé",
  reglage_modifie: "Réglage modifié",
  purge: "Toutes les demandes supprimées",
  export: "Export des demandes",
  suppression_demandee: "Suppression d'un justificatif demandée",
  suppression_autorisee: "Suppression d'un justificatif autorisée",
  suppression_refusee: "Suppression d'un justificatif refusée ou annulée",
  piece_supprimee: "Justificatif supprimé (3 autorisations)",
};

export async function journaliser(
  evenement: keyof typeof EVENEMENTS,
  info: { utilisateurId?: string | null; identifiant?: string | null; detail?: string | null } = {},
) {
  try {
    await prisma.finJournal.create({
      data: {
        evenement,
        utilisateurId: info.utilisateurId || null,
        identifiant: info.identifiant ? String(info.identifiant).slice(0, 160) : null,
        ip: await ipClient().catch(() => null),
        detail: info.detail ? String(info.detail).slice(0, 500) : null,
      },
    });
    // On garde un an d'historique.
    if (Math.random() < 0.02) await prisma.finJournal.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 24 * 60 * MIN) } } });
  } catch {
    /* le journal ne doit jamais empêcher l'action */
  }
}
