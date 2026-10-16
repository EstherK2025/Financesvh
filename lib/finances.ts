// ───────────────────────────────────────────────────────────
// DÉPARTEMENT DES FINANCES — réglages et règles du circuit d'approbation.
// Source unique de vérité : catégories, libellés, statuts.
// Modifiable facilement sans toucher aux écrans.
// ───────────────────────────────────────────────────────────

export const FIN = {
  nom: "Département des finances",
  organisation: "Vases d'Honneur",
  sigle: "VH",
  // Logo complet Vases d'Honneur : public/vh-logo.png, remplaçable par le super
  // administrateur (Réglages) — servi par /logo.
  logo: "/logo",
  logoComplet: "/logo",
  contactEmail: "info@eventsevhnb.ca",
} as const;

// Premier compte super admin, proposé à l'installation (crée ensuite les autres).
export const PREMIER_ADMIN = { titre: "GA", prenom: "Maïté", nom: "", identifiant: "estherk" } as const;

// Titres par défaut d'une personne (affichés devant son nom : « GA John Doe »).
// La liste se modifie dans Réglages (super administrateur) : voir lib/fin-reglages.ts.
export const TITRES_DEFAUT = ["GA", "AP", "PA", "AE", "AM", "Responsable"];
export function titreDans(liste: string[], t: unknown): string | null {
  const v = String(t ?? "").trim();
  return liste.includes(v) ? v : null;
}

// Signature dessinée : image PNG en data URL, taille raisonnable.
export function signatureValide(s: unknown): string | null {
  const v = String(s ?? "");
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length > 200 && v.length < 400_000 ? v : null;
}

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
  delegue: "Approbateur externe (compte partagé)",
} as const;
// Niveaux attribuables depuis « Utilisateurs » (l'approbateur externe se gère dans Réglages).
export const ROLES_COMPTES = { utilisateur: ROLES.utilisateur, admin: ROLES.admin, superadmin: ROLES.superadmin } as const;
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
  attribuee: "1re approbation réattribuée",
};

// Libellé d'une étape de l'historique (précise l'approbateur externe).
export function libelleAction(h: { action: string; auteur?: { role: string } | null }): string {
  if (h.action === "approuvee_leader" && h.auteur?.role === "delegue") return "Approuvée par l'approbateur externe";
  return ACTIONS_HISTO[h.action] || h.action;
}

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

// Nom affiché d'un compte : le nom de la personne (saisi à sa première
// connexion ou par le super administrateur) ; à défaut, son département ou
// son ministère.
export type NomCompte = { titre?: string | null; prenom: string; nom: string; ministere?: string | null; departement?: string | null };
export function nomUtilisateur(u: NomCompte): string {
  const n = `${u.prenom} ${u.nom}`.trim();
  if (n) return u.titre ? `${u.titre} ${n}` : n;
  if (u.departement) return `Département ${u.departement}`;
  if (u.ministere) return `Ministère ${u.ministere}`;
  return "(nom à compléter)";
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

// « Département Tribus (ministère Intégration) », « Ministère Intégration »…
export function libelleCompte(u: { role: string; ministere?: string | null; departement?: string | null; identifiant?: string | null }): string {
  if (u.role === "admin" && u.ministere) return `Ministère ${u.ministere}`;
  if (u.departement) return `Département ${u.departement}${u.ministere ? ` (ministère ${u.ministere})` : ""}`;
  if (u.role === "superadmin") return "Super administrateur";
  if (u.role === "delegue") return "Approbateur externe";
  return u.identifiant || "Compte";
}

// Identifiant créé à la première connexion : « prenom.nom » (minuscules, sans
// accents ; espaces et autres caractères → tiret). Ex. « Marie-Ève Côté » → « marie-eve.cote ».
function morceauIdentifiant(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function identifiantDepuisNom(prenom: string, nom: string): string {
  const p = morceauIdentifiant(prenom);
  const n = morceauIdentifiant(nom);
  return [p, n].filter(Boolean).join(".").slice(0, 30).replace(/[.-]+$/, "");
}
