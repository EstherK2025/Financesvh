import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comptePremiere, egalConstant, fermerPremiere, hacherMotDePasse } from "@/lib/fin-auth";
import { suiteApresMotDePasse } from "@/lib/fin-connexion";
import { mdpTemporaire, titreValide } from "@/lib/fin-reglages";
import { problemeMotDePasse } from "@/lib/finances";

// Première connexion : la personne indique son prénom et son nom (responsable
// du ministère / département) et crée SON mot de passe, puis est connectée
// (ou configure son application Authenticator si la double authentification est activée).
export async function POST(req: Request) {
  const u = await comptePremiere();
  if (!u) return NextResponse.json({ error: "Session expirée. Reconnectez-vous avec le mot de passe temporaire." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const prenom = String(b.prenom ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const nom = String(b.nom ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!prenom || !nom) return NextResponse.json({ error: "Indiquez votre prénom et votre nom." }, { status: 400 });
  const mdp = String(b.motDePasse || "");
  const pb = problemeMotDePasse(mdp);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });
  if (egalConstant(mdp, await mdpTemporaire()))
    return NextResponse.json({ error: "Choisissez un mot de passe différent du mot de passe temporaire." }, { status: 400 });

  const maj = await prisma.finUtilisateur.update({
    where: { id: u.id },
    data: { titre: await titreValide(b.titre), prenom, nom, motDePasse: hacherMotDePasse(mdp), jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null },
  });
  await fermerPremiere();
  return NextResponse.json(await suiteApresMotDePasse(maj));
}
