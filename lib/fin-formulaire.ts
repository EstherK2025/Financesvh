import { CATEGORIES, MODES_PAIEMENT, PIECES, TYPES, parseMontant } from "./finances";

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

export function lireChamps(fd: FormData): { ok: true; champs: ChampsDemande } | { ok: false; erreur: string } {
  const type = texte(fd, "type", 20);
  if (!(type in TYPES)) return { ok: false, erreur: "Type de demande invalide." };
  const categorie = texte(fd, "categorie", 80);
  if (!(CATEGORIES as readonly string[]).includes(categorie)) return { ok: false, erreur: "Choisissez une catégorie." };
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

export async function lireFichiers(fd: FormData): Promise<{ ok: true; fichiers: FichierRecu[] } | { ok: false; erreur: string }> {
  const fichiers: FichierRecu[] = [];
  let total = 0;
  for (const v of fd.getAll("pieces")) {
    if (typeof v === "string" || v.size === 0) continue;
    const typeMime = v.type || "application/octet-stream";
    if (!(PIECES.types as readonly string[]).includes(typeMime))
      return { ok: false, erreur: `Format non accepté : ${v.name} (PDF ou photo uniquement).` };
    total += v.size;
    if (total > PIECES.maxParRequete) return { ok: false, erreur: "Pièces jointes trop lourdes (4 Mo maximum au total)." };
    fichiers.push({ nom: v.name.slice(0, 160) || "piece", typeMime, taille: v.size, donnees: new Uint8Array(await v.arrayBuffer()) });
  }
  if (fichiers.length > PIECES.maxFichiers) return { ok: false, erreur: `${PIECES.maxFichiers} fichiers maximum.` };
  return { ok: true, fichiers };
}
