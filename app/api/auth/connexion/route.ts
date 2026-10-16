import { NextResponse } from "next/server";
import { egalConstant, ouvrirPremiere, trouverCompte, verifierMotDePasse, hacherMotDePasse } from "@/lib/fin-auth";
import { REGLES, bloque, compter, effacer, ipClient, journaliser, messageBloque } from "@/lib/fin-securite";
import { sansAccents } from "@/lib/finances";
import { suiteApresMotDePasse } from "@/lib/fin-connexion";
import { mdpTemporaire, titres } from "@/lib/fin-reglages";
import { libelleCompte } from "@/lib/finances";

// Étape 1 : identifiant (ou courriel) + mot de passe.
//  • Première connexion (aucun mot de passe choisi) → le mot de passe temporaire
//    universel donne accès à l'écran « Créez votre mot de passe ».
//  • Sinon → connecté, ou étape Authenticator si la double authentification
//    est activée (Réglages).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const motDePasse = String(b.motDePasse || "");
  const refus = NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  if (!motDePasse) return refus;

  // Limitation des tentatives (en base) : par IP et par identifiant saisi,
  // que le compte existe ou non (même réponse dans les deux cas).
  const saisie = sansAccents(String(b.identifiant ?? b.courriel ?? "").trim()).toLowerCase().slice(0, 160);
  const ip = await ipClient();
  const cles = [`connexion:ip:${ip}`, `connexion:id:${saisie}`];
  const attente = await bloque(cles);
  if (attente) return NextResponse.json({ error: messageBloque(attente) }, { status: 429 });

  const u = await trouverCompte(saisie);
  // Compte verrouillé (trop de codes Authenticator erronés) : même message.
  if (u?.verrouJusqua && u.verrouJusqua > new Date())
    return NextResponse.json({ error: messageBloque(Math.ceil((u.verrouJusqua.getTime() - Date.now()) / 60000)) }, { status: 429 });

  const premiere = !!u && !u.motDePasse;
  // Compte inexistant : on calcule quand même un hachage (temps de réponse identique).
  const valide = !u || !u.actif ? (hacherMotDePasse(motDePasse), false) : premiere ? egalConstant(motDePasse, await mdpTemporaire()) : verifierMotDePasse(motDePasse, u.motDePasse);
  if (!valide || !u) {
    const limite = await compter([
      [cles[0], REGLES.connexionIp],
      [cles[1], REGLES.connexionId],
    ]);
    await journaliser(limite ? "connexion_bloquee" : "connexion_echec", { utilisateurId: u?.id, identifiant: saisie });
    if (limite) return NextResponse.json({ error: messageBloque(15) }, { status: 429 });
    return refus;
  }
  await effacer([cles[1]]);

  if (premiere) {
    await ouvrirPremiere(u.id);
    return NextResponse.json({
      ok: true,
      etape: "premiere",
      compte: libelleCompte(u),
      titre: u.titre || "",
      // Nom déjà saisi par la personne (mot de passe réinitialisé) : seulement un nouveau mot de passe.
      nomConfirme: u.nomConfirme,
      identifiant: u.identifiant,
      titres: await titres(),
      prenom: u.prenom,
      nom: u.nom,
    });
  }
  return NextResponse.json(await suiteApresMotDePasse(u));
}
