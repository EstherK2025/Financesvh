import { prisma } from "./prisma";
import type { UtilisateurCourant } from "./fin-auth";
import { courrielAApprouver, courrielNouvelleDemande, courrielSuivi } from "./fin-email";
import { nomUtilisateur, type Statut } from "./finances";

// ───────────────────────────────────────────────────────────
// Règles du circuit d'approbation.
//
//   Utilisateur (département) ─▶ administrateur du ministère ─▶ finances (super admin) ─▶ payé
//
// • L'administrateur d'un ministère voit les demandes de son ministère et
//   approuve en premier celles de ses départements.
// • Puis la demande va chez les finances, qui l'approuvent et la paient.
// • Refus (leader ou finances) : retour au demandeur avec un motif, pour
//   révision (corriger et renvoyer) ou annulation.
// • Un super admin choisit à qui envoyer SA demande (1ʳᵉ approbation).
// • Personne n'approuve sa propre demande.
// ───────────────────────────────────────────────────────────

type DemandeurInfo = { id: string; role: string; leaderId: string | null };

// Qui approuve à la 1ʳᵉ étape ? null = directement aux finances.
export async function approbateurPour(demandeur: DemandeurInfo, destinataireId?: string | null): Promise<string | null> {
  const candidat = demandeur.role === "superadmin" ? destinataireId || null : demandeur.leaderId;
  if (!candidat || candidat === demandeur.id) return null;
  const u = await prisma.finUtilisateur.findUnique({ where: { id: candidat }, select: { actif: true } });
  return u?.actif ? candidat : null;
}

export function statutInitial(approbateurId: string | null): Statut {
  return approbateurId ? "attente_leader" : "attente_finances";
}

type DemandeDroits = { demandeurId: string; approbateurId: string | null; statut: string; ministere?: string | null };

export function peutVoir(u: UtilisateurCourant, d: DemandeDroits): boolean {
  if (u.role === "superadmin" || d.demandeurId === u.id || d.approbateurId === u.id) return true;
  return u.role === "admin" && !!u.ministere && d.ministere === u.ministere;
}

export function actionsPossibles(u: UtilisateurCourant, d: DemandeDroits) {
  const proprio = d.demandeurId === u.id;
  const etapeLeader = d.statut === "attente_leader" && d.approbateurId === u.id && !proprio;
  const etapeFinances = d.statut === "attente_finances" && u.role === "superadmin" && !proprio;
  return {
    approuver: etapeLeader || etapeFinances,
    refuser: etapeLeader || etapeFinances,
    payer: d.statut === "approuvee" && u.role === "superadmin" && !proprio,
    reviser: proprio && d.statut === "a_reviser",
    annuler: proprio && (d.statut === "a_reviser" || d.statut === "attente_leader" || d.statut === "attente_finances"),
  };
}

// Envoie les courriels correspondant au statut actuel de la demande.
export async function notifier(demandeId: string, motif?: string, nouvelle = false) {
  const d = await prisma.finDemande.findUnique({
    where: { id: demandeId },
    include: { demandeur: true, approbateur: true },
  });
  if (!d) return;
  const info = {
    id: d.id,
    numero: d.numero,
    type: d.type,
    categorie: d.categorie,
    objet: d.objet,
    montant: d.montant,
    statut: d.statut,
    demandeurNom: nomUtilisateur(d.demandeur),
  };
  const dem = d.demandeur;

  switch (d.statut) {
    case "attente_leader": {
      if (d.approbateur?.actif) await courrielAApprouver(d.approbateur.courriel, nomUtilisateur(d.approbateur), info);
      if (nouvelle) {
        // Accusé de réception au demandeur + information aux finances.
        await courrielSuivi(dem.courriel, nomUtilisateur(dem), info, `Votre demande a bien été reçue. Elle attend l'approbation de ${d.approbateur ? nomUtilisateur(d.approbateur) : "votre ministère"}, puis celle des finances.`);
        const finances = await prisma.finUtilisateur.findMany({ where: { role: "superadmin", actif: true, id: { notIn: [d.demandeurId, d.approbateurId || ""] } } });
        await Promise.all(finances.map((f) => courrielNouvelleDemande(f.courriel, nomUtilisateur(f), info, d.approbateur ? nomUtilisateur(d.approbateur) : "son ministère")));
      }
      break;
    }
    case "attente_finances": {
      const finances = await prisma.finUtilisateur.findMany({
        where: { role: "superadmin", actif: true, id: { not: d.demandeurId } },
      });
      await Promise.all(finances.map((f) => courrielAApprouver(f.courriel, nomUtilisateur(f), info)));
      if (nouvelle)
        await courrielSuivi(dem.courriel, nomUtilisateur(dem), info, "Votre demande a bien été reçue. Elle attend maintenant l'approbation des finances.");
      else if (d.approbateurId)
        await courrielSuivi(dem.courriel, nomUtilisateur(dem), info, "Votre ministère a approuvé votre demande. Elle est maintenant entre les mains des finances.");
      break;
    }
    case "a_reviser":
      await courrielSuivi(dem.courriel, nomUtilisateur(dem), info, "Votre demande a été refusée et vous est renvoyée. Vous pouvez la corriger et la renvoyer, ou l'annuler.", motif);
      break;
    case "approuvee":
      await courrielSuivi(
        dem.courriel,
        nomUtilisateur(dem),
        info,
        "Bonne nouvelle : les finances ont approuvé votre demande. Le paiement suivra." +
          (d.type === "decaissement" ? " Pensez à ajouter sur la plateforme les justificatifs (factures, reçus) une fois la dépense faite." : ""),
      );
      break;
    case "payee":
      await courrielSuivi(dem.courriel, nomUtilisateur(dem), info, "Le paiement de votre demande a été effectué." + (d.referencePaiement ? ` Référence : ${d.referencePaiement}.` : ""));
      break;
  }
}
