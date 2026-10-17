import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { courrielRappelJustificatifs } from "@/lib/fin-email";
import { nomUtilisateur } from "@/lib/finances";

// Tâche quotidienne (Vercel Cron, voir vercel.json) : pour chaque décaissement
// approuvé par les finances dont les justificatifs ne sont pas encore reçus,
// rappel au demandeur tous les deux jours.
const DEUX_JOURS = 47 * 60 * 60 * 1000; // ~2 jours (marge pour l'heure d'exécution)

export async function GET(req: Request) {
  // Vercel envoie « Authorization: Bearer <CRON_SECRET> » quand CRON_SECRET est défini.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Refusé.", { status: 401 });
  const maintenant = Date.now();
  const demandes = await prisma.finDemande.findMany({
    where: { type: "decaissement", statut: { in: ["approuvee", "payee"] }, justificatifsLe: null },
    include: { demandeur: true },
  });
  let envoyes = 0;
  for (const d of demandes) {
    const depart = (d.dernierRappel ?? d.approuveeLe ?? d.updatedAt).getTime();
    if (maintenant - depart < DEUX_JOURS || !d.demandeur.actif) continue;
    // Réservation atomique : une exécution en double n'envoie pas deux rappels.
    const r = await prisma.finDemande.updateMany({
      where: { id: d.id, justificatifsLe: null, dernierRappel: d.dernierRappel },
      data: { dernierRappel: new Date(maintenant), nbRappels: { increment: 1 } },
    });
    if (r.count === 0) continue;
    const info = { id: d.id, numero: d.numero, type: d.type, categorie: d.categorie, objet: d.objet, montant: d.montant, statut: d.statut, demandeurNom: nomUtilisateur(d.demandeur) };
    await courrielRappelJustificatifs(d.demandeur.courriel, nomUtilisateur(d.demandeur), info, d.nbRappels + 1);
    envoyes++;
  }
  return NextResponse.json({ ok: true, enAttente: demandes.length, rappels: envoyes });
}
