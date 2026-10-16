import { NextResponse } from "next/server";
import { titreValide } from "@/lib/fin-reglages";
import { prisma } from "@/lib/prisma";
import { creerJetonCompte, motDePasseInstallationValide } from "@/lib/fin-auth";
import { courrielInvitation, lienFinances } from "@/lib/fin-email";
import { courrielParDefaut, normaliserIdentifiant, problemeIdentifiant, nomUtilisateur } from "@/lib/finances";
import { REGLES, bloque, compter, ipClient, messageBloque } from "@/lib/fin-securite";

// Création du tout premier super admin (possible uniquement quand aucun compte
// n'existe encore). Protégée par le mot de passe d'installation.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if ((await prisma.finUtilisateur.count()) > 0)
    return NextResponse.json({ error: "La plateforme est déjà installée." }, { status: 403 });
  const cle = `lien:ip:${await ipClient()}`;
  const attente = await bloque([cle]);
  if (attente) return NextResponse.json({ error: messageBloque(attente) }, { status: 429 });
  if (!motDePasseInstallationValide(String(b.motDePasseInstallation || ""))) {
    await compter([[cle, REGLES.lienIp]]);
    return NextResponse.json({ error: "Mot de passe d'installation incorrect." }, { status: 401 });
  }

  const prenom = String(b.prenom || "").trim().slice(0, 80);
  const nom = String(b.nom || "").trim().slice(0, 80);
  const identifiantSaisi = normaliserIdentifiant(b.identifiant);
  const courriel = String(b.courriel || "").trim().toLowerCase().slice(0, 160) || courrielParDefaut(identifiantSaisi);
  const identifiant = normaliserIdentifiant(b.identifiant);
  if (!prenom || !courriel.includes("@")) return NextResponse.json({ error: "Prénom requis." }, { status: 400 });
  const pb = problemeIdentifiant(identifiant);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });

  const u = await prisma.finUtilisateur.create({ data: { titre: await titreValide(b.titre), prenom, nom, identifiant, courriel, role: "superadmin", nomConfirme: true } });
  const jeton = await creerJetonCompte(u.id);
  await courrielInvitation(u.courriel, nomUtilisateur(u), jeton);
  // Le lien est aussi renvoyé directement (l'installateur connaît le mot de passe d'installation).
  return NextResponse.json({ ok: true, lien: lienFinances(`/activer/${jeton}`) });
}
