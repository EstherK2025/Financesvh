import { STATUTS, type Statut } from "@/lib/finances";

export default function StatutTag({ statut }: { statut: string }) {
  return <span className={`fin-tag s-${statut}`}>{STATUTS[statut as Statut] || statut}</span>;
}
