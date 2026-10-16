import { envoyer } from "./email";
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

async function envoyerSur(to: string, sujet: string, html: string) {
  try {
    await envoyer(to, sujet, html);
  } catch (e) {
    // Une notification qui échoue ne doit jamais bloquer le circuit.
    console.error("[finances] courriel non envoyé :", to, e);
  }
}

export async function courrielCode(to: string, prenom: string, code: string) {
  if (!process.env.RESEND_API_KEY) console.log(`🔐 [SIMULATION] Code de connexion Finances pour ${to} : ${code}`);
  // Le code de vérification doit, lui, signaler un échec d'envoi.
  await envoyer(
    to,
    `${code} — votre code de connexion`,
    gabarit(
      "Code de vérification",
      p(`Bonjour ${esc(prenom)},`) +
        p("Voici votre code pour terminer la connexion à la plateforme des finances :") +
        `<div style="font-size:34px; font-weight:bold; letter-spacing:8px; text-align:center; background:#f4f4f4; border-radius:10px; padding:16px; margin:16px 0;">${code}</div>` +
        p("Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe."),
    ),
  );
}

export async function courrielInvitation(to: string, prenom: string, jeton: string, reinitialisation = false) {
  const url = lienFinances(`/activer/${jeton}`);
  if (!process.env.RESEND_API_KEY) console.log(`🔗 [SIMULATION] Lien ${reinitialisation ? "de réinitialisation" : "d'activation"} pour ${to} : ${url}`);
  await envoyerSur(
    to,
    reinitialisation ? "Réinitialiser votre mot de passe — Finances" : "Votre compte sur la plateforme des finances",
    gabarit(
      reinitialisation ? "Nouveau mot de passe" : "Bienvenue !",
      p(`Bonjour ${esc(prenom)},`) +
        (reinitialisation
          ? p("Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.")
          : p(`Un compte a été créé pour vous sur la plateforme du ${esc(FIN.nom)} (demandes de décaissement et de remboursement). Choisissez votre mot de passe pour l'activer.`)) +
        p(`<span style="color:#666; font-size:13px;">Ce lien est personnel et expire dans ${reinitialisation ? "24 heures" : "7 jours"}.</span>`),
      { libelle: reinitialisation ? "Choisir un nouveau mot de passe" : "Activer mon compte", url },
    ),
  );
}

// À l'approbateur : une demande attend sa décision.
export async function courrielAApprouver(to: string, prenom: string, d: DemandeCourriel) {
  await envoyerSur(
    to,
    `À approuver : ${reference(d.numero)} — ${formatMontant(d.montant)}`,
    gabarit(
      "Une demande attend votre approbation",
      p(`Bonjour ${esc(prenom)},`) + p(`${esc(d.demandeurNom)} a soumis une demande qui requiert votre décision.`) + resume(d),
      { libelle: "Voir la demande", url: lienFinances(`/demande/${d.id}`) },
    ),
  );
}

// Au demandeur : sa demande a avancé, a été refusée ou payée.
export async function courrielSuivi(to: string, prenom: string, d: DemandeCourriel, message: string, motif?: string) {
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
  );
}
