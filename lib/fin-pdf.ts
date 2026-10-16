import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { ACTIONS_HISTO, FIN, MODES_PAIEMENT, STATUTS, TYPES, formatMontant, libelleCompte, nomUtilisateur, reference, type Statut, type TypeDemande } from "./finances";

// ───────────────────────────────────────────────────────────
// Fiche PDF d'une demande (super administrateur) : à imprimer ou à classer.
// Page de synthèse (noms, montants, approbations, historique, signatures),
// puis les pièces jointes : photos de factures et pages des PDF fournis.
// ───────────────────────────────────────────────────────────

const FUSEAU = "America/Moncton";
const VERT = rgb(0x2d / 255, 0x6a / 255, 0x66 / 255);
const OR = rgb(0xcc / 255, 0xb0 / 255, 0x42 / 255);
const GRIS = rgb(0.42, 0.42, 0.42);
const TRAIT = rgb(0.85, 0.85, 0.85);
const NOIR = rgb(0.07, 0.07, 0.07);
const L = 612; // format Lettre
const H = 792;
const MARGE = 50;

type Personne = { prenom: string; nom: string; ministere?: string | null; departement?: string | null; role: string; identifiant?: string | null; courriel?: string | null };
export type DemandePdf = {
  numero: number;
  type: string;
  categorie: string;
  objet: string;
  description: string | null;
  montant: number;
  dateDepense: Date | null;
  beneficiaire: string | null;
  modePaiement: string;
  statut: string;
  ministere: string | null;
  departement: string | null;
  motifRefus: string | null;
  referencePaiement: string | null;
  payeLe: Date | null;
  createdAt: Date;
  demandeur: Personne;
  approbateur: Personne | null;
  historique: { action: string; commentaire: string | null; createdAt: Date; auteur: Personne | null }[];
  pieces: { nom: string; typeMime: string; donnees: Uint8Array }[];
};

const dateLongue = (d: Date | null) => (d ? d.toLocaleDateString("fr-CA", { timeZone: FUSEAU, day: "numeric", month: "long", year: "numeric" }) : "—");
const dateHeure = (d: Date) => d.toLocaleString("fr-CA", { timeZone: FUSEAU, dateStyle: "long", timeStyle: "short" });

// Les polices standard du PDF ne couvrent que l'alphabet latin (WinAnsi) :
// on remplace ou retire les autres caractères (émojis…).
function nettoyeur(police: PDFFont) {
  const cache = new Map<string, boolean>();
  const ok = (c: string) => {
    if (!cache.has(c)) {
      try {
        police.encodeText(c);
        cache.set(c, true);
      } catch {
        cache.set(c, false);
      }
    }
    return cache.get(c)!;
  };
  return (s: string) =>
    s
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...")
      .replace(/[  ]/g, " ")
      .replace(/ʳᵉ/g, "re")
      .split("")
      .map((c) => (c === "\n" || ok(c) ? c : ""))
      .join("");
}

export async function fichePdf(d: DemandePdf, genereePar: string, logoPng: Uint8Array | null): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const ref = reference(d.numero);
  pdf.setTitle(`${ref} - ${d.objet}`);
  pdf.setAuthor(`${FIN.organisation} - ${FIN.nom}`);
  pdf.setCreationDate(new Date());
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const net = nettoyeur(f);

  let page: PDFPage = pdf.addPage([L, H]);
  let y = H - MARGE;

  const nouvellePage = () => {
    page = pdf.addPage([L, H]);
    y = H - MARGE;
  };
  const place = (h: number) => {
    if (y - h < MARGE + 30) nouvellePage();
  };
  // Découpe un texte en lignes qui tiennent dans la largeur.
  const lignes = (texte: string, police: PDFFont, taille: number, largeur: number) => {
    const out: string[] = [];
    for (const para of net(texte).split("\n")) {
      let ligne = "";
      for (const mot of para.split(/\s+/)) {
        const essai = ligne ? `${ligne} ${mot}` : mot;
        if (police.widthOfTextAtSize(essai, taille) <= largeur) ligne = essai;
        else {
          if (ligne) out.push(ligne);
          ligne = mot;
        }
      }
      out.push(ligne);
    }
    return out;
  };
  const texte = (t: string, x: number, taille = 10, police = f, couleur = NOIR) =>
    page.drawText(net(t), { x, y, size: taille, font: police, color: couleur });
  const titre = (t: string) => {
    place(40);
    y -= 14;
    texte(t.toUpperCase(), MARGE, 9.5, fb, VERT);
    y -= 5;
    page.drawLine({ start: { x: MARGE, y }, end: { x: L - MARGE, y }, thickness: 0.8, color: OR });
    y -= 15;
  };
  // Ligne « étiquette : valeur » (valeur sur plusieurs lignes si besoin).
  const champ = (etiquette: string, valeur: string) => {
    const ls = lignes(valeur || "—", f, 10, L - MARGE * 2 - 140);
    place(14 * ls.length);
    texte(etiquette, MARGE, 9, f, GRIS);
    for (const l of ls) {
      texte(l, MARGE + 140, 10);
      y -= 14;
    }
  };

  // ── En-tête ──
  if (logoPng) {
    try {
      const img = await pdf.embedPng(logoPng);
      const h = 46;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: MARGE, y: y - h + 10, width: w, height: h });
    } catch {
      /* logo illisible : on continue sans */
    }
  }
  texte(FIN.organisation, L - MARGE - fb.widthOfTextAtSize(FIN.organisation, 11), 11, fb, VERT);
  y -= 14;
  texte(FIN.nom, L - MARGE - f.widthOfTextAtSize(FIN.nom, 9.5), 9.5, f, GRIS);
  y -= 34;
  page.drawRectangle({ x: MARGE, y: y - 8, width: L - MARGE * 2, height: 3, color: VERT });
  y -= 34;
  texte(`Demande ${ref}`, MARGE, 20, fb);
  const statut = STATUTS[d.statut as Statut] || d.statut;
  texte(statut, L - MARGE - fb.widthOfTextAtSize(net(statut), 11), 11, fb, d.statut === "payee" ? VERT : NOIR);
  y -= 16;
  texte(`${TYPES[d.type as TypeDemande] || d.type} · ${d.categorie} · soumise le ${dateLongue(d.createdAt)}`, MARGE, 10, f, GRIS);
  y -= 30;
  texte("Montant", MARGE, 9, f, GRIS);
  y -= 24;
  texte(formatMontant(d.montant), MARGE, 24, fb, VERT);
  y -= 14;

  // ── Demande ──
  titre("Demande");
  champ("Objet", d.objet);
  if (d.description) champ("Détails", d.description);
  champ("Type", TYPES[d.type as TypeDemande] || d.type);
  champ("Catégorie", d.categorie);
  champ("Date de la dépense", dateLongue(d.dateDepense));
  champ("Mode de paiement", MODES_PAIEMENT[d.modePaiement as keyof typeof MODES_PAIEMENT] || d.modePaiement);
  if (d.beneficiaire) champ("Bénéficiaire", d.beneficiaire);

  // ── Demandeur ──
  titre("Demandeur");
  champ("Nom", nomUtilisateur(d.demandeur));
  champ("Compte", libelleCompte(d.demandeur));
  if (d.ministere) champ("Ministère", d.ministere);
  if (d.departement) champ("Département", d.departement);
  champ("Identifiant / courriel", [d.demandeur.identifiant, d.demandeur.courriel].filter(Boolean).join(" · "));

  // ── Approbations (dernière décision de chaque étape) ──
  titre("Approbations et paiement");
  const derniere = (action: string) => [...d.historique].reverse().find((h) => h.action === action);
  const etape = (action: string, attente: string) => {
    const h = derniere(action);
    return h ? `${h.auteur ? nomUtilisateur(h.auteur) : "—"}${h.auteur ? ` (${libelleCompte(h.auteur)})` : ""} - ${dateHeure(h.createdAt)}` : attente;
  };
  champ(
    "1re approbation",
    d.approbateur ? etape("approuvee_leader", `En attente de ${nomUtilisateur(d.approbateur)} (${libelleCompte(d.approbateur)})`) : "Sans objet (directement aux finances)",
  );
  champ("Finances", etape("approuvee_finances", "En attente"));
  champ("Paiement", d.payeLe ? `${etape("payee", "")}${d.referencePaiement ? ` - réf. ${d.referencePaiement}` : ""}` : "Non payée");
  if (d.statut === "a_reviser" && d.motifRefus) champ("Motif du refus", d.motifRefus);

  // ── Historique ──
  titre("Historique");
  for (const h of d.historique) {
    const qui = h.auteur ? `${nomUtilisateur(h.auteur)} (${libelleCompte(h.auteur)})` : "—";
    champ(dateHeure(h.createdAt), `${ACTIONS_HISTO[h.action] || h.action} - ${qui}${h.commentaire ? `\n« ${h.commentaire} »` : ""}`);
  }

  // ── Pièces jointes (liste) ──
  titre("Pièces jointes");
  if (d.pieces.length === 0) champ("", "Aucune");
  d.pieces.forEach((p, i) => champ(`Pièce ${i + 1}`, p.nom));

  // ── Signatures ──
  // Le bloc de signatures (≈ 60 pt) reste sur la page s'il tient au-dessus du pied de page.
  if (y - 66 < 44) nouvellePage();
  y -= 30;
  const col = (L - MARGE * 2 - 30) / 2;
  for (const [i, lib] of ["Signature - ministère", "Signature - finances"].entries()) {
    const x = MARGE + i * (col + 30);
    page.drawLine({ start: { x, y }, end: { x: x + col, y }, thickness: 0.6, color: GRIS });
    page.drawText(net(lib), { x, y: y - 12, size: 8.5, font: f, color: GRIS });
    page.drawText("Date :", { x, y: y - 26, size: 8.5, font: f, color: GRIS });
  }

  // ── Annexes : pièces jointes ──
  for (const [i, p] of d.pieces.entries()) {
    const entete = (pg: PDFPage) =>
      pg.drawText(net(`${ref} - Pièce ${i + 1} : ${p.nom}`).slice(0, 110), { x: MARGE, y: H - 30, size: 8.5, font: f, color: GRIS });
    try {
      if (p.typeMime === "application/pdf") {
        const src = await PDFDocument.load(p.donnees, { ignoreEncryption: true });
        const pages = await pdf.copyPages(src, src.getPageIndices());
        for (const pg of pages) pdf.addPage(pg);
      } else if (p.typeMime === "image/jpeg" || p.typeMime === "image/png") {
        const img = p.typeMime === "image/png" ? await pdf.embedPng(p.donnees) : await pdf.embedJpg(p.donnees);
        const pg = pdf.addPage([L, H]);
        entete(pg);
        const echelle = Math.min((L - MARGE * 2) / img.width, (H - MARGE * 2 - 20) / img.height, 1.5);
        const w = img.width * echelle;
        const h = img.height * echelle;
        pg.drawImage(img, { x: (L - w) / 2, y: H - MARGE - 20 - h, width: w, height: h });
      } else throw new Error("format");
    } catch {
      const pg = pdf.addPage([L, H]);
      entete(pg);
      pg.drawText(net(`Cette pièce (${p.nom}) ne peut pas être intégrée au PDF : la consulter dans la plateforme.`), {
        x: MARGE,
        y: H - 80,
        size: 10,
        font: f,
        color: NOIR,
      });
    }
  }

  // ── Pied de page (toutes les pages) ──
  const toutes = pdf.getPages();
  toutes.forEach((pg, i) => {
    const pied = net(`${ref} · ${FIN.organisation} - ${FIN.nom} · Généré le ${dateHeure(new Date())} par ${genereePar}`);
    pg.drawLine({ start: { x: MARGE, y: 34 }, end: { x: L - MARGE, y: 34 }, thickness: 0.4, color: TRAIT });
    pg.drawText(pied.slice(0, 120), { x: MARGE, y: 22, size: 7.5, font: f, color: GRIS });
    const num = `${i + 1} / ${toutes.length}`;
    pg.drawText(num, { x: L - MARGE - f.widthOfTextAtSize(num, 7.5), y: 22, size: 7.5, font: f, color: GRIS });
  });

  return pdf.save();
}

// Nom de fichier : « FIN-0003 - Departement Tribus - Repas tribus.pdf »
export function nomFichierPdf(d: { numero: number; objet: string; ministere: string | null; departement: string | null }): string {
  const org = d.departement ? `Departement ${d.departement}` : d.ministere ? `Ministere ${d.ministere}` : "";
  return [reference(d.numero), org, d.objet]
    .filter(Boolean)
    .join(" - ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ._()-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim()
    .concat(".pdf");
}
