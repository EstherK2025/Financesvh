import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fermerSessionsDe, hacherMotDePasse, utilisateurParJeton } from "@/lib/fin-auth";
import { problemeMotDePasse } from "@/lib/finances";
import { REGLES, bloque, compter, ipClient, journaliser, messageBloque } from "@/lib/fin-securite";

// Activation du compte / nouveau mot de passe via le lien reçu par courriel.
export async function POST(req: Request) {
  const cle = `lien:ip:${await ipClient()}`;
  const attente = await bloque([cle]);
  if (attente) return NextResponse.json({ error: messageBloque(attente) }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const u = await utilisateurParJeton(String(b.jeton || ""));
  if (!u) await compter([[cle, REGLES.lienIp]]);
  if (!u) return NextResponse.json({ error: "Ce lien est invalide ou a expiré. Demandez-en un nouveau." }, { status: 400 });
  const mdp = String(b.motDePasse || "");
  const pb = problemeMotDePasse(mdp);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });
  // Compte créé sans courriel (organigramme) : la personne donne le sien ici.
  let courriel = u.courriel;
  if (!courriel) {
    courriel = String(b.courriel || "").trim().toLowerCase().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel))
      return NextResponse.json({ error: "Indiquez un courriel valide : il recevra vos codes de connexion." }, { status: 400 });
    if (await prisma.finUtilisateur.findUnique({ where: { courriel } }))
      return NextResponse.json({ error: "Ce courriel est déjà utilisé par un autre compte." }, { status: 409 });
  }
  await prisma.finUtilisateur.update({
    where: { id: u.id },
    data: { courriel, motDePasse: hacherMotDePasse(mdp), jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null },
  });
  await fermerSessionsDe(u.id);
  await journaliser("mdp_lien", { utilisateurId: u.id, identifiant: u.identifiant });
  return NextResponse.json({ ok: true });
}
