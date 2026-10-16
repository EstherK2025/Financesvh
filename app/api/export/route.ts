import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/fin-auth";
import { MODES_PAIEMENT, STATUTS, TYPES, nomUtilisateur, reference } from "@/lib/finances";

// Export CSV de toutes les demandes (super admin) — ouvrable dans Excel.
export async function GET() {
  const moi = await utilisateurCourant();
  if (moi?.role !== "superadmin") return new Response("Réservé au super administrateur.", { status: 403 });
  const demandes = await prisma.finDemande.findMany({
    orderBy: { numero: "asc" },
    include: { demandeur: true, approbateur: true, _count: { select: { pieces: true } } },
  });
  const cel = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const lignes = [
    ["Référence", "Date", "Type", "Catégorie", "Objet", "Montant", "Demandeur", "Ministère", "Département", "1re approbation", "Statut", "Mode de paiement", "Bénéficiaire", "Date dépense", "Payée le", "Réf. paiement", "Pièces"],
    ...demandes.map((d) => [
      reference(d.numero),
      date(d.createdAt),
      TYPES[d.type as keyof typeof TYPES] || d.type,
      d.categorie,
      d.objet,
      (d.montant / 100).toFixed(2).replace(".", ","),
      nomUtilisateur(d.demandeur),
      d.ministere,
      d.departement,
      d.approbateur ? nomUtilisateur(d.approbateur) : "",
      STATUTS[d.statut as keyof typeof STATUTS] || d.statut,
      MODES_PAIEMENT[d.modePaiement as keyof typeof MODES_PAIEMENT] || d.modePaiement,
      d.beneficiaire,
      date(d.dateDepense),
      date(d.payeLe),
      d.referencePaiement,
      d._count.pieces,
    ]),
  ];
  const csv = "﻿" + lignes.map((l) => l.map(cel).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finances-demandes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
