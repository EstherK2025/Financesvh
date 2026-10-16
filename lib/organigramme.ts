// ───────────────────────────────────────────────────────────
// ORGANIGRAMME VH — ministères et départements (« Panorama des départements »).
// Le super administrateur crée tous ces comptes d'un clic (Utilisateurs →
// « Créer les comptes de l'organigramme »). Chaque ministère = un compte
// administrateur ; chaque département = un compte utilisateur rattaché.
// 👉 Ajouter / renommer ici puis recliquer : seuls les comptes manquants sont créés.
// ───────────────────────────────────────────────────────────

export type Departement = { nom: string; identifiant: string };
export type Ministere = { nom: string; titre: string; identifiant: string; departements: Departement[] };

const d = (nom: string, identifiant: string): Departement => ({ nom, identifiant });

export const ORGANIGRAMME: Ministere[] = [
  {
    nom: "Expansion",
    titre: "de l'Expansion",
    identifiant: "min-expansion",
    departements: [
      d("Évangélisation et Encadrement", "evangelisation"),
      d("Famille d'honneur", "famille-honneur"),
      d("Conquête", "conquete"),
      d("Cellules et Maisons d'honneur", "cellules"),
    ],
  },
  {
    nom: "Intégration",
    titre: "de l'Intégration",
    identifiant: "min-integration",
    departements: [
      d("Tribus", "tribus"),
      d("Amis des nouveaux", "amis-nouveaux"),
      d("Amis de l'assemblée RAM", "amis-ram"),
      d("Intégration", "integration"),
      d("Smalahs", "smalahs"),
      d("GEM", "gem"),
      d("Drive d'honneur", "drive"),
    ],
  },
  {
    nom: "Affermissement",
    titre: "de l'Affermissement",
    identifiant: "min-affermissement",
    departements: [
      d("Plume d'honneur", "plume"),
      d("Interprétariat et Traduction", "traduction"),
      d("Académie d'honneur", "academie"),
      d("Porteur de vie", "porteur-de-vie"),
      d("Baptême", "bapteme"),
      d("MRES", "mres"),
    ],
  },
  {
    nom: "Intimité",
    titre: "de l'Intimité",
    identifiant: "min-intimite",
    departements: [
      d("Intercession", "intercession"),
      d("Sainte cène", "sainte-cene"),
      d("Groupe de louange", "louange"),
      d("Adoration gestuelle", "adoration-gestuelle"),
    ],
  },
  {
    nom: "Famille",
    titre: "de la Famille",
    identifiant: "min-famille",
    departements: [
      d("LEAMAN", "leaman"),
      d("Kanegnon", "kanegnon"),
      d("Âge d'or", "age-dor"),
      d("Eden 1 et 2", "eden"),
      d("Couples d'honneur", "couples"),
      d("Enfants d'honneur", "enfants"),
      d("G1", "groupe-g1"),
      d("BLOOM", "bloom"),
    ],
  },
  {
    nom: "Assistance",
    titre: "de l'Assistance",
    identifiant: "min-assistance",
    departements: [
      d("RESHO 121 / ELEEO / Emploi d'honneur", "resho121"),
      d("Cœur d'honneur / ONG pour Sauver", "coeur"),
      d("Médecine d'honneur", "medecine"),
    ],
  },
  {
    nom: "Administration",
    titre: "de l'Administration",
    identifiant: "min-administration",
    departements: [
      d("Secrétariat", "secretariat"),
      d("Finances", "finances"),
      d("Patrimoine et Construction d'honneur", "patrimoine"),
      d("Moyens généraux / Cleaning", "moyens-generaux"),
      d("Comptage / Responsable Rapport", "comptage"),
      d("Com / D.TIC / Plateau Télé / Sono", "com-dtic"),
      d("Librairie et l'Atelier", "librairie"),
    ],
  },
  {
    nom: "Cultes et programmes spéciaux",
    titre: "des Cultes et programmes spéciaux",
    identifiant: "min-cultes",
    departements: [
      d("Portiers", "portiers"),
      d("Protocole", "protocole"),
      d("Gestion des cultes", "gestion-cultes"),
      d("Modération des cultes", "moderation"),
      d("Organisation des programmes spéciaux", "programmes-speciaux"),
      d("Décoration", "decoration"),
      d("Loge et soins pastoraux", "loge"),
      d("Wedding Planners", "wedding"),
      d("Événements spéciaux", "evenements"),
    ],
  },
];

export const NB_DEPARTEMENTS = ORGANIGRAMME.reduce((s, m) => s + m.departements.length, 0);
