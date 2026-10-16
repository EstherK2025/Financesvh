import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fermerSessionsDe, hacherMotDePasse, utilisateurParJeton } from "@/lib/fin-auth";
import { problemeMotDePasse } from "@/lib/finances";

// Activation du compte / nouveau mot de passe via le lien reçu par courriel.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const u = await utilisateurParJeton(String(b.jeton || ""));
  if (!u) return NextResponse.json({ error: "Ce lien est invalide ou a expiré. Demandez-en un nouveau." }, { status: 400 });
  const mdp = String(b.motDePasse || "");
  const pb = problemeMotDePasse(mdp);
  if (pb) return NextResponse.json({ error: pb }, { status: 400 });
  await prisma.finUtilisateur.update({
    where: { id: u.id },
    data: { motDePasse: hacherMotDePasse(mdp), jetonHash: null, jetonExpire: null, echecs: 0, verrouJusqua: null },
  });
  await fermerSessionsDe(u.id);
  return NextResponse.json({ ok: true });
}
