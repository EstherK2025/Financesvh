import type { Role } from "./finances";

// Onglets de la plateforme selon le niveau (barre du haut, barre du bas sur
// téléphone, et ordre du glissement gauche / droite entre les pages).
export type Onglet = { href: string; label: string; court: string; icone: "accueil" | "plus" | "liste" | "personnes" | "reglages" | "compte" | "ministere" };

export function onglets(role: Role | null | undefined): Onglet[] {
  if (!role) return [];
  if (role === "delegue") return [{ href: "/", label: "Demandes à approuver", court: "À approuver", icone: "accueil" }];
  return [
    { href: "/", label: "Tableau de bord", court: "Accueil", icone: "accueil" },
    { href: "/nouvelle", label: "Nouvelle demande", court: "Demander", icone: "plus" },
    ...(role === "admin" ? [{ href: "/ministere", label: "Mon ministère", court: "Ministère", icone: "ministere" as const }] : []),
    ...(role === "superadmin"
      ? [
          { href: "/toutes", label: "Toutes les demandes", court: "Toutes", icone: "liste" as const },
          { href: "/utilisateurs", label: "Utilisateurs", court: "Comptes", icone: "personnes" as const },
          { href: "/reglages", label: "Réglages", court: "Réglages", icone: "reglages" as const },
        ]
      : []),
    { href: "/compte", label: "Mon compte", court: "Compte", icone: "compte" },
  ];
}

// Onglet actif pour une adresse (les pages /demande/… restent sous l'accueil).
export function indexOnglet(liste: Onglet[], path: string): number {
  let meilleur = -1;
  liste.forEach((o, i) => {
    if (o.href === "/" ? path === "/" : path === o.href || path.startsWith(o.href + "/")) meilleur = i;
  });
  return meilleur;
}
