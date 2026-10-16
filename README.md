# Finances VH — Département des finances de Vases d'Honneur

Plateforme web **interne** (site de GA Joël) pour les **demandes de décaissement
et de remboursement** : chaque membre fait ses demandes en ligne, l'administrateur de son ministère les
approuve, puis les finances approuvent et paient.

Construite avec **Next.js (App Router)** + **Prisma** (Postgres), déployable sur
**Vercel**.

---

## Circuit d'approbation

```
Département (utilisateur) ──▶ son ministère (administrateur) ──▶ finances (super administrateur) ──▶ payée
        ▲                             │ refus                              │ refus
        └─────────────────────────────┴────────────────────────────────────┘  retour : corriger et renvoyer, ou annuler
```

- **Décaissement** : demande de fonds avant la dépense (devis facultatif).
- **Remboursement** : **facture obligatoire** (photo ou PDF ; les photos sont
  réduites automatiquement dans le navigateur).
- Chaque demande a une **catégorie** : Location matériel, Hébergement,
  Location voiture, Repas, Livres, Produits de nettoyage → liste modifiable
  dans `lib/finances.ts`.
- La page « Toutes les demandes » donne les **totaux par ministère** et **par
  catégorie** (demandé / approuvé / payé) et un **export CSV** (avec ministère
  et département).
- Un refus exige un **motif**, transmis au demandeur. Historique complet de
  chaque étape. Courriel automatique à chaque étape.
- Personne n'approuve sa propre demande. Le **super administrateur choisit à qui
  envoyer sa demande** (1ʳᵉ approbation).

## Page « Mon ministère » (administrateur)

L'administrateur d'un ministère voit **toutes les demandes de ses
départements** : à approuver, totaux par département, liste filtrable par
département et par statut. Depuis chaque demande, il **approuve** (elle passe
aux finances) ou **refuse avec un motif** (elle retourne au département qui
l'a faite, pour correction ou annulation).

## Fiche PDF de chaque demande (super administrateur)

Sur chaque demande : **« Imprimer (PDF) »** et **« Télécharger pour classer »**
(aussi la colonne ⬇️ de « Toutes les demandes »). Le PDF contient le logo, le
montant, l'objet, le **nom du demandeur** avec son ministère et son
département, les **noms et dates des approbations** (ministère, finances,
paiement et référence), l'historique complet, des lignes de signature, puis
les **factures jointes** (photos et pages des PDF). Nom du fichier :
`FIN-0001 - Departement Tribus - Objet.pdf`.

## Niveaux (alignés sur Rapports VH)

| Niveau | Correspond à | Peut… |
| --- | --- | --- |
| Utilisateur | un **département** | faire des demandes, suivre / corriger / annuler les siennes |
| Administrateur | un **ministère** | + voir toutes les demandes de son ministère, approuver en premier celles de ses départements |
| Super administrateur | les finances (GA Maïté — `estherk`) | + approuver aux finances, marquer payé, tout voir, créer et gérer tous les comptes |

Dans **Utilisateurs** (super administrateur), les comptes sont rangés par
ministère. Le super administrateur peut :
- **ajouter** un compte (« + Ajouter un compte » ou « + Ajouter un département
  à … ») en choisissant son **niveau** ;
- **modifier** un compte : nom de la personne (ou l'effacer), identifiant,
  courriel, niveau, ministère, département ;
- **désactiver / réactiver** un compte ;
- **supprimer** un compte. Un compte qui a déjà fait des demandes ne peut pas
  être supprimé (historique financier) : il se désactive. Supprimer le compte
  d'un ministère laisse ses départements « sans ministère » et envoie ses
  demandes en attente directement aux finances.

Chaque compte représente un **ministère** ou un **département**. Le **titre**
(GA, AP, PA, AE, AM ou Responsable) et le **nom de la personne responsable**
(ex. « GA John Doe ») sont saisis par elle-même à sa **première connexion**
(avec son nouveau mot de passe) ; tant qu'il manque, le compte s'affiche sous
le nom du ministère ou du département.

### Organigramme VH (8 ministères, 48 départements)

La liste des ministères et départements (« Panorama des départements ») est
dans `lib/organigramme.ts`, avec l'identifiant de chaque compte :

| Ministère (identifiant) | Départements |
| --- | --- |
| Expansion (`min-expansion`) | Évangélisation et Encadrement, Famille d'honneur, Conquête, Cellules et Maisons d'honneur |
| Intégration (`min-integration`) | Tribus, Amis des nouveaux, Amis de l'assemblée RAM, Intégration, Smalahs, GEM, Drive d'honneur |
| Affermissement (`min-affermissement`) | Plume d'honneur, Interprétariat et Traduction, Académie d'honneur, Porteur de vie, Baptême, MRES |
| Intimité (`min-intimite`) | Intercession, Sainte cène, Groupe de louange, Adoration gestuelle |
| Famille (`min-famille`) | LEAMAN, Kanegnon, Âge d'or, Eden 1 et 2, Couples d'honneur, Enfants d'honneur, G1, BLOOM |
| Assistance (`min-assistance`) | RESHO 121 / ELEEO / Emploi d'honneur, Cœur d'honneur / ONG pour Sauver, Médecine d'honneur |
| Administration (`min-administration`) | Secrétariat, Finances, Patrimoine et Construction d'honneur, Moyens généraux / Cleaning, Comptage / Responsable Rapport, Com / D.TIC / Plateau Télé / Sono, Librairie et l'Atelier |
| Cultes et programmes spéciaux (`min-cultes`) | Portiers, Protocole, Gestion des cultes, Modération des cultes, Organisation des programmes spéciaux, Décoration, Loge et soins pastoraux, Wedding Planners, Événements spéciaux |

Dans **Utilisateurs**, le bouton **« Créer les comptes de l'organigramme »**
crée d'un coup les 56 comptes (relancer ne crée que ceux qui manquent).
Chaque compte reçoit le courriel `identifiant@evhnb.ca`. Donner à chaque
personne son **identifiant** et le **mot de passe temporaire universel** : à sa
première connexion, elle crée son mot de passe puis valide le code reçu par
courriel. Identifiants : voir `lib/organigramme.ts` (ex. `tribus`, `louange`,
`finances`, `min-integration`).

> Avec un seul super administrateur, ses propres demandes ne peuvent pas être
> approuvées aux finances (personne n'approuve sa propre demande) : ajouter un
> second super administrateur le moment venu.

## Sécurité

- Connexion par **identifiant** (ex. `estherk`, `tribus`) ou courriel.
- **Première connexion** : identifiant + **mot de passe temporaire universel**
  → la personne **crée son propre mot de passe** (10 caractères min.,
  majuscule, minuscule, chiffre) → elle est connectée (après avoir configuré
  l'application **Authenticator** si la double authentification est activée). Le mot de passe temporaire ne fonctionne plus ensuite pour ce
  compte (ni pour un compte déjà activé).
- Le mot de passe temporaire universel est **affiché au super administrateur**
  (Utilisateurs et Réglages) et modifiable dans **Réglages**. Il est généré au
  hasard à l'installation (format `VH-XXXXXX`).
- Courriel de chaque compte : **`identifiant@evhnb.ca`** (ex. `tribus@evhnb.ca`),
  sauf si un autre est saisi. Ces boîtes doivent exister : elles reçoivent les
  codes de connexion.
- Autre possibilité : bouton « Lien d'activation » (lien personnel à envoyer).
- **Double authentification par application Authenticator** (Google
  Authenticator, Microsoft Authenticator… — codes TOTP à 6 chiffres, toutes
  les 30 s, aucun courriel nécessaire) : **désactivée par défaut**, le super
  administrateur l'active dans **Réglages**. À sa connexion suivante, chaque
  personne scanne un QR code une seule fois, puis entre le code de
  l'application à chaque connexion. Un code ne sert qu'une fois ; 5 codes
  faux = compte verrouillé 15 min. Téléphone perdu ou changé : bouton
  **« Réinit. Authenticator »** dans Utilisateurs. Verrouillage 15 min après 5 mots de passe
  erronés. « Mot de passe oublié » par lien courriel.
- Factures stockées en base, visibles uniquement par le demandeur, son
  approbateur et les finances. Pages non indexées par les moteurs de recherche.

## Couleurs, logo et navigation

- **Logo** : le logo complet Vases d'Honneur (`public/vh-logo.png`) en haut de
  chaque page, sur les pages de connexion et sur les fiches PDF. Le super
  administrateur peut le remplacer dans **Réglages** (meilleure qualité).
- **Couleurs** (tirées du logo) : vert `#2d6a66`, or `#ccb042`, rouge `#ae302f`
  — variables en haut de `app/globals.css`. Liseré vert · or · rouge sous la
  barre du haut, bandeau d'accueil en dégradé vert.
- **Téléphone** : barre d'onglets en bas de l'écran ; **glisser vers la
  gauche / la droite** pour passer à l'onglet suivant / précédent (avec
  animation de glissement).

## Signatures

Approuver une demande = **signer** dans le cadre prévu (doigt, stylet ou
souris), pour le ministère (1re approbation) comme pour les finances. La
signature, le **nom**, la **fonction** et la **date** apparaissent
automatiquement dans l'historique et dans le bloc « Signatures » de la fiche
PDF.

## Approbateur externe (compte partagé)

Un **seul** compte, créé dans **Réglages**, avec un **identifiant et un mot de
passe fixes**, pour les personnes qui ne sont ni super administrateur ni
ministère / département. Il ne voit que les demandes qui lui sont
**attribuées** (le super administrateur lui envoie sa demande, ou utilise
« Attribuer la 1re approbation » sur une demande en attente). Avant
d'approuver, la personne connectée indique son **nom complet**, sa **fonction
dans l'église**, sa **signature** et **pourquoi c'est elle qui approuve** —
tout figure sur la fiche PDF. Ce compte ne fait pas de demande et ne change pas
son mot de passe (pas d'Authenticator).

## Titres

Le titre (GA, AP, PA, AE, AM, Responsable…) se choisit **à part** du prénom, à
la première connexion ou par le super administrateur. La **liste des titres**
se modifie dans **Réglages** (ajouter, retirer, réordonner).

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

Sans `RESEND_API_KEY`, les courriels (notifications, liens d'activation) sont
simulés : ils s'affichent dans la console du serveur. La connexion n'en dépend
pas (la double authentification passe par l'application Authenticator).

## Mise en ligne (Vercel)

1. Base Postgres sur https://neon.tech → `DATABASE_URL`.
2. Compte https://resend.com avec le domaine vérifié → `RESEND_API_KEY`, `EMAIL_FROM`.
3. Importer ce dépôt dans Vercel, renseigner les variables de `.env.example`
   (`FIN_SETUP_PASSWORD` et `FIN_SECRET` : valeurs longues et aléatoires).
4. Domaine (ex. `finances.eventsevhnb.ca`) : Vercel → Réglages → Domaines + DNS ;
   mettre la même adresse dans `NEXT_PUBLIC_BASE_URL`.

Le build applique automatiquement le schéma à la base (`prisma db push`).
