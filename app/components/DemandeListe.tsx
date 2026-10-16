import Link from "next/link";
import { TYPES, formatMontant, nomUtilisateur, reference, type NomCompte, type TypeDemande } from "@/lib/finances";
import StatutTag from "./StatutTag";
import Icone from "./Icone";

export type LigneDemande = {
  id: string;
  numero: number;
  type: string;
  categorie: string;
  objet: string;
  montant: number;
  statut: string;
  createdAt: Date;
  demandeur?: NomCompte;
};

type Props = { demandes: LigneDemande[]; avecDemandeur?: boolean; vide: string; pdf?: boolean };

// pdf : colonne « PDF » (téléchargement de la fiche à classer — super administrateur).
export default function DemandeListe({ demandes, avecDemandeur = false, vide, pdf = false }: Props) {
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
            {pdf && <th>PDF</th>}
          </tr>
        </thead>
        <tbody>
          {demandes.map((d) => (
            <tr key={d.id}>
              <td style={{ whiteSpace: "nowrap" }}>
                <Link href={`/demande/${d.id}`}>{reference(d.numero)}</Link>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{d.createdAt.toLocaleDateString("fr-CA")}</td>
              {avecDemandeur && (
                <td>
                  {d.demandeur ? nomUtilisateur(d.demandeur) : ""}
                  {d.demandeur?.departement && (d.demandeur.prenom || d.demandeur.nom) && (
                    <div style={{ fontSize: 11, color: "var(--fin-gris)" }}>{d.demandeur.departement}</div>
                  )}
                </td>
              )}
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
              {pdf && (
                <td>
                  <a href={`/api/demandes/${d.id}/pdf?telecharger=1`} title="Télécharger la fiche PDF (à classer)" aria-label="Télécharger la fiche PDF">
                    <Icone nom="telecharger" taille={18} />
                  </a>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
