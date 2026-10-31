import { envoyer } from "./email";
import { prisma } from "./prisma";
import { FIN, STATUTS, TYPES, formatMontant, reference, type Statut, type TypeDemande } from "./finances";

// Courriels de la plateforme Finances — sobres (noir · blanc), sans données
// sensibles : un lien renvoie vers la plateforme (connexion requise).

function base(): string {
  return (process.env.FIN_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
}
export function lienFinances(chemin = ""): string {
  return `${base()}${chemin || "/"}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function gabarit(titre: string, corps: string, bouton?: { libelle: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0; background:#f4f4f4; font-family:Arial,Helvetica,sans-serif; color:#111;">
  <div style="max-width:560px; margin:0 auto; padding:24px 16px;">
    <div style="background:#000; color:#fff; padding:18px 22px; border-radius:12px 12px 0 0;">
      <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#c9a227;">${esc(FIN.organisation)}</div>
      <div style="font-size:19px; font-weight:bold; margin-top:4px;">${esc(FIN.nom)}</div>
    </div>
    <div style="background:#fff; padding:24px 22px; border:1px solid #e5e5e5; border-top:none; border-radius:0 0 12px 12px;">
      <h1 style="font-size:18px; margin:0 0 14px;">${esc(titre)}</h1>
      ${corps}
      ${bouton ? `<p style="margin:24px 0 4px;"><a href="${bouton.url}" style="display:inline-block; background:#000; color:#fff; text-decoration:none; padding:13px 26px; border-radius:10px; font-weight:bold;">${esc(bouton.libelle)}</a></p>` : ""}
    </div>
    <p style="font-size:11px; color:#777; text-align:center; margin-top:14px;">Courriel automatique — ne pas répondre.</p>
  </div></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 10px; font-size:15px; line-height:1.5;">${t}</p>`;

type DemandeCourriel = {
  id: string;
  numero: number;
  type: string;
  categorie: string;
  objet: string;
  montant: number;
  statut: string;
  demandeurNom: string;
};

function resume(d: DemandeCourriel): string {
  const ligne = (k: string, v: string) =>
    `<tr><td style="padding:6px 0; color:#666; font-size:13px; width:120px;">${k}</td><td style="padding:6px 0; font-size:14px; font-weight:bold;">${esc(v)}</td></tr>`;
  return `<table style="width:100%; border-collapse:collapse; border-top:1px solid #eee; border-bottom:1px solid #eee; margin:12px 0;">
    ${ligne("Référence", reference(d.numero))}
    ${ligne("Type", TYPES[d.type as TypeDemande] || d.type)}
    ${ligne("Catégorie", d.categorie)}
    ${ligne("Objet", d.objet)}
    ${ligne("Montant", formatMontant(d.montant))}
    ${ligne("Demandeur", d.demandeurNom)}
    ${ligne("Statut", STATUTS[d.statut as Statut] || d.statut)}
  </table>`;
}

// Chaque courriel est noté (Réglages → Courriels) : envoyé, simulé (Resend non
// configuré), échec (adresse refusée, domaine non vérifié…) ou sans adresse.
async function noter(destinataire: string, sujet: string, statut: string, erreur?: string) {
  await prisma.finCourriel
    .create({ data: { destinataire: destinataire.slice(0, 160), sujet: sujet.slice(0, 200), statut, erreur: erreur?.slice(0, 500) } })
    .catch(() => {});
}

async function envoyerSur(to: string | null, sujet: string, html: string, nomSansAdresse = "") {
  if (!to) return noter(nomSansAdresse || "(aucune adresse)", sujet, "sans_adresse");
  try {
    const r = await envoyer(to, sujet, html);
    await noter(to, sujet, r.simulated ? "simulation" : "envoye");
  } catch (e) {
    // Une notification qui échoue ne doit jamais bloquer le circuit.
    console.error("[portail] courriel non envoyé :", to, e);
    await noter(to, sujet, "echec", e instanceof Error ? e.message : String(e));
  }
}

// Test depuis les Réglages.
export async function courrielTest(to: string) {
  await envoyerSur(to, `Test — ${FIN.nom}`, gabarit("Courriel de test", p("Si vous lisez ceci, les courriels de la plateforme fonctionnent.")));
}

export async function courrielInvitation(to: string | null, prenom: string, jeton: string, reinitialisation = false) {
  const url = lienFinances(`/activer/${jeton}`);
  if (!to) return; // pas encore de courriel : le lien est transmis à la main
  if (!process.env.RESEND_API_KEY) console.log(`[SIMULATION] Lien ${reinitialisation ? "de réinitialisation" : "d'activation"} pour ${to} : ${url}`);
  await envoyerSur(
    to,
    reinitialisation ? "Réinitialiser votre mot de passe — Portail des dépenses" : "Votre compte sur le Portail des dépenses",
    gabarit(
      reinitialisation ? "Nouveau mot de passe" : "Bienvenue !",
      p(`Bonjour ${esc(prenom)},`) +
        (reinitialisation
          ? p("Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.")
          : p(`Un compte a été créé pour vous sur le ${esc(FIN.nom)} de ${esc(FIN.organisation)} (demandes de décaissement et de remboursement). Choisissez votre mot de passe pour l'activer.`)) +
        p(`<span style="color:#666; font-size:13px;">Ce lien est personnel et expire dans ${reinitialisation ? "24 heures" : "7 jours"}.</span>`),
      { libelle: reinitialisation ? "Choisir un nouveau mot de passe" : "Activer mon compte", url },
    ),
  );
}

// À l'approbateur : une demande attend sa décision.
export async function courrielAApprouver(to: string | null, prenom: string, d: DemandeCourriel) {
  await envoyerSur(
    to,
    `À approuver : ${reference(d.numero)} — ${formatMontant(d.montant)}`,
    gabarit(
      "Une demande attend votre approbation",
      p(`Bonjour ${esc(prenom)},`) + p(`${esc(d.demandeurNom)} a soumis une demande qui requiert votre décision.`) + resume(d),
      { libelle: "Voir la demande", url: lienFinances(`/demande/${d.id}`) },
    ),
    prenom,
  );
}

// Aux finances : une nouvelle demande vient d'être déposée (pour information,
// quand elle passe d'abord par un ministère).
export async function courrielNouvelleDemande(to: string | null, prenom: string, d: DemandeCourriel, approbateur: string) {
  await envoyerSur(
    to,
    `Nouvelle demande : ${reference(d.numero)} — ${formatMontant(d.montant)}`,
    gabarit(
      "Une nouvelle demande a été déposée",
      p(`Bonjour ${esc(prenom)},`) +
        p(`${esc(d.demandeurNom)} vient de déposer une demande. Elle attend d'abord l'approbation de ${esc(approbateur)} ; vous recevrez un autre courriel quand ce sera à vous.`) +
        resume(d),
      { libelle: "Voir la demande", url: lienFinances(`/demande/${d.id}`) },
    ),
    prenom,
  );
}

// Aux autres super administrateurs : une suppression de fichier attend leur autorisation.
export async function courrielAutorisationSuppression(
  to: string | null,
  prenom: string,
  s: { demandeId: string; numero: number; fichier: string; motif: string; par: string },
) {
  await envoyerSur(
    to,
    `Autorisation requise : suppression d'un fichier — ${reference(s.numero)}`,
    gabarit(
      "Suppression d'un fichier à autoriser",
      p(`Bonjour ${esc(prenom)},`) +
        p(`${esc(s.par)} demande la suppression du fichier « ${esc(s.fichier)} » de la demande ${reference(s.numero)}.`) +
        `<div style="border-left:4px solid #000; background:#f4f4f4; padding:12px 14px; margin:12px 0; font-size:14px;"><b>Motif :</b> ${esc(s.motif)}</div>` +
        p("La suppression n'a lieu qu'après l'autorisation de 3 super administrateurs."),
      { libelle: "Voir la demande", url: lienFinances(`/demande/${s.demandeId}`) },
    ),
    prenom,
  );
}

// Rappel à l'approbateur : une demande attend sa décision depuis plus de 2 jours.
export async function courrielRappelApprobation(to: string | null, prenom: string, d: DemandeCourriel, jours: number) {
  await envoyerSur(
    to,
    `Rappel : demande à approuver — ${reference(d.numero)} (${jours} jours)`,
    gabarit(
      "Une demande attend toujours votre décision",
      p(`Bonjour ${esc(prenom)},`) + p(`La demande de ${esc(d.demandeurNom)} attend votre approbation depuis ${jours} jours.`) + resume(d),
      { libelle: "Voir la demande", url: lienFinances(`/demande/${d.id}`) },
    ),
    prenom,
  );
}

// Décaissement : rappel de fournir les justificatifs (preuves de dépense).
export async function courrielRappelJustificatifs(to: string | null, prenom: string, d: DemandeCourriel, numeroRappel: number) {
  await envoyerSur(
    to,
    `Rappel : justificatifs à fournir — ${reference(d.numero)}`,
    gabarit(
      "Justificatifs de dépense à fournir",
      p(`Bonjour ${esc(prenom)},`) +
        p(
          `Les fonds de votre demande de décaissement vous ont été envoyés. Merci d'ajouter sur la plateforme les preuves de dépense (factures, reçus) correspondant à ces fonds.`,
        ) +
        p(`<span style="color:#666; font-size:13px;">Rappel n° ${numeroRappel} — un rappel est envoyé tous les deux jours jusqu'à réception des justificatifs.</span>`) +
        resume(d),
      { libelle: "Ajouter mes justificatifs", url: lienFinances(`/demande/${d.id}`) },
    ),
    prenom,
  );
}

// Aux finances : le demandeur a ajouté ses justificatifs.
export async function courrielJustificatifsRecus(to: string | null, prenom: string, d: DemandeCourriel) {
  await envoyerSur(
    to,
    `Justificatifs reçus — ${reference(d.numero)}`,
    gabarit(
      "Justificatifs de dépense reçus",
      p(`Bonjour ${esc(prenom)},`) + p(`${esc(d.demandeurNom)} a ajouté les justificatifs de sa demande de décaissement.`) + resume(d),
      { libelle: "Voir les justificatifs", url: lienFinances(`/demande/${d.id}`) },
    ),
    prenom,
  );
}

// Au demandeur : sa demande a avancé, a été refusée ou payée.
export async function courrielSuivi(to: string | null, prenom: string, d: DemandeCourriel, message: string, motif?: string) {
  await envoyerSur(
    to,
    `${reference(d.numero)} — ${STATUTS[d.statut as Statut] || d.statut}`,
    gabarit(
      STATUTS[d.statut as Statut] || "Mise à jour de votre demande",
      p(`Bonjour ${esc(prenom)},`) +
        p(esc(message)) +
        (motif
          ? `<div style="border-left:4px solid #000; background:#f4f4f4; padding:12px 14px; margin:12px 0; font-size:14px;"><b>Motif :</b> ${esc(motif)}</div>`
          : "") +
        resume(d),
      { libelle: "Ouvrir ma demande", url: lienFinances(`/demande/${d.id}`) },
    ),
    prenom,
  );
}
