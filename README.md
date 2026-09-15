# Ludothèque du groupe

Application locale de ludothèque pour un petit groupe d'amis. Elle permet de parcourir les jeux, gérer une collection, organiser des parties et simuler les emprunts.

## Lancer le projet

Prérequis : Node.js 18 ou plus récent.

```powershell
npm install
npm run dev
```

Ouvrir ensuite l'URL affichée par Vite, généralement `http://127.0.0.1:5173/`.

Le mode local est utilisé automatiquement si les variables Supabase sont absentes. Les collections, favoris, parties, demandes et prêts sont alors conservés dans le `localStorage` du navigateur. Pour utiliser les comptes Supabase, créer `.env.local` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
BGG_API_TOKEN=votre-token-bgg
```

Avec ces variables, l'inscription et la connexion sont actives. `VITE_LOCAL_DEMO_MODE=true` permet de forcer le mode local même si Supabase est configuré.

Le token BGG est volontairement une variable serveur sans préfixe `VITE_`. Les appels passent par le proxy Vite `/api/bgg` afin de ne jamais exposer ce secret dans le navigateur. En cas de token BGG déjà publié dans le code, il faut le révoquer et en générer un nouveau avant de renseigner `.env.local`.

## Build

```powershell
npm run build
```

## Déploiement Vercel

Le projet contient une fonction serveur `api/bgg/[...path].ts` afin que le token BGG ne soit jamais exposé au navigateur. Dans Vercel, ajouter les variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `BGG_API_TOKEN` dans les environnements Preview et Production, puis déployer avec `vercel --prod`.

## Supabase

Le projet contient les migrations SQL et le client Supabase pour une future activation du mode partagé :

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_business_rules.sql`
- `supabase/migrations/003_profiles.sql`
- `supabase/migrations/005_admin_authorization.sql`

Appliquer les migrations dans l'ordre. La migration `005_admin_authorization.sql` conserve les profils déjà marqués `admin`, empêche l'auto-attribution de ce rôle et donne aux administrateurs tous les droits RLS sur les tables de l'application. Pour créer le premier administrateur, inscrire son compte puis exécuter dans l'éditeur SQL Supabase :

```sql
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@exemple.fr');
```

## Pages principales

- `/` : accueil du groupe
- `/games` : catalogue, recherche, filtres, favoris et fiches de jeux
- `/my-collection` : jeux ajoutés à la collection
- `/my-loans` : demandes et prêts
- `/sessions` : parties prévues et participation
- `/members` : membres et jeux partagés
- `/profile` : profil local

## Organisation

- `src/data/gameCatalog.ts` : catalogue local et sources d'images
- `src/lib/localWorkspace.ts` : persistance locale des données de test
- `src/pages/` : écrans de l'application
- `src/components/` : navigation et composants réutilisables
- `supabase/migrations/` : schéma et règles métier côté base
