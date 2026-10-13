# Ludothèque du groupe

Application web privée pour partager et se prêter des jeux de société entre amis :
catalogue commun, collections personnelles, disponibilité réelle de chaque exemplaire,
demandes d'emprunt, prêts, retours et historique.

Site en production : https://bibliotheque-partagee-tau.vercel.app (hébergement Vercel).

## Sommaire

1. [Fonctionnement en bref](#fonctionnement-en-bref)
2. [Lancer le projet](#lancer-le-projet)
3. [Mode local et mode Supabase](#mode-local-et-mode-supabase)
4. [Variables d'environnement](#variables-denvironnement)
5. [Base de données Supabase et migrations](#base-de-données-supabase-et-migrations)
6. [Fiches de jeux et BoardGameGeek](#fiches-de-jeux-et-boardgamegeek)
7. [Tests](#tests)
8. [Déploiement sur Vercel](#déploiement-sur-vercel)
9. [Organisation du code](#organisation-du-code)
10. [Limites connues](#limites-connues)

## Fonctionnement en bref

- **Jeu (fiche)** : la description d'un jeu, commune à tout le groupe.
- **Exemplaire** : une boîte possédée par un membre. Un même jeu peut avoir plusieurs exemplaires
  (un par propriétaire). Chaque exemplaire est *disponible*, *prêté* ou *indisponible*.
- **Demande** : un membre demande un exemplaire précis à son propriétaire. Une demande en attente
  ne change pas la disponibilité.
- **Prêt** : créé uniquement quand le propriétaire accepte. L'exemplaire passe « prêté », les autres
  demandes pour ce même exemplaire sont refusées automatiquement.
- **Retour** : confirmé par le **propriétaire** (c'est lui qui récupère son jeu). Le prêt est clôturé,
  l'exemplaire redevient disponible, et le prêt reste dans l'historique.
- Retirer un jeu de sa collection l'**archive** : il disparaît du catalogue, mais l'historique des
  prêts passés reste lisible. Un jeu prêté ne peut pas être retiré.

**Prévenir sur WhatsApp ou Messenger** : après une demande, une acceptation, un refus (ou pour un
rappel de retour), le site propose d'ouvrir WhatsApp ou Messenger avec un message déjà rédigé ; il
suffit d'appuyer sur « Envoyer ». Rien n'est envoyé automatiquement et aucun service extérieur n'est
utilisé. Chacun peut renseigner son numéro WhatsApp et son lien Messenger dans son profil (visibles des
seuls membres connectés) pour que la conversation s'ouvre directement ; sinon, on choisit soi-même le
contact ou le groupe. Pour Messenger, le message est copié et il faut le coller.

Fonctions complémentaires : favoris, filtres, liste d'attente (« me prévenir quand il revient »),
import de la collection BoardGameGeek d'un membre, parties prévues/jouées, page membres, administration
des fiches (conversion des anciennes fiches, correction, mise à jour depuis BGG), échanges définitifs de propriété
(mode Supabase uniquement).

## Lancer le projet

Prérequis : Node.js 18 ou plus récent.

```bash
npm install
npm run dev        # serveur de développement (http://localhost:5173)
npm test           # tests automatisés
npm run build      # vérification TypeScript + version de production dans dist/
```

## Mode local et mode Supabase

| | Mode local | Mode Supabase |
|---|---|---|
| Quand ? | Variables Supabase absentes, ou `VITE_LOCAL_DEMO_MODE=true` | `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` renseignées |
| Données | `localStorage` de **ce navigateur uniquement** | Base partagée par tous les membres |
| Comptes | Profils de démonstration (sans mot de passe) | Comptes email + mot de passe |
| Échanges | Non disponibles | Disponibles |

⚠️ Le mode local **ne synchronise rien** entre les membres. Il sert à essayer l'application ou à la
développer sans base. On peut y créer plusieurs profils pour simuler un prêt entre deux personnes.
Un bandeau l'indique en permanence.

Les données de l'ancienne version locale (clés `bibliotheque-local-*`) ne sont jamais effacées :
la collection, les favoris et les parties sont rattachés au premier profil local créé. Les anciennes
demandes/prêts, enregistrés par nom et sans lien fiable vers un exemplaire, ne sont pas repris.

## Variables d'environnement

Copier `.env.example` en `.env.local` (jamais commité) :

| Variable | Où | Rôle |
|---|---|---|
| `VITE_SUPABASE_URL` | navigateur | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | navigateur | clé **publique** « anon » (la sécurité repose sur les règles RLS) |
| `BGG_API_TOKEN` | **serveur uniquement** | jeton de l'API BoardGameGeek |
| `VITE_LOCAL_DEMO_MODE` | navigateur, facultatif | `true` pour forcer le mode local |

Toute variable commençant par `VITE_` est publiée dans le navigateur. **Ne jamais** y mettre la clé
`service_role` de Supabase ni le jeton BGG.

## Base de données Supabase et migrations

Les migrations sont dans `supabase/migrations/`. Toutes sont non destructives.

**Application automatique** : le projet Supabase est relié au dépôt GitHub (intégration GitHub de
Supabase). À chaque arrivée sur `main`, Supabase applique les migrations qu'il n'a pas encore
enregistrées ; le résultat apparaît dans la vérification « Supabase Preview » du commit. Toutes les
migrations sont donc **rejouables** sans erreur et sans modifier les données, ce que vérifie
`supabase/tests/replay.test.ts`. Règle pour toute nouvelle migration : `IF NOT EXISTS`,
`DROP … IF EXISTS` avant `CREATE POLICY` / `CREATE TRIGGER` / `ADD CONSTRAINT`, `CREATE OR REPLACE`
pour les fonctions, aucune donnée de démonstration.

| Fichier | Contenu |
|---|---|
| 001 | Tables jeux, exemplaires, demandes, prêts + règles RLS de base |
| 002 | Contraintes de statut, un seul prêt actif par exemplaire, fonctions de prêt |
| 003 | Profils des membres |
| 004 | Favoris, sources, avis, parties |
| 005 | Rôle administrateur |
| 006 | Échanges |
| 007 | Pseudos |
| 008 | Un exemplaire par jeu et par membre |
| 009 | Note BGG |
| **010** | **Intégrité des prêts et confidentialité** (voir ci-dessous) — prérequis : 001, 002, 003 |
| 011 | Règles renforcées des échanges — uniquement si 006 est appliquée |
| 012 | Liste d'attente, fusion et suppression de fiches (administrateurs), correctif pour nommer un administrateur depuis l'éditeur SQL |
| 013 | Coordonnées facultatives (numéro WhatsApp, lien Messenger) pour se prévenir |
| 014 | Comptes du créateur administrateurs (comparaison par empreinte, sans adresse en clair) et suppression des anciennes fiches inutilisées |

La migration **010** :

- réserve la lecture du catalogue aux membres connectés ;
- interdit toute écriture directe des demandes, prêts et statuts d'exemplaire depuis le navigateur :
  tout passe par des fonctions SQL qui vérifient *qui* agit (`create_loan_request`,
  `accept_loan_request`, `refuse_loan_request`, `cancel_loan_request`, `return_loan`, `extend_loan`,
  `set_copy_availability`, `archive_game_copy` ; les échanges sont traités par la 011) ;
- verrouille l'exemplaire pendant une décision : deux acceptations simultanées ne peuvent pas créer
  deux prêts ;
- remplace la suppression des exemplaires par un archivage, et empêche qu'une suppression efface
  l'historique des prêts ;
- ajoute la traçabilité des fiches (titre original, identifiant BGG, extension, catégories, origine).

Pour vérifier qu'elle est appliquée, dans l'éditeur SQL :
`select proname from pg_proc where proname = 'group_active_loans';` doit renvoyer une ligne.

Premier administrateur (après son inscription) :

```sql
UPDATE public.profiles SET role = 'admin', updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@exemple.fr');
```

Recommandé pour une application privée : dans Supabase, **Authentication → Sign In / Providers**,
désactiver « Allow new users to sign up » une fois les membres inscrits, puis inviter les nouveaux
membres depuis **Authentication → Users → Invite user**.

## Fiches de jeux et BoardGameGeek

- Source privilégiée : l'API XML2 de BoardGameGeek, appelée via `/api/bgg` (proxy de développement
  dans `vite.config.ts`, fonction serveur `api/bgg/[...path].ts` en production). Seuls les points
  d'accès `search`, `thing` et `collection` sont relayés, pour les membres connectés ; le jeton reste
  côté serveur.
- Les valeurs absentes chez BGG restent vides : rien n'est complété par supposition
  (ex. un âge « 0 » chez BGG est affiché « non renseigné »).
- Chaque fiche conserve l'URL de la source et la date de récupération. Une fiche existante n'est
  jamais écrasée quand un autre membre ajoute le même jeu ; les remarques des membres sont stockées
  sur leurs exemplaires, pas sur la fiche.
- Jeu de base et extension sont distingués (l'extension est signalée dans la recherche et la fiche).
  Les éditeurs listés par BGG couvrent toutes les éditions, ce qui est indiqué sur la fiche.
- Image absente ou cassée : un visuel neutre « Image non disponible », jamais une image générée.
- Les descriptions BGG sont affichées dans leur langue d'origine (souvent l'anglais), sans traduction
  automatique.
- **Toutes les fiches viennent de BGG.** L'ancien catalogue intégré à l'application a été retiré.
  Les anciennes fiches encore présentes dans la base se convertissent depuis la page
  **Administration → Anciennes fiches à convertir** : l'application propose la fiche BGG
  correspondante (même nom, même type, même année si possible), puis rattache exemplaires, prêts,
  historique, favoris et parties à la fiche BGG (fonction `merge_games`, migration 012). Les anciennes
  fiches sans aucun exemplaire peuvent être supprimées en un clic (celles liées à un historique sont
  conservées).
- Pendant la phase de test, le script `supabase/nettoyage/nettoyage_anciennes_fiches.sql` (à lancer
  à la main dans l'éditeur SQL) supprime **définitivement** toutes les anciennes fiches et tout ce qui
  y est rattaché (exemplaires, demandes, prêts, échanges, favoris, avis, parties, liste d'attente).
  Les comptes et les fiches BGG ne sont pas touchés.

**Conditions d'utilisation à vérifier par le groupe** : l'usage de l'API BGG est soumis à ses
conditions (https://boardgamegeek.com/xmlapi/termsofuse) et à l'enregistrement de l'application ;
les images de boîtes appartiennent à leurs ayants droit. Une mention « Powered by BGG » et un lien
vers chaque fiche source sont affichés.

## Tests

```bash
npm test
```

- `src/domain/localState.test.ts` : règles de prêt (propriétaires multiples, demandes, refus,
  annulations, double emprunt, droits, retours, historique).
- `supabase/tests/migrations.test.ts` : applique **toutes les migrations** dans une base PostgreSQL
  embarquée (PGlite, aucune connexion à la vraie base) et vérifie les règles RLS et les fonctions SQL
  en se connectant successivement comme différents membres et comme visiteur anonyme.
- `src/integrations/bgg/client.test.ts` : analyse des réponses BGG (sur des réponses fictives).

## Déploiement sur Vercel

Le projet Vercel `bibliotheque-partagee` déploie automatiquement la branche `main`.

1. Dans Vercel → Settings → Environments → **Production**, renseigner `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` et `BGG_API_TOKEN` (et les mêmes pour Preview si besoin).
2. Appliquer les migrations Supabase **avant** de déployer une version qui en dépend (010).
3. Sur l'offre gratuite (Hobby), Vercel **bloque** les déploiements dont l'auteur du commit n'est pas
   rattaché au compte propriétaire du projet. Les commits doivent être signés avec une adresse liée à
   votre compte GitHub (par ex. `160581490+Ratatatatak@users.noreply.github.com`).

`vercel.json` renvoie toutes les routes (sauf `/api/*`) vers `index.html` pour la navigation.

## Organisation du code

```
src/domain/          modèle métier, règles de prêt (fonctions pures testées), vues d'affichage
src/data/            accès aux données : contrat commun + implémentations locale et Supabase
src/hooks/           authentification (useAuth) et requêtes/actions (useLibrary)
src/integrations/    client Supabase, client BoardGameGeek
src/pages/           écrans
src/components/      en-tête, composants d'interface et de ludothèque
supabase/migrations/ schéma SQL ; supabase/tests/ tests SQL
api/bgg/             fonction serveur Vercel (relais BGG)
scripts/archive/     anciens scripts (non utilisés)
docs/archive/        anciens rapports (non à jour)
```

## Limites connues

Voir le rapport de finalisation (`docs/RAPPORT_FINALISATION.md`).
