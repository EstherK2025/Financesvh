import { prisma } from "./prisma";
import type { UtilisateurCourant } from "./fin-auth";
import { courrielAApprouver, courrielSuivi } from "./fin-email";
import { nomUtilisateur, type Statut } from "./finances";

// ───────────────────────────────────────────────────────────
// Règles du circuit d'approbation.
//
//   Utilisateur ─▶ son leader ─▶ finances (super admins) ─▶ payé
//
// • Le leader d'une personne voit ses demandes et les approuve en premier.
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

type DemandeDroits = { demandeurId: string; approbateurId: string | null; statut: string };

export function peutVoir(u: UtilisateurCourant, d: DemandeDroits): boolean {
  return u.role === "superadmin" || d.demandeurId === u.id || d.approbateurId === u.id;
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
export async function notifier(demandeId: string, motif?: string) {
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
    case "attente_leader":
      if (d.approbateur?.actif) await courrielAApprouver(d.approbateur.courriel, d.approbateur.prenom, info);
      break;
    case "attente_finances": {
      const finances = await prisma.finUtilisateur.findMany({
        where: { role: "superadmin", actif: true, id: { not: d.demandeurId } },
      });
      await Promise.all(finances.map((f) => courrielAApprouver(f.courriel, f.prenom, info)));
      if (d.approbateurId)
        await courrielSuivi(dem.courriel, dem.prenom, info, "Votre leader a approuvé votre demande. Elle est maintenant entre les mains des finances.");
      break;
    }
    case "a_reviser":
      await courrielSuivi(dem.courriel, dem.prenom, info, "Votre demande a été refusée et vous est renvoyée. Vous pouvez la corriger et la renvoyer, ou l'annuler.", motif);
      break;
    case "approuvee":
      await courrielSuivi(dem.courriel, dem.prenom, info, "Bonne nouvelle : les finances ont approuvé votre demande. Le paiement suivra.");
      break;
    case "payee":
      await courrielSuivi(dem.courriel, dem.prenom, info, "Le paiement de votre demande a été effectué." + (d.referencePaiement ? ` Référence : ${d.referencePaiement}.` : ""));
      break;
  }
}

// Leader assignable à un compte : null = aucun ; false = invalide.
export async function leaderValide(id: unknown, pour?: string): Promise<string | null | false> {
  const leaderId = String(id || "");
  if (!leaderId) return null;
  if (leaderId === pour) return false;
  const l = await prisma.finUtilisateur.findUnique({ where: { id: leaderId } });
  return l && l.actif && (l.role === "leader" || l.role === "superadmin") ? l.id : false;
}
