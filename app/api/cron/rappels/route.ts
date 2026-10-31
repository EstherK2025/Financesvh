import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { courrielRappelApprobation, courrielRappelJustificatifs } from "@/lib/fin-email";
import { nomUtilisateur } from "@/lib/finances";

// Tâche quotidienne (Vercel Cron, voir vercel.json) — rappels automatiques :
//  1. Demande en attente d'approbation depuis 2 jours → rappel à l'approbateur
//     (ministère, ou finances), puis tous les deux jours.
//  2. Décaissement payé (fonds envoyés) sans justificatifs → rappel au demandeur
//     tous les deux jours jusqu'à réception des factures / reçus.
const DEUX_JOURS = 47 * 60 * 60 * 1000; // ~2 jours (marge pour l'heure d'exécution)

type D = { id: string; numero: number; type: string; categorie: string; objet: string; montant: number; statut: string; demandeur: Parameters<typeof nomUtilisateur>[0] };
const info = (d: D) => ({ id: d.id, numero: d.numero, type: d.type, categorie: d.categorie, objet: d.objet, montant: d.montant, statut: d.statut, demandeurNom: nomUtilisateur(d.demandeur) });

export async function GET(req: Request) {
  // Vercel envoie « Authorization: Bearer <CRON_SECRET> » quand CRON_SECRET est défini.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Refusé.", { status: 401 });
  const maintenant = Date.now();

  // 1. Approbations en retard.
  let approbations = 0;
  const enAttente = await prisma.finDemande.findMany({
    where: { statut: { in: ["attente_leader", "attente_finances"] } },
    include: { demandeur: true, approbateur: true, historique: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const finances = await prisma.finUtilisateur.findMany({ where: { role: "superadmin", actif: true } });
  for (const d of enAttente) {
    const entree = (d.historique[0]?.createdAt ?? d.updatedAt).getTime();
    const depart = Math.max(entree, d.rappelApprobation?.getTime() ?? 0);
    if (maintenant - depart < DEUX_JOURS) continue;
    const r = await prisma.finDemande.updateMany({
      where: { id: d.id, statut: d.statut, rappelApprobation: d.rappelApprobation },
      data: { rappelApprobation: new Date(maintenant) },
    });
    if (r.count === 0) continue;
    const jours = Math.floor((maintenant - entree) / 864e5);
    if (d.statut === "attente_leader") {
      if (d.approbateur?.actif) await courrielRappelApprobation(d.approbateur.courriel, nomUtilisateur(d.approbateur), info(d), jours);
    } else {
      // Finances : pas le demandeur, ni la personne qui a donné la 1re approbation.
      for (const f of finances.filter((f) => f.id !== d.demandeurId && f.id !== d.approbateurId))
        await courrielRappelApprobation(f.courriel, nomUtilisateur(f), info(d), jours);
    }
    approbations++;
  }

  // 2. Justificatifs des décaissements payés (fonds envoyés).
  let justificatifs = 0;
  const payes = await prisma.finDemande.findMany({
    where: { type: "decaissement", statut: "payee", justificatifsLe: null },
    include: { demandeur: true },
  });
  for (const d of payes) {
    const depart = (d.dernierRappel ?? d.payeLe ?? d.updatedAt).getTime();
    if (maintenant - depart < DEUX_JOURS || !d.demandeur.actif) continue;
    // Réservation atomique : une exécution en double n'envoie pas deux rappels.
    const r = await prisma.finDemande.updateMany({
      where: { id: d.id, justificatifsLe: null, dernierRappel: d.dernierRappel },
      data: { dernierRappel: new Date(maintenant), nbRappels: { increment: 1 } },
    });
    if (r.count === 0) continue;
    await courrielRappelJustificatifs(d.demandeur.courriel, nomUtilisateur(d.demandeur), info(d), d.nbRappels + 1);
    justificatifs++;
  }
  return NextResponse.json({ ok: true, rappelsApprobation: approbations, rappelsJustificatifs: justificatifs });
}
