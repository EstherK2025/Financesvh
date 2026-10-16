import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMontant, libelleOrg, nomUtilisateur } from "@/lib/finances";
import { exigerUtilisateur } from "./components/garde";
import DemandeListe from "./components/DemandeListe";

export const dynamic = "force-dynamic";

const avecDemandeur = { demandeur: { select: { prenom: true, nom: true } } } as const;

export default async function TableauDeBord() {
  const moi = await exigerUtilisateur();
  const finances = moi.role === "superadmin";
  const estLeader = moi.role !== "utilisateur";

  const [mes, aApprouverLeader, aApprouverFinances, aPayer, equipe] = await Promise.all([
    prisma.finDemande.findMany({ where: { demandeurId: moi.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.finDemande.findMany({
      where: { statut: "attente_leader", approbateurId: moi.id },
      orderBy: { createdAt: "asc" },
      include: avecDemandeur,
    }),
    finances
      ? prisma.finDemande.findMany({
          where: { statut: "attente_finances", demandeurId: { not: moi.id } },
          orderBy: { createdAt: "asc" },
          include: avecDemandeur,
        })
      : Promise.resolve([]),
    finances
      ? prisma.finDemande.findMany({
          where: { statut: "approuvee", demandeurId: { not: moi.id } },
          orderBy: { createdAt: "asc" },
          include: avecDemandeur,
        })
      : Promise.resolve([]),
    estLeader
      ? prisma.finDemande.findMany({
          where: {
            demandeurId: { not: moi.id },
            OR: [{ approbateurId: moi.id }, ...(moi.ministere ? [{ ministere: moi.ministere }] : [])],
            NOT: { statut: "attente_leader", approbateurId: moi.id },
          },
          orderBy: { updatedAt: "desc" },
          take: 30,
          include: avecDemandeur,
        })
      : Promise.resolve([]),
  ]);

  const aTraiter = aApprouverLeader.length + aApprouverFinances.length + aPayer.length;
  const enCours = mes.filter((d) => ["attente_leader", "attente_finances", "approuvee"].includes(d.statut));
  const aReviser = mes.filter((d) => d.statut === "a_reviser");
  const recu = mes.filter((d) => d.statut === "payee").reduce((s, d) => s + d.montant, 0);
  const totalAPayer = aPayer.reduce((s, d) => s + d.montant, 0);

  return (
    <>
      <h1>Bonjour {nomUtilisateur(moi)} 👋</h1>
      <p className="sous">{libelleOrg(moi.ministere, moi.departement) || "Demandes de décaissement et de remboursement."}</p>

      <div className="fin-actions" style={{ marginBottom: 18 }}>
        <Link href="/nouvelle?type=remboursement" className="fin-btn">
          + Remboursement
        </Link>
        <Link href="/nouvelle?type=decaissement" className="fin-btn blanc">
          + Décaissement
        </Link>
      </div>

      <div className="fin-stats">
        {(estLeader || finances) && (
          <div className={`fin-stat${aTraiter ? " accent" : ""}`}>
            <div className="n">{aTraiter}</div>
            <div className="l">À traiter par moi</div>
          </div>
        )}
        <div className="fin-stat">
          <div className="n">{enCours.length}</div>
          <div className="l">Mes demandes en cours</div>
        </div>
        <div className={`fin-stat${aReviser.length ? " accent" : ""}`}>
          <div className="n">{aReviser.length}</div>
          <div className="l">Renvoyées pour révision</div>
        </div>
        {finances ? (
          <div className="fin-stat">
            <div className="n">{formatMontant(totalAPayer)}</div>
            <div className="l">Approuvé, à payer</div>
          </div>
        ) : (
          <div className="fin-stat">
            <div className="n">{formatMontant(recu)}</div>
            <div className="l">Reçu (payé)</div>
          </div>
        )}
      </div>

      {aReviser.length > 0 && (
        <>
          <h2>⚠️ À réviser ou annuler</h2>
          <DemandeListe demandes={aReviser} vide="" />
        </>
      )}

      {estLeader && (
        <>
          <h2>À approuver — {moi.ministere ? `ministère ${moi.ministere}` : "1ʳᵉ approbation"}</h2>
          <DemandeListe demandes={aApprouverLeader} avecDemandeur vide="Aucune demande en attente de votre approbation." />
        </>
      )}

      {finances && (
        <>
          <h2>À approuver — finances</h2>
          <DemandeListe demandes={aApprouverFinances} avecDemandeur vide="Aucune demande en attente des finances." />
          <h2>Approuvées — à payer</h2>
          <DemandeListe demandes={aPayer} avecDemandeur vide="Aucun paiement en attente." />
        </>
      )}

      <h2>Mes demandes</h2>
      <DemandeListe demandes={mes} vide="Vous n'avez encore fait aucune demande." />

      {estLeader && equipe.length > 0 && (
        <>
          <h2>Autres demandes {moi.ministere ? `du ministère ${moi.ministere}` : "que j'ai approuvées"}</h2>
          <DemandeListe demandes={equipe} avecDemandeur vide="" />
        </>
      )}
    </>
  );
}
