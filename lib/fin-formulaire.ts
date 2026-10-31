import { MODES_PAIEMENT, PIECES, TYPES, parseMontant } from "./finances";

// Lecture et validation d'un formulaire de demande (multipart/form-data).

export type ChampsDemande = {
  type: keyof typeof TYPES;
  categorie: string;
  objet: string;
  description: string | null;
  montant: number;
  dateDepense: Date | null;
  beneficiaire: string | null;
  modePaiement: string;
};

export type FichierRecu = { nom: string; typeMime: string; taille: number; donnees: Uint8Array<ArrayBuffer> };

const texte = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

// categoriesOk : catégories proposées (Réglages) + celle déjà enregistrée sur la demande.
export function lireChamps(fd: FormData, categoriesOk: string[]): { ok: true; champs: ChampsDemande } | { ok: false; erreur: string } {
  const type = texte(fd, "type", 20);
  if (!(type in TYPES)) return { ok: false, erreur: "Type de demande invalide." };
  const categorie = texte(fd, "categorie", 80);
  if (!categoriesOk.includes(categorie)) return { ok: false, erreur: "Choisissez une catégorie." };
  const objet = texte(fd, "objet", 160);
  if (!objet) return { ok: false, erreur: "Indiquez l'objet de la demande." };
  const montant = parseMontant(fd.get("montant"));
  if (montant === null) return { ok: false, erreur: "Montant invalide." };
  const modePaiement = texte(fd, "modePaiement", 20) || "interac";
  if (!(modePaiement in MODES_PAIEMENT)) return { ok: false, erreur: "Mode de paiement invalide." };
  const dateBrute = texte(fd, "dateDepense", 10);
  let dateDepense: Date | null = null;
  if (dateBrute) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateBrute)) return { ok: false, erreur: "Date invalide." };
    dateDepense = new Date(dateBrute + "T12:00:00Z");
  }
  return {
    ok: true,
    champs: {
      type: type as ChampsDemande["type"],
      categorie,
      objet,
      description: texte(fd, "description", 2000) || null,
      montant,
      dateDepense,
      beneficiaire: texte(fd, "beneficiaire", 160) || null,
      modePaiement,
    },
  };
}

// Vérifie que le contenu correspond bien au type annoncé (signature du fichier) :
// un fichier renommé en .pdf ou .jpg est refusé.
function contenuConforme(typeMime: string, o: Uint8Array): boolean {
  const debut = (...octets: number[]) => octets.every((b, i) => o[i] === b);
  const texte = (pos: number, t: string) => [...t].every((c, i) => o[pos + i] === c.charCodeAt(0));
  switch (typeMime) {
    case "application/pdf":
      // « %PDF- » au début (tolère quelques octets avant, comme les lecteurs PDF).
      return Array.from({ length: Math.min(1024, Math.max(0, o.length - 5)) }, (_, i) => i).some((i) => texte(i, "%PDF-"));
    case "image/jpeg":
      return debut(0xff, 0xd8, 0xff);
    case "image/png":
      return debut(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp":
      return texte(0, "RIFF") && texte(8, "WEBP");
    case "image/heic":
    case "image/heif":
      return texte(4, "ftyp");
    default:
      return false;
  }
}

export async function lireFichiers(fd: FormData): Promise<{ ok: true; fichiers: FichierRecu[] } | { ok: false; erreur: string }> {
  const fichiers: FichierRecu[] = [];
  let total = 0;
  const toutes = fd.getAll("pieces");
  if (toutes.filter((v) => typeof v !== "string" && v.size > 0).length > PIECES.maxFichiers)
    return { ok: false, erreur: `${PIECES.maxFichiers} fichiers maximum.` };
  for (const v of toutes) {
    if (typeof v === "string" || v.size === 0) continue;
    const typeMime = v.type || "application/octet-stream";
    if (!(PIECES.types as readonly string[]).includes(typeMime))
      return { ok: false, erreur: `Format non accepté : ${v.name} (PDF ou photo uniquement).` };
    total += v.size;
    if (total > PIECES.maxParRequete) return { ok: false, erreur: "Pièces jointes trop lourdes (4 Mo maximum au total)." };
    const donnees = new Uint8Array(await v.arrayBuffer());
    if (!contenuConforme(typeMime, donnees)) return { ok: false, erreur: `Fichier illisible ou format non reconnu : ${v.name.slice(0, 80)}.` };
    // Nom nettoyé (pas de chemin ni de caractères de contrôle).
    const nom = v.name.replace(/[\u0000-\u001f\u007f/\\]/g, "_").slice(0, 160) || "piece";
    fichiers.push({ nom, typeMime, taille: v.size, donnees });
  }
  if (fichiers.length > PIECES.maxFichiers) return { ok: false, erreur: `${PIECES.maxFichiers} fichiers maximum.` };
  return { ok: true, fichiers };
}
