import type { Role } from "./finances";

// Tutoriel de bienvenue (affiché une fois après la première connexion) et
// page « Guide » pour le revoir. Le contenu dépend du niveau du compte.
export type Etape = { titre: string; texte: string[]; icone: "accueil" | "plus" | "recu" | "avance" | "signature" | "alerte" | "valide" | "ministere" | "liste" | "personnes" | "reglages" | "cadenas" | "aide" };

export function etapesTutoriel(role: Role): Etape[] {
  if (role === "delegue")
    return [
      {
        titre: "Bienvenue",
        icone: "accueil",
        texte: [
          "Ce compte partagé sert à approuver des demandes qui vous ont été confiées par le Département des finances.",
          "Vous voyez seulement les demandes qui attendent votre décision.",
        ],
      },
      {
        titre: "Approuver une demande",
        icone: "signature",
        texte: [
          "Ouvrez la demande, lisez le détail et consultez les factures jointes.",
          "Avant d'approuver, indiquez votre nom complet, votre fonction dans l'église et la raison pour laquelle c'est vous qui approuvez.",
          "Signez ensuite : dessinez votre signature ou écrivez vos initiales.",
        ],
      },
      {
        titre: "Refuser une demande",
        icone: "alerte",
        texte: ["Indiquez le motif du refus : la demande retourne au responsable, qui pourra la corriger et la renvoyer, ou l'annuler."],
      },
      guide,
    ];

  const etapes: Etape[] = [
    {
      titre: "Bienvenue",
      icone: "accueil",
      texte: [
        "Cette plateforme du Département des finances de Vases d'Honneur sert à faire et à suivre les demandes d'argent.",
        "Voici en quelques étapes comment elle fonctionne.",
      ],
    },
    {
      titre: "Deux types de demandes",
      icone: "recu",
      texte: [
        "Remboursement : vous avez déjà payé une dépense et vous voulez être remboursé. La facture est obligatoire.",
        "Décaissement : vous avez besoin des fonds avant la dépense (avance, paiement d'un fournisseur).",
      ],
    },
    {
      titre: "Créer une demande",
      icone: "plus",
      texte: [
        "Dans l'onglet « Créer », choisissez le type, la catégorie (location de matériel, hébergement, repas, livres…), le montant et décrivez la dépense.",
        "Joignez vos factures ou reçus (photo ou PDF), puis envoyez.",
      ],
    },
    {
      titre: "Le circuit d'approbation",
      icone: "signature",
      texte:
        role === "utilisateur"
          ? [
              "Votre demande va d'abord à votre ministère, qui l'approuve en signant.",
              "Elle passe ensuite aux finances, qui l'approuvent à leur tour puis effectuent le paiement.",
            ]
          : [
              "Vos propres demandes vont directement aux finances, qui les approuvent en signant puis effectuent le paiement.",
            ],
    },
    {
      titre: "En cas de refus",
      icone: "alerte",
      texte: [
        "Une demande refusée vous revient avec le motif du refus.",
        "Vous pouvez alors la corriger et la renvoyer, ou l'annuler.",
      ],
    },
    {
      titre: "Suivre vos demandes",
      icone: "valide",
      texte: [
        "L'onglet « Accueil » montre où en est chaque demande : en attente du ministère, en attente des finances, approuvée, payée.",
        "Touchez une demande pour voir son détail et son historique.",
      ],
    },
  ];

  if (role === "admin")
    etapes.push({
      titre: "Mon ministère",
      icone: "ministere",
      texte: [
        "L'onglet « Ministère » regroupe les demandes de tous les départements de votre ministère.",
        "Pour approuver, signez (dessin ou initiales) : votre nom, votre fonction et la date figurent sur la fiche. Pour refuser, indiquez le motif : la demande retourne au département.",
      ],
    });

  if (role === "superadmin")
    etapes.push(
      {
        titre: "Approbation et paiement",
        icone: "avance",
        texte: [
          "L'Accueil liste les demandes à approuver par les finances, puis celles à payer.",
          "Approuvez en signant, puis marquez la demande comme payée (avec la référence du paiement). Chaque demande se télécharge ou s'imprime en PDF, signatures comprises.",
        ],
      },
      {
        titre: "Comptes et réglages",
        icone: "personnes",
        texte: [
          "« Comptes » : ajouter, modifier, désactiver ou supprimer un compte ; réinitialiser le mot de passe (même personne) ou le compte (nouveau responsable).",
          "« Réglages » : mot de passe temporaire universel, titres, Authenticator, approbateur externe et suppression des demandes.",
        ],
      },
    );

  etapes.push(
    {
      titre: "Votre sécurité",
      icone: "cadenas",
      texte: [
        "Votre mot de passe est personnel : ne le partagez avec personne.",
        "Dans « Compte », vous pouvez le changer et voir vos informations. Déconnectez-vous sur un appareil partagé.",
      ],
    },
    guide,
  );
  return etapes;
}

const guide: Etape = {
  titre: "Besoin d'aide plus tard ?",
  icone: "aide",
  texte: ["Vous pouvez revoir ce tutoriel à tout moment avec le bouton « Guide » (?) en haut de l'écran."],
};
