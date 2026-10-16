// ───────────────────────────────────────────────────────────
// DÉPARTEMENT DES FINANCES — réglages et règles du circuit d'approbation.
// Source unique de vérité : catégories, libellés, statuts.
// Modifiable facilement sans toucher aux écrans.
// ───────────────────────────────────────────────────────────

export const FIN = {
  nom: "Département des finances",
  organisation: "Vases d'Honneur",
  sigle: "VH",
  // Logo de la barre du haut : monogramme VH (public/vh-symbole.png), remplaçable
  // par le super administrateur (Réglages). Logo complet : public/vh-logo.png.
  logo: "/logo",
  logoComplet: "/vh-logo.png",
  contactEmail: "info@eventsevhnb.ca",
} as const;

// Premier compte super admin, proposé à l'installation (crée ensuite les autres).
export const PREMIER_ADMIN = { prenom: "GA", nom: "Maïté", identifiant: "estherk" } as const;

// Courriel des comptes : identifiant@evhnb.ca
export const DOMAINE_COURRIEL = "evhnb.ca";
export function courrielParDefaut(identifiant: string): string {
  return `${identifiant}@${DOMAINE_COURRIEL}`;
}

export function libelleOrg(m: string | null | undefined, d: string | null | undefined): string {
  return [m, d].filter(Boolean).join(" · ");
}

// Catégories de dépenses (👉 ajouter / retirer librement).
export const CATEGORIES = [
  "Location matériel",
  "Hébergement",
  "Location voiture",
  "Repas",
  "Livres",
  "Produits de nettoyage",
] as const;

export const TYPES = {
  decaissement: "Décaissement",
  remboursement: "Remboursement",
} as const;
export type TypeDemande = keyof typeof TYPES;

export const TYPES_AIDE: Record<TypeDemande, string> = {
  decaissement: "Demander des fonds avant une dépense (avance, paiement d'un fournisseur).",
  remboursement: "Se faire rembourser une dépense déjà payée — facture obligatoire.",
};

export const MODES_PAIEMENT = {
  interac: "Virement Interac",
  virement: "Virement bancaire",
  cheque: "Chèque",
  comptant: "Comptant",
} as const;

// 3 niveaux, alignés sur Rapports VH.
export const ROLES = {
  utilisateur: "Utilisateur (département)",
  admin: "Administrateur (ministère)",
  superadmin: "Super administrateur",
} as const;
export type Role = keyof typeof ROLES;

export const STATUTS = {
  attente_leader: "En attente du ministère",
  attente_finances: "En attente des finances",
  approuvee: "Approuvée — à payer",
  payee: "Payée",
  a_reviser: "Refusée — à réviser",
  annulee: "Annulée",
} as const;
export type Statut = keyof typeof STATUTS;

export const ACTIONS_HISTO: Record<string, string> = {
  soumise: "Demande soumise",
  resoumise: "Demande corrigée et renvoyée",
  approuvee_leader: "Approuvée par le ministère",
  approuvee_finances: "Approuvée par les finances",
  refusee: "Refusée — renvoyée pour révision",
  annulee: "Annulée par le demandeur",
  payee: "Paiement effectué",
};

// Pièces jointes : la limite des fonctions Vercel est ~4,5 Mo par requête.
// Les photos sont compressées dans le navigateur avant l'envoi.
export const PIECES = {
  maxParRequete: 4 * 1024 * 1024,
  maxFichiers: 6,
  types: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
} as const;

export function reference(numero: number): string {
  return "FIN-" + String(numero).padStart(4, "0");
}

export function formatMontant(cents: number): string {
  return (cents / 100).toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

// "12,50" | "12.50" | "1 234,5" → 1250 (cents). null si invalide.
export function parseMontant(saisie: unknown): number | null {
  const s = String(saisie ?? "").replace(/[\s $]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 && cents < 100_000_000 ? cents : null;
}

export function nomUtilisateur(u: { prenom: string; nom: string }): string {
  return `${u.prenom} ${u.nom}`.trim();
}

// ── Identifiant (nom d'utilisateur) ──
// 3 à 30 caractères : lettres minuscules, chiffres, point, tiret, souligné.
export function normaliserIdentifiant(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}
export function problemeIdentifiant(id: string): string | null {
  if (!/^[a-z0-9._-]{3,30}$/.test(id))
    return "Identifiant : 3 à 30 caractères (lettres minuscules sans accent, chiffres, point, tiret).";
  return null;
}

// ── Mot de passe sécurisé ──
// 10 caractères minimum, avec majuscule, minuscule et chiffre.
export function problemeMotDePasse(mdp: string): string | null {
  if (mdp.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[a-z]/.test(mdp) || !/[A-Z]/.test(mdp) || !/\d/.test(mdp))
    return "Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.";
  return null;
}

// « ab•••@evhnb.ca » : affiché à l'étape du code, sans révéler toute l'adresse.
export function masquerCourriel(c: string): string {
  const [nom, dom] = c.split("@");
  return `${nom.slice(0, 2)}${"•".repeat(Math.max(1, nom.length - 2))}@${dom}`;
}
