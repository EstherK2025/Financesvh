import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUTS, formatMontant, type Statut } from "@/lib/finances";
import { exigerUtilisateur } from "../components/garde";
import DemandeListe from "../components/DemandeListe";

export const dynamic = "force-dynamic";

// Administrateur d'un ministère : toutes les demandes de ses départements,
// par département et par statut. Il approuve ou refuse (retour au département)
// depuis chaque demande.
export default async function MinisterePage({ searchParams }: { searchParams: Promise<{ departement?: string; statut?: string }> }) {
  const moi = await exigerUtilisateur();
  const sp = await searchParams;
  if (moi.role !== "admin" || !moi.ministere)
    return (
      <>
        <h1>Mon ministère</h1>
        <div className="fin-vide">Cette page est réservée aux comptes administrateurs d&apos;un ministère.</div>
      </>
    );

  // Demandes du ministère : par le ministère enregistré sur la demande, ou parce
  // que ce compte en est l'approbateur.
  const filtreMinistere = { OR: [{ ministere: moi.ministere }, { approbateurId: moi.id }] };
  const [departements, toutes] = await Promise.all([
    prisma.finUtilisateur.findMany({ where: { leaderId: moi.id }, select: { departement: true }, orderBy: { departement: "asc" } }),
    prisma.finDemande.findMany({
      where: filtreMinistere,
      orderBy: { createdAt: "desc" },
      include: { demandeur: { select: { titre: true, prenom: true, nom: true, ministere: true, departement: true } } },
    }),
  ]);
  const departement = sp.departement || "";
  const statut = sp.statut && sp.statut in STATUTS ? sp.statut : "";
  const liste = toutes.filter((d) => (!departement || d.departement === departement) && (!statut || d.statut === statut));

  // Totaux par département (demandes non annulées).
  const noms = [...new Set([...departements.map((x) => x.departement || ""), ...toutes.map((d) => d.departement || "")])].filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
  const parDep = noms.map((nom) => {
    const ds = toutes.filter((d) => d.departement === nom && d.statut !== "annulee");
    return {
      nom,
      nb: ds.length,
      aApprouver: ds.filter((d) => d.statut === "attente_leader" && d.approbateurId === moi.id).length,
      demande: ds.reduce((s, d) => s + d.montant, 0),
      paye: ds.filter((d) => d.statut === "payee").reduce((s, d) => s + d.montant, 0),
    };
  });
  const aApprouver = toutes.filter((d) => d.statut === "attente_leader" && d.approbateurId === moi.id);

  const lien = (p: Record<string, string>) => {
    const q = new URLSearchParams({ ...(departement ? { departement } : {}), ...(statut ? { statut } : {}) });
    for (const [k, v] of Object.entries(p)) (v ? q.set(k, v) : q.delete(k));
    const s = q.toString();
    return `/ministere${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <h1>Ministère {moi.ministere}</h1>
      <p className="sous">
        Toutes les demandes de vos départements. Ouvrez une demande pour l&apos;approuver ou la refuser : un refus la renvoie au
        département concerné, avec votre motif, pour correction ou annulation.
      </p>

      <h2>À approuver ({aApprouver.length})</h2>
      <DemandeListe demandes={aApprouver} avecDemandeur vide="Aucune demande en attente de votre approbation." />

      <h2>Par département</h2>
      {parDep.length === 0 ? (
        <div className="fin-vide">Aucun département rattaché à ce ministère.</div>
      ) : (
        <div className="fin-scroll">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Département</th>
                <th style={{ textAlign: "right" }}>Demandes</th>
                <th style={{ textAlign: "right" }}>À approuver</th>
                <th style={{ textAlign: "right" }}>Demandé</th>
                <th style={{ textAlign: "right" }}>Payé</th>
              </tr>
            </thead>
            <tbody>
              {parDep.map((l) => (
                <tr key={l.nom}>
                  <td>
                    <Link href={lien({ departement: l.nom })}>{l.nom}</Link>
                  </td>
                  <td className="num">{l.nb}</td>
                  <td className="num">{l.aApprouver || ""}</td>
                  <td className="num">{formatMontant(l.demande)}</td>
                  <td className="num">{formatMontant(l.paye)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Toutes les demandes{departement ? ` — ${departement}` : ""}</h2>
      <div className="fin-filtres">
        <Link href={lien({ departement: "" })} className={!departement ? "actif" : ""}>
          Tous les départements
        </Link>
        {noms.map((n) => (
          <Link key={n} href={lien({ departement: n })} className={departement === n ? "actif" : ""}>
            {n}
          </Link>
        ))}
      </div>
      <div className="fin-filtres">
        <Link href={lien({ statut: "" })} className={!statut ? "actif" : ""}>
          Tous statuts
        </Link>
        {(Object.keys(STATUTS) as Statut[]).map((k) => (
          <Link key={k} href={lien({ statut: k })} className={statut === k ? "actif" : ""}>
            {STATUTS[k]}
          </Link>
        ))}
      </div>
      <DemandeListe demandes={liste} avecDemandeur vide="Aucune demande pour ces filtres." />
    </>
  );
}
