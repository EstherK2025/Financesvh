# Finances VH — Département des finances de Vases d'Honneur

Plateforme web **interne** (site de GA Joël) pour les **demandes de décaissement
et de remboursement** : chaque membre fait ses demandes en ligne, son leader les
approuve, puis les finances approuvent et paient.

Construite avec **Next.js (App Router)** + **Prisma** (Postgres), déployable sur
**Vercel**.

---

## Circuit d'approbation

```
Utilisateur ──▶ son leader ──▶ finances (super admins) ──▶ payée
        ▲            │ refus            │ refus
        └────────────┴──────────────────┘  retour au demandeur : corriger et renvoyer, ou annuler
```

- **Décaissement** : demande de fonds avant la dépense (devis facultatif).
- **Remboursement** : **facture obligatoire** (photo ou PDF ; les photos sont
  réduites automatiquement dans le navigateur).
- Chaque demande a une **catégorie** : Location matériel, Hébergement,
  Location voiture, Repas, Livres, Produits de nettoyage →
  liste modifiable dans `lib/finances.ts`. La page « Toutes les demandes » donne
  les **totaux par catégorie** (demandé / approuvé / payé) et un **export CSV**.
- Un refus exige un **motif**, transmis au demandeur. Historique complet de
  chaque étape. Courriel automatique à chaque étape.
- Personne n'approuve sa propre demande. Un **super admin choisit à qui envoyer
  sa demande** (1ʳᵉ approbation), puis elle passe à un *autre* super admin.

## 3 niveaux d'utilisateur

| Niveau | Peut… |
| --- | --- |
| Utilisateur | faire des demandes, suivre / corriger / annuler les siennes |
| Leader | + voir et approuver en premier les demandes de son équipe (ex. AP Cindy) |
| Super admin (finances) | + approuver aux finances, marquer payé, tout voir, gérer les comptes (ex. Tata Béné, Pst Sandra, GA Maïté, GA Joël, PA GAD) |

Chaque compte a (optionnellement) un **leader** : c'est lui qui reçoit ses demandes.

## Sécurité

- Connexion par **identifiant** (ex. `estherk`) ou courriel.
- Comptes **nominatifs** : le super admin crée le compte, la personne reçoit un
  lien et choisit son mot de passe (**10 caractères min., majuscule, minuscule,
  chiffre**).
- **Double authentification** : mot de passe, puis **code à 6 chiffres reçu par
  courriel** (10 min, 5 essais). Verrouillage 15 min après 5 mots de passe
  erronés. « Mot de passe oublié » par lien courriel.
- Factures stockées en base, visibles uniquement par le demandeur, son
  approbateur et les finances. Pages non indexées par les moteurs de recherche.

## Couleurs et logo Vases d'Honneur

- **Couleurs** : 3 variables en haut du bloc « DÉPARTEMENT DES FINANCES » de
  `app/globals.css` : `--fin-primaire`, `--fin-accent`, `--fin-accent-fonce`.
- **Logo** : déposer `public/vh-logo.png` (carré). Sinon le sigle « VH » s'affiche.

---

## Démarrer en local

```bash
npm install
cp .env.example .env     # puis renseigner DATABASE_URL (Postgres)
npx prisma db push
npm run dev              # http://localhost:3002
```

Premier lancement : ouvrir le site → page **Installation**, déjà remplie avec
le premier compte (**GA Maïté**, identifiant **`estherk`**, super admin) →
saisir le courriel et `FIN_SETUP_PASSWORD` (en local, sans variable :
`installation`) → le lien pour choisir le mot de passe s'affiche à l'écran.
Ce compte crée ensuite tous les autres.

Sans `RESEND_API_KEY`, les courriels sont simulés : le code de connexion et les
liens d'activation s'affichent dans la console du serveur.

## Mise en ligne (Vercel)

1. Base Postgres sur https://neon.tech → `DATABASE_URL`.
2. Compte https://resend.com avec le domaine vérifié → `RESEND_API_KEY`, `EMAIL_FROM`.
3. Importer ce dépôt dans Vercel, renseigner les variables de `.env.example`
   (`FIN_SETUP_PASSWORD` et `FIN_SECRET` : valeurs longues et aléatoires).
4. Domaine (ex. `finances.eventsevhnb.ca`) : Vercel → Réglages → Domaines + DNS ;
   mettre la même adresse dans `NEXT_PUBLIC_BASE_URL`.

Le build applique automatiquement le schéma à la base (`prisma db push`).
