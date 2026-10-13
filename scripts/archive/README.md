# Scripts archivés

Anciens scripts de test et d'import, conservés pour mémoire. Ils ne font pas partie
de l'application et ne sont pas utilisés par le build.

⚠️ Certains scripts suggéraient d'utiliser une clé `service_role` Supabase. Une telle
clé ne doit **jamais** être placée dans une variable `VITE_*` (elle serait publiée
dans le navigateur). Elle ne s'utilise que dans un script exécuté sur votre
ordinateur, et ne doit jamais être commitée.
