import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMontant, libelleOrg, nomUtilisateur } from "@/lib/finances";
import { exigerUtilisateur } from "./components/garde";
import DemandeListe from "./components/DemandeListe";
import Icone from "./components/Icone";

export const dynamic = "force-dynamic";

const avecDemandeur = { demandeur: { select: { titre: true, prenom: true, nom: true, ministere: true, departement: true } } } as const;

export default async function TableauDeBord() {
  const moi = await exigerUtilisateur();
  if (moi.role === "delegue") return <TableauExterne id={moi.id} />;
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
      <section className="fin-hero">
        <div className="fin-hero-sur">{libelleOrg(moi.ministere, moi.departement) || "Département des finances"}</div>
        <h1>Bonjour {nomUtilisateur(moi)}</h1>
        <p className="sous">
          {aTraiter > 0
            ? `${aTraiter} demande${aTraiter > 1 ? "s" : ""} attend${aTraiter > 1 ? "ent" : ""} votre décision.`
            : "Demandes de décaissement et de remboursement, de la soumission au paiement."}
        </p>
        <div className="fin-actions">
          <Link href="/nouvelle?type=remboursement" className="fin-btn">
            <Icone nom="recu" taille={18} /> Remboursement
          </Link>
          <Link href="/nouvelle?type=decaissement" className="fin-btn blanc">
            <Icone nom="avance" taille={18} /> Décaissement
          </Link>
        </div>
      </section>

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
          <h2>À réviser ou annuler</h2>
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
          <DemandeListe demandes={aPayer} avecDemandeur pdf vide="Aucun paiement en attente." />
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

// Compte partagé d'approbateur externe : uniquement les demandes qui lui sont attribuées.
async function TableauExterne({ id }: { id: string }) {
  const [aTraiter, traitees] = await Promise.all([
    prisma.finDemande.findMany({ where: { approbateurId: id, statut: "attente_leader" }, orderBy: { createdAt: "asc" }, include: avecDemandeur }),
    prisma.finDemande.findMany({
      where: { approbateurId: id, statut: { not: "attente_leader" } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: avecDemandeur,
    }),
  ]);
  return (
    <>
      <section className="fin-hero">
        <div className="fin-hero-sur">Compte partagé</div>
        <h1>Approbateur externe</h1>
        <p className="sous" style={{ marginBottom: 0 }}>
          Ouvrez une demande : avant de décider, vous indiquerez votre nom complet, votre fonction dans l&apos;église, votre signature et
          pourquoi c&apos;est vous qui l&apos;approuvez.
        </p>
      </section>
      <h2>Demandes qui vous sont attribuées ({aTraiter.length})</h2>
      <DemandeListe demandes={aTraiter} avecDemandeur vide="Aucune demande en attente." />
      {traitees.length > 0 && (
        <>
          <h2>Déjà traitées</h2>
          <DemandeListe demandes={traitees} avecDemandeur vide="" />
        </>
      )}
    </>
  );
}
