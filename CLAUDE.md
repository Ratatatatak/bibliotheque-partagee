# CLAUDE.md — Charte de développement frontend et design émotionnel

## 1. PROFIL DE L'UTILISATEUR

L'utilisateur n'est pas développeur et ne maîtrise pas la programmation avancée.
Il travaille avec Claude Code dans VS Code principalement en langage naturel.
L'utilisateur doit pouvoir décrire ce qu'il souhaite sans avoir besoin de connaître :
- les langages de programmation ;
- l'architecture logicielle ;
- les commandes terminal ;
- les frameworks ;
- les dépendances ;
- les concepts techniques avancés.

Tu es donc responsable de toute la partie technique nécessaire à la réalisation du projet,
en mettant l'accent sur l'optimisation du frontend et du design émotionnel selon les spécifications ci-dessous.

## 2. OBJECTIF PRINCIPAL : OPTIMISATION DU FRONTEND ET DU DESIGN ÉMOTIONNEL

L'objectif n'est pas simplement de produire du code fonctionnel, mais de :
1. Créer une interface chaleureuse, conviviale et premium qui mette les jeux en héros émotionnels
2. Établir un véritable système de design émotionnel cohérent
3. Optimiser l'expérience utilisateur sur tous les appareils avec une approche chaleureuse
4. Maintenir et améliorer les fonctionnalités existantes sans les casser
5. Suivre une méthodologie structurée d'audit émotionnel → design system émotionnel → itérations émotionnelles

## 3. RÈGLE FONDAMENTALE : WORKFLOW ÉMOTIONNEL STRUCTURÉ

Avant toute modification importante du frontend émotionnel :
1. **Audit émotionnel** : Analyser l'existant pour identifier les incohérences émotionnelles et opportunités de chaleur
2. **Design System émotionnel** : Créer ou mettre à jour le système de design émotionnel (couleurs, typographie, espacements, composants avec intention émotionnelle)
3. **Itérations émotionnelles par pages** : Travailler page par page dans l'ordre de priorité émotionnelle défini
4. **Vérification émotionnelle** : S'assurer que chaque modification respecte les critères de qualité émotionnelle
5. **Documentation émotionnelle** : Maintenir à jour la documentation du design émotionnel

Ne jamais modifier l'interface émotionnelle sans suivre ce workflow émotionnel structuré.

## 4. IDENTITÉ ÉMOTIONNELLE OBLIGATOIRE

### Palette de couleurs émotionnelles (à utiliser EXCLUSIVEMENT)
- **Primaire émotionnel** : Terre cuite chaleureuse `#E27D60` - pour les boutons principaux, liens importants, invitations chaleureuses
- **Secondaire émotionnel** : Bleu canard profond `#2C5F6D` - pour le texte secondaire, bordures subtiles, arrière-plans secondaires
- **Accent émotionnel** : Vert sauge doux `#8FBC8F` - pour les éléments de succès, indicateurs positifs, validation bienveillante
- **Neutres émotionnels chaleureux** : 
  - Crème de lait `#F8F4E9` - fond principal, arrière-plans de cartes
  - Gris pierre chaude `#E2E8D0` - bordures, séparateurs, arrière-plans tertiaires
  - Brun café doux `#4A4A4A` - texte principal, icônes
  - Gris perle `#F0F0F0` - hover léger, arrière-plans discrets
- **États émotionnels** : 
  - Success clair `#A8D5BA`
  - Warning doux `#D4A574`
  - Error atténué `#E8B7B7`

**INTERDICTION ÉMOTIONNELLE** : Aucune nouvelle couleur arbitraire ne peut être introduite sans validation via ce document émotionnel.

### Typographie émotionnelle (à respecter strictement)
- **Titres émotionnels** : Police Cinzel, Playfair Display ou équivalent (élégance classique qui évoque les vieux jeux de société)
- **Corps émotionnel** : Police Lato, Open Sans ou équivalent (lisibilité optimale pour les règles de jeux)
- **Échelle émotionnelle** : Base 16px avec progression émotionnelle pensée pour le confort de lecture des règles de jeux
- **Poids émotionnels** : Light(300), Normal(400), Medium(500), SemiBold(600), Bold(700), ExtraBold(800) avec intention émotionnelle spécifique

### Espacements et grille émotionnels
- **Base émotionnelle** : 8px pour tous les espacements et marges, mais appliquée avec intention émotionnelle
- **Échelle émotionnelle** : Multiples de 8px pensés pour créer de la vraie "respiration émotionnelle" (4, 8, 12, 16, 20, 24, 32, 40, 48px...)
- **Grille émotionnelle** : Conteneur max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- **Breakpoints émotionnels** : sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px) avec intention émotionnelle spécifique à chaque seuil

### Composants émotionnels (à créer/utiliser selon le design system émotionnel)
- **Boutons émotionnels** : Variantes primaires, secondaires, outline, ghost avec états hover/focus/disabled émotionnels
- **Inputs émotionnels** : Styles cohérents avec focus visible émotionnel et états de validation bienveillants
- **Cards émotionnelles** : Ombre émotionnelle douce, rayon émotionnel accueillant, hover avec élévation subtile qui suggère la découverte
- **Badges émotionnels** : Pour catégories, mécaniques, états avec langage émotionnel
- **Modals/Popups émotionnels** : Avec arrière-plan semi-transparent chaleureux et animations d'entrée émotionnelles
- **Header émotionnel** : Élément d'accueil qui rappelle les soirées jeux entre amis
- **Navigation émotionnelle** : Qui guide plutôt que de simplement diriger

## 5. CRITÈRES DE QUALITÉ ÉMOTIONNELS OBLIGATOIRES

Une modification du frontend émotionnel est considérée comme terminée uniquement si :

### Fonctionnalité émotionnelle
- [ ] Aucune régression des fonctionnalités existantes (tests passés)
- [ ] TypeScript ne présente aucune nouvelle erreur
- [ ] Tous les liens et routing fonctionnent correctement
- [ ] Les données sont correctement affichées et mises à jour avec chaleur émotionnelle

### Design émotionnel et UX émotionnelle
- [ ] Respecte exactement la palette de couleurs émotionnelles définie ci-dessus
- [ ] Utilise uniquement l'échelle typographique émotionnelle définie
- [ ] Tous les espacements sont des multiples de 8px appliqués avec intention émotionnelle
- [ ] Les composants émotionnels utilisent les variantes définies dans le design system émotionnel
- [ ] États hover/focus/disabled émotionnels présents sur tous les éléments interactifs
- [ ] Hiérarchie émotionnelle visuelle claire (ce qui est émotionnellement important saute aux yeux)
- [ ] Informations émotionnelles essentielles immédiatement identifiables
- [ ] Jeux clairement mis en héros émotionnels de l'interface (pas les boutons/menus)
- [ ] L'interface évoque immédiatement les soirées jeux entre amis autour d'une table

### Responsive émotionnel
- [ ] Fonctionne parfaitement sur mobile (<640px), tablet (≥640px) et desktop (≥1024px) avec préservation de l'intimité émotionnelle
- [ ] Pas de débordement horizontal sur aucun appareil
- [ ] Navbar émotionnelle adaptée en hamburger menu en mobile avec ouverture chaleureuse
- [ ] Grilles émotionnelles qui s'adaptent appropriément (1col mobile découverte sérielle → 2col tablet partage découverte → 3-4col desktop exploration)
- [ ] Texte émotionnel lisible sans zoom sur tous les appareils

### Accessibilité émotionnelle
- [ ] Contraste minimum de 4.5:1 pour le texte normal mais pensé pour être doux plutôt que cliniquement net
- [ ] Tailles de touche minimum de 48x48px pour confort émotionnel
- [ ] Focus émotionnel visible et accessible sur tous les éléments interactifs
- [ ] Labels émotionnels explicites pour tous les contrôles de formulaire
- [ ] Structure émotionnelle sémantique correcte (headers, listes, régions) avec pensée narrative
- [ ] Éviter les éléments qui créent de l'anxiété ou de la frustration inutile

### Performance émotionnelle
- [ ] Temps de chargement initial < 3s sur réseau 3G simulé
- [ ] Utilisation appropriée de lazy loading pour les images émotionnelles
- [ ] Aucune blocking JavaScript inutile dans le head
- [ ] Optimisation du rendu des listes longues émotionnelles si nécessaire
- [ ] Les animations émotionnelles sont présentes mais subtiles (pas de distraction, juste de la vie émotionnelle)

## 6. PROCÉDURE D'AUDIT ÉMOTIONNEL PRÉALABLE

Avant de modifier une page ou un composant émotionnel, tu dois répondre à ces questions émotionnelles :

1. **Qu'est-ce qui manque actuellement de chaleur et de convivialité dans l'interface émotionnelle ?**
2. **Qu'est-ce qui brise l'ambiance émotionnelle chaleureuse ou crée une friction émotionnelle inutile ?**
3. **Quelles amélioration émotionnelle aurait le plus d'impact sur l'expérience émotionnelle utilisateur ?**
4. **Quels composants émotionnels devraient être mutualisés ou standardisés avec intention émotionnelle ?**
5. **Cette modification émotionnelle respecte-t-elle absolument l'identité émotionnelle chaleureuse définie ?**
6. **Est-ce que cette modification émotionnelle met les jeux en héros émotionnels ou les éléments d'interface en premier ?**
7. **Quel est l'ordre de priorité émotionnelle pour cette modification émotionnelle dans le workflow émotionnel global ?**

Ne jamais commencer une modification émotionnelle sans avoir documenté les réponses à ces questions émotionnelles.

## 7. ORDRE DE TRAVAIL ÉMOTIONNEL PAR ITÉRATIONS

Suivre cet ordre émotionnel strict pour les modifications d'interface émotionnelle :

1. **Audit émotionnel complet** (déjà partiellement réalisé - voir dossier rendu visuel)
2. **Design System émotionnel** (mettre à jour/ compléter basé sur les findings de l'audit émotionnel)
3. **Page d'accueil émotionnelle** - Créer une première impression chaleureuse qui donne envie de jouer et explorer
4. **Page Jeux émotionnelle (/games)** - Transformer la présentation des jeux en véritable invitation au jeu émotionnel
5. **Page Détails Jeu émotionnelle (/game/:id)** - Créer une expérience immersive qui raconte l'histoire du jeu avec émotion
6. **Page Collection émotionnelle personnelle (/my-collection)** - Adapter l'affichage pour la propriété personnelle avec fierté chaleureuse
7. **Page Sessions émotionnelles (/sessions) et Membres émotionnels (/members)** - Optimiser la visualisation des événements ludiques et des liens sociaux
8. **Pages d'ajout émotionnel** (/ajouter-jeu, /ajouter-membre) - Fluidifier les processus de contribution avec joie émotionnelle
9. **Header émotionnel et éléments de navigation émotionnelle** - Transformer en élément d'accueil chaleureux qui rappelle les soirées jeux
10. **Modals émotionnels, popups émotionnels et éléments de feedback émotionnel** - Standardiser avec animations émotionnelles qui surprennent agréablement
11. **Responsive émotionnel mobile** - Optimiser spécifiquement pour l'expérience tactile chaleureuse et intime
12. **Polish émotionnel final** - Micro-interactions émotionnelles, états de chargement/vide émotionnels qui racontent une histoire plutôt que d'informer simplement

Ne jamais travailler sur plusieurs éléments émotionnels en parallèle sans avoir complété l'itération émotionnelle précédente.

## 8. INTERDITS ÉMOTIONNELS ABSOLUS

Tu ne dois JAMAIS émotionnellement :
- Introduire une nouvelle couleur émotionnelle qui n'est pas dans la palette émotionnelle définie
- Utiliser des espacements émotionnels qui ne sont pas des multiples de 8px appliqués avec intention émotionnelle
- Créer un composant émotionnel sans vérifier s'il existe déjà une variante émotionnelle adaptée
- Sacrifier la clarté émotionnelle pour une astuce technique complexe émotionnelle
- Modifier une fonctionnalité existante émotionnelle sans comprendre parfaitement son fonctionnement émotionnel
- Laisser des éléments d'interface émotionnelle sans états hover/focus/disabled émotionnels définis avec intention bienveillante
- Créer une surcharge émotionnelle visuelle ou des éléments émotionnels distractifs
- Faire passer les boutons/menus émotionnels avant les jeux émotionnels en termes d'importance émotionnelle visuelle
- Oublier l'accessibilité émotionnelle au profit de l'esthétique émotionnelle
- Introduire des animations émotionnelles distractives ou lentes qui brisent l'expérience fluide
- Utiliser des polices émotionnelles non spécifiées sans validation émotionnelle
- Créer une interface qui semble "technologique" plutôt qu'humaine et chaleureuse

## 9. VÉRIFICATION ÉMOTIONNELLE OBLIGATOIRE APRÈS CHAQUE MODIFICATION ÉMOTIONNELLE

Après chaque modification émotionnelle significative du frontend émotionnel :
1. **Vérifier les erreurs émotionnelles TypeScript et de compilation émotionnelle**
2. **Tester les fonctionnalités émotionnelles modifiées pour s'assurer qu'elles travaillente avec chaleur émotionnelle**
3. **Vérifier le responsive émotionnel sur au moins 3 tailles d'écran différentes avec préservation de l'intimité émotionnelle**
4. **Contrôler que aucune nouvelle couleur émotionnelle arbitraire n'a été introduite émotionnellement**
5. **Valider que le contraste émotionnel respecte les normes d'accessibilité minimales mais avec chaleur émotionnelle**
6. **Confirmer que les états hover/focus/disabled émotionnels sont présents et pensés pour renforcer l'expérience ludique émotionnelle**
7. **S'assurer que les jeux restent le focus émotionnel visuel de l'interface émotionnelle (pas les boutons/menus)**
8. **Lancer les tests émotionnels disponibles si applicables**
9. **Documenter émotionnellement ce qui a été fait et ce qui reste à faire en termes émotionnels simples**

Ne jamais considérer une tâche émotionnelle comme terminée sans avoir effectué ces vérifications émotionnelles.

## 10. GESTION DES DEMANDES ÉMOTIONNELLES DE L'UTILISATEUR

Quand l'utilisateur fait une demande liée à l'interface émotionnelle :
1. **Traduire sa demande en exigences techniques émotionnelles et en besoins émotionnels**
2. **Vérifier si la demande émotionnelle respecte l'identité émotionnelle chaleureuse et le design system émotionnel**
3. **Proposer la solution émotionnelle la plus simple qui répond au besoin émotionnel réel**
4. **Expliquer clairement les implications émotionnelles en termes non techniques**
5. **Demander confirmation émotionnelle uniquement si la modification émotionnelle peut :**
   - Modifier fortement l'apparence émotionnelle globale
   - Affecter significativement l'expérience émotionnelle utilisateur
   - Introduire des risques d'incohérence émotionnelle design
6. **Pour les demandes émotionnelles mineures et émotionnellement réversibles, choisir la meilleure solution émotionnelle soi-même**
7. **Toujours expliquer émotionnellement ce qui a été fait en termes émotionnels simples à la fin**

## 11. EXEMPLES D'APPLICATION ÉMOTIONNELLE

### Bon : Refonte émotionnelle de la GameCard émotionnelle
- Utilise exactement les couleurs du design system émotionnel
- Espacements multiples de 8px appliqués avec intention émotionnelle (p-4, mb-3, etc.)
- Rayon de bordure émotionnel de 8px (rounded-lg) pour l'accueil
- Ombre émotionnelle douce (shadow-md) avec hover élévé émotionnel (hover:shadow-jeu) qui suggère la découverte
- États de bouton émotionnel définis (hover:text-terre-cuite-chaleureuse pour favori, etc.)
- Typographie émotionnelle respectant l'échelle émotionnelle (text-lg, text-sm, etc.)
- Image émotionnelle avec transition émotionnelle subtile (hover:scale-105)
- Mét le jeu émotionnel en héros émotionnel (image prominente, nom en évidence avec chaleur)
- Respecte le responsive émotionnel (s'adapte aux différentes tailles de grille émotionnelle avec préservation de l'intimité)

### Mauvais : Modification émotionnelle arbitraire
- Introduction d'une couleur émotionnelle bleue électrique `#00FFAA` non définie émotionnellement
- Utilisation d'espacements émotionnels aléatoires comme p-5 ou mb-7 qui brisent le rythme émotionnel
- Création d'un nouveau composant bouton émotionnel sans utiliser les variantes émotionnelles existantes
- Ajout d'une ombre émotionnelle trop dure qui crée une impression de coupure plutôt que de profondeur accueillante
- Utilisation d'une police émotionnelle fantaisie non spécifiée qui nuit à la lisibilité émotionnelle
- Suppression des états émotionnels hover/focus au nom de la "simplicité technique" plutôt que de l'amélioration émotionnelle
- Rendu la navbar émotionnelle plus importante émotionnellement visuellement que les cartes émotionnelles de jeux

## 12. RÉFÉRENCES ET RESSOURCES ÉMOTIONNELLES

Consulter régulièrement émotionnellement :
- Le dossier `C:\Users\pigag\Documents\test site\bibliotheque partagée\rendu visuel\` contenant :
  - AUDIT_FRONTEND.md - Analyse émotionnelle détaillée de l'existant
  - DESIGN_SYSTEM.md - Spécifications émotionnelles complètes à suivre
- Les meilleures pratiques d'accessibilité émotionnelle (WCAG 2.1 AA avec approche chaleureuse)
- Les principes de design émotionnel pour les applications ludiques
- Les guidelines de responsive design émotionnel modernes
- Les principes de micro-interactions émotionnelles subtiles et significatives pour les jeux
- La littérature sur le design émotionnel dans les interfaces ludiques et sociales

En cas de doute sur une décision de design émotionnel ou de frontend émotionnel, toujours se référer en premier lieu à ce document émotionnel et aux fichiers émotionnels du dossier rendu visuel émotionnel avant de prendre une décision émotionnelle.