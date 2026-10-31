import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUTS, TYPES, formatMontant, type Statut } from "@/lib/finances";
import { exigerUtilisateur } from "../components/garde";
import DemandeListe from "../components/DemandeListe";
import { categories } from "@/lib/fin-reglages";

export const dynamic = "force-dynamic";

// Vue des finances : toutes les demandes, filtres et totaux par catégorie.
export default async function ToutesPage({ searchParams }: { searchParams: Promise<{ statut?: string; type?: string; annee?: string }> }) {
  await exigerUtilisateur(true);
  const sp = await searchParams;
  const statut = sp.statut && sp.statut in STATUTS ? sp.statut : "";
  const type = sp.type && sp.type in TYPES ? sp.type : "";
  const annee = /^\d{4}$/.test(sp.annee || "") ? Number(sp.annee) : new Date().getFullYear();
  const periode = { gte: new Date(`${annee}-01-01T00:00:00Z`), lt: new Date(`${annee + 1}-01-01T00:00:00Z`) };

  const [demandes, parCategorie, parMinistere] = await Promise.all([
    prisma.finDemande.findMany({
      where: { createdAt: periode, ...(statut ? { statut } : {}), ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
      include: { demandeur: { select: { titre: true, prenom: true, nom: true, ministere: true, departement: true } } },
      take: 500,
    }),
    prisma.finDemande.groupBy({
      by: ["categorie", "statut"],
      where: { createdAt: periode, statut: { not: "annulee" }, ...(type ? { type } : {}) },
      _sum: { montant: true },
      _count: true,
    }),
    prisma.finDemande.groupBy({
      by: ["ministere", "statut"],
      where: { createdAt: periode, statut: { not: "annulee" }, ...(type ? { type } : {}) },
      _sum: { montant: true },
      _count: true,
    }),
  ]);

  // Totaux par ministère (même calcul que par catégorie).
  const mins = new Map<string, { nb: number; demande: number; approuve: number; paye: number }>();
  for (const g of parMinistere) {
    const k = g.ministere || "Sans ministère";
    const c = mins.get(k) || { nb: 0, demande: 0, approuve: 0, paye: 0 };
    const m = g._sum.montant || 0;
    c.nb += g._count;
    c.demande += m;
    if (g.statut === "approuvee" || g.statut === "payee") c.approuve += m;
    if (g.statut === "payee") c.paye += m;
    mins.set(k, c);
  }
  const lignesMin = [...mins.entries()].sort(([a], [b]) => a.localeCompare(b, "fr")).map(([k, v]) => ({ categorie: k, ...v }));

  // Totaux par catégorie : demandé (non annulé), approuvé, payé.
  const cats = new Map<string, { nb: number; demande: number; approuve: number; paye: number }>();
  for (const g of parCategorie) {
    const c = cats.get(g.categorie) || { nb: 0, demande: 0, approuve: 0, paye: 0 };
    const m = g._sum.montant || 0;
    c.nb += g._count;
    c.demande += m;
    if (g.statut === "approuvee" || g.statut === "payee") c.approuve += m;
    if (g.statut === "payee") c.paye += m;
    cats.set(g.categorie, c);
  }
  const listeCats = await categories();
  const ordre = [...listeCats, ...[...cats.keys()].filter((k) => !listeCats.includes(k))];
  const lignes = ordre.filter((k) => cats.has(k)).map((k) => ({ categorie: k, ...cats.get(k)! }));
  const lien = (p: Record<string, string | number>) => {
    const q = new URLSearchParams({ ...(statut ? { statut } : {}), ...(type ? { type } : {}), annee: String(annee) });
    for (const [k, v] of Object.entries(p)) (v === "" ? q.delete(k) : q.set(k, String(v)));
    return `/toutes?${q}`;
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1>Toutes les demandes — {annee}</h1>
        <div className="fin-actions">
          <Link href={lien({ annee: annee - 1 })} className="fin-btn blanc petit">
            ← {annee - 1}
          </Link>
          <Link href={lien({ annee: annee + 1 })} className="fin-btn blanc petit">
            {annee + 1} →
          </Link>
          <a href="/api/export" className="fin-btn petit">
            Export CSV (Excel)
          </a>
        </div>
      </div>

      <h2>Par ministère</h2>
      <TableauTotaux lignes={lignesMin} titre="Ministère" />

      <h2>Par catégorie</h2>
      <TableauTotaux lignes={lignes} titre="Catégorie" />

      <h2>Liste</h2>
      <div className="fin-filtres">
        <Link href={lien({ type: "" })} className={!type ? "actif" : ""}>
          Tous types
        </Link>
        {Object.entries(TYPES).map(([k, l]) => (
          <Link key={k} href={lien({ type: k })} className={type === k ? "actif" : ""}>
            {l}
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
      <DemandeListe demandes={demandes} avecDemandeur pdf vide="Aucune demande pour ces filtres." />
    </>
  );
}

type LigneTotal = { categorie: string; nb: number; demande: number; approuve: number; paye: number };

function TableauTotaux({ lignes, titre }: { lignes: LigneTotal[]; titre: string }) {
  if (lignes.length === 0) return <div className="fin-vide">Aucune demande sur cette période.</div>;
  const tot = lignes.reduce((s, l) => ({ nb: s.nb + l.nb, demande: s.demande + l.demande, approuve: s.approuve + l.approuve, paye: s.paye + l.paye }), { nb: 0, demande: 0, approuve: 0, paye: 0 });
  return (
    <div className="fin-scroll">
      <table className="fin-table">
        <thead>
          <tr>
            <th>{titre}</th>
            <th style={{ textAlign: "right" }}>Demandes</th>
            <th style={{ textAlign: "right" }}>Demandé</th>
            <th style={{ textAlign: "right" }}>Approuvé</th>
            <th style={{ textAlign: "right" }}>Payé</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.categorie}>
              <td>{l.categorie}</td>
              <td className="num">{l.nb}</td>
              <td className="num">{formatMontant(l.demande)}</td>
              <td className="num">{formatMontant(l.approuve)}</td>
              <td className="num">{formatMontant(l.paye)}</td>
            </tr>
          ))}
          <tr style={{ background: "var(--fin-fond)" }}>
            <td>
              <b>Total</b>
            </td>
            <td className="num">{tot.nb}</td>
            <td className="num">{formatMontant(tot.demande)}</td>
            <td className="num">{formatMontant(tot.approuve)}</td>
            <td className="num">{formatMontant(tot.paye)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
