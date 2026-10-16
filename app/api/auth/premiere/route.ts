import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comptePremiere, egalConstant, fermerPremiere, hacherMotDePasse } from "@/lib/fin-auth";
import { suiteApresMotDePasse } from "@/lib/fin-connexion";
import { mdpTemporaire, titreValide } from "@/lib/fin-reglages";
import { DOMAINE_COURRIEL, courrielParDefaut, identifiantDepuisNom, problemeIdentifiant, problemeMotDePasse, sansAccents } from "@/lib/finances";

// Première connexion : la personne indique son prénom et son nom (responsable
// du ministère / département) et crée SON mot de passe. Son identifiant devient
// automatiquement « prenom.nom » (ex. john.doe). Puis elle est connectée
// (ou configure son application Authenticator si la double authentification est activée).
export async function POST(req: Request) {
  const u = await comptePremiere();
  if (!u) return NextResponse.json({ error: "Session expirée. Reconnectez-vous avec le mot de passe temporaire." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const mdp = String(b.motDePasse || "");
  const pb = problemeMotDePasse(mdp);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });
  if (egalConstant(mdp, await mdpTemporaire()))
    return NextResponse.json({ error: "Choisissez un mot de passe différent du mot de passe temporaire." }, { status: 400 });

  // Mot de passe seulement réinitialisé : même personne, même identifiant.
  if (u.nomConfirme) {
    const maj = await prisma.finUtilisateur.update({
      where: { id: u.id },
      data: { motDePasse: hacherMotDePasse(mdp), jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null },
    });
    await fermerPremiere();
    return NextResponse.json(await suiteApresMotDePasse(maj));
  }

  // Vraie première connexion (ou compte réinitialisé pour un nouveau responsable).
  const prenom = String(b.prenom ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const nom = String(b.nom ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!prenom || !nom) return NextResponse.json({ error: "Indiquez votre prénom et votre nom." }, { status: 400 });
  // Identifiant « prenom.nom », rendu unique (john.doe, john.doe2…).
  const base = identifiantDepuisNom(prenom, nom);
  if (problemeIdentifiant(base)) return NextResponse.json({ error: "Prénom et nom trop courts pour créer l'identifiant." }, { status: 400 });
  // Pris = même identifiant, accents mis à part (côté = cote).
  const autres = await prisma.finUtilisateur.findMany({ where: { id: { not: u.id }, identifiant: { not: null } }, select: { identifiant: true } });
  const pris = new Set(autres.map((a) => sansAccents(a.identifiant!)));
  let identifiant = base;
  for (let i = 2; pris.has(sansAccents(identifiant)); i++) identifiant = `${base.slice(0, 28)}${i}`;
  // Courriel par défaut (ancien-identifiant@evhnb.ca) → suit le nouvel identifiant s'il est libre.
  let courriel = u.courriel;
  if (!courriel || courriel === courrielParDefaut(u.identifiant || "") || courriel === `${u.identifiant}@${DOMAINE_COURRIEL}`) {
    const nouveau = courrielParDefaut(identifiant);
    const pris = await prisma.finUtilisateur.findUnique({ where: { courriel: nouveau } });
    if (!pris || pris.id === u.id) courriel = nouveau;
  }

  const maj = await prisma.finUtilisateur.update({
    where: { id: u.id },
    data: { nomConfirme: true, identifiant, courriel, titre: await titreValide(b.titre), prenom, nom, motDePasse: hacherMotDePasse(mdp), jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null },
  });
  await fermerPremiere();
  return NextResponse.json({ ...(await suiteApresMotDePasse(maj)), identifiant });
}
