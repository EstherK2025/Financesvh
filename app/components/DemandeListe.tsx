import Link from "next/link";
import { TYPES, formatMontant, reference, type TypeDemande } from "@/lib/finances";
import StatutTag from "./StatutTag";

export type LigneDemande = {
  id: string;
  numero: number;
  type: string;
  categorie: string;
  objet: string;
  montant: number;
  statut: string;
  createdAt: Date;
  demandeur?: { prenom: string; nom: string };
};

export default function DemandeListe({ demandes, avecDemandeur = false, vide }: { demandes: LigneDemande[]; avecDemandeur?: boolean; vide: string }) {
  if (demandes.length === 0) return <div className="fin-vide">{vide}</div>;
  return (
    <div className="fin-scroll">
      <table className="fin-table">
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Date</th>
            {avecDemandeur && <th>Demandeur</th>}
            <th>Type</th>
            <th>Objet</th>
            <th style={{ textAlign: "right" }}>Montant</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {demandes.map((d) => (
            <tr key={d.id}>
              <td style={{ whiteSpace: "nowrap" }}>
                <Link href={`/demande/${d.id}`}>{reference(d.numero)}</Link>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{d.createdAt.toLocaleDateString("fr-CA")}</td>
              {avecDemandeur && <td>{d.demandeur ? `${d.demandeur.prenom} ${d.demandeur.nom}` : ""}</td>}
              <td>{TYPES[d.type as TypeDemande] || d.type}</td>
              <td>
                <Link href={`/demande/${d.id}`} style={{ fontWeight: 600 }}>
                  {d.objet}
                </Link>
                <div style={{ fontSize: 11, color: "var(--fin-gris)" }}>{d.categorie}</div>
              </td>
              <td className="num">{formatMontant(d.montant)}</td>
              <td>
                <StatutTag statut={d.statut} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
