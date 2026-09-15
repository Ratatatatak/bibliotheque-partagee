# Design System Chaleureux - Bibliothèque Partagée

## 🎨 Philosophie

Un design qui capture l'essence d'une soirée jeux entre amis : chaleureux, convivial, légèrement nostalgique mais premium dans sa qualité. L'interface doit servir les jeux, pas l'inverse - chaque élément doit renforcer l'envie de jouer, de partager, de créer des souvenirs.

## 🎨 Palette de couleurs émotionnelles

### Couleurs primaires - L'âme de la ludothèque
| Nom | Hex | Utilisation | Émotion associée |
|-----|-----|-------------|------------------|
| Terre Cuite Chaleureuse | `#E27D60` | Boutons primaires, liens importants, accents principaux | Confort, soirée au coin du feu, tuiles de jeux anciens |
| Bleu Canard Profond | `#2C5F6D` | Texte secondaire, bordures subtiles, arrière-plans secondaires | Confiance, profondeur stratégique, nuit paisible |
| Vert Sauge Doux | `#8FBC8F` | Éléments de succès, boutons secondaires, indicateurs positifs | Croissance, réussite, nature apaisante |

### Neutres chaleureux - Le fond qui accueille
| Nom | Hex | Utilisation | Émotion associée |
|-----|-----|-------------|------------------|
| Crème de Lait | `#F8F4E9` | Fond principal, arrière-plans de cartes | Nappe de jeux utilisée, accueil doux |
| Gris Pierre Chaude | `#E2E8D0` | Bordures, séparateurs, arrière-plans tertiaires | Veines du bois, stabilité rassurante |
| Brun Café Doux | `#4A4A4A` | Texte principal, icônes | Lisibilité avec chaleur, élégance sobre |
| Gris Perle | `#F0F0F0` | Hover léger, arrière-plans discrets | Douceur légère, subtilité réconfortante |

### États et feedback - Les réponses qui rassurent
| État | Hex | Utilisation | Émotion associée |
|------|-----|-------------|------------------|
| Success Clair | `#A8D5BA` | Bordures de succès, badges validés | Accomplissement doux, validation chaleureuse |
| Warning Doux | `#D4A574` | Alertes légères, boutons d'attention | Attention bienveillante, rappel gentil |
| Error Atténué | `#E8B7B7` | Erreurs de formulaire, indicateurs problématiques | Erreur comprise, pas d'alarmisme |

### Ombres - La profondeur qui accueille
```
shadow-sm: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
shadow-md: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)
shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.09), 0 4px 6px -2px rgba(0,0,0,0.05)
shadow-inner: inset 0 2px 4px rgba(0,0,0,0.04)
shadow-jeu: 0 8px 25px -5px rgba(226, 125, 96, 0.15) /* Ombre spéciale pour les jeux */
```

### Rayons de bordure - La douceur qui invite
- `radius-sm`: 4px - Légère rondeur pour les éléments compacts
- `radius-md`: 8px - Rondeur accueillante pour la plupart des éléments
- `radius-lg`: 12px - Rondeur prononcée pour les éléments importants
- `radius-xl`: 16px - Rondeur généreuse pour les conteneurs majeurs
- `radius-full`: 9999px - Pour les éléments circulaires accueillants

## 🔤 Typographie - La voix qui raconte des histoires

### Famille de polices - Des voix pour différents moments
| Usage | Polices | Pourquoi |
|-------|---------|----------|
| **Titres** | `Cinzel, Playfair Display, Merriweather, Georgia, serif` | Évoque l'élégance intemporelle des vieux jeux de société, les livres de règles classiques |
| **Corps** | `Lato, Open Sans, Nunito, Helvetica Neue, Arial, sans-serif` | Lisibilité optimale pour les règles longues, neutralité bienveillante |
| **Affichage** | `Playfair Display, Cinzel,Cormorant Garamond, Georgia, serif` | Pour les moments spéciaux qui méritent d'être mis en valeur |
| **Corps alternative** | `Merriweather, Georgia, Times New Roman, serif` | Quand on veut un toucher plus traditionnel, chaleureux comme un vieux livre |

### Échelle typographique - Le rythme de la lecture
*(Base 16px, pensée pour le confort de lecture des règles de jeux)*

| Nom | Taille | Ligne Hauteur | Poids | Utilisation | Émotion |
|-----|--------|---------------|-------|-------------|---------|
| `text-xs` | 0.75rem (12px) | 1rem (16px) | 400 | Texte secondaire, légendes discrètes | Discrétion bienveillante |
| `text-sm` | 0.875rem (14px) | 1.25rem (20px) | 400 | Corps secondaire, infos complémentaires | Lecture détendue |
| `text-base` | 1rem (16px) | 1.5rem (24px) | 400 | Corps principal, règles de jeux | Confort de lecture optimal |
| `text-lg` | 1.125rem (18px) | 1.75rem (28px) | 400 | Sous-titres, éléments moyens | Hiérarchie douce |
| `text-xl` | 1.25rem (20px) | 1.75rem (28px) | 600 | Titres de section | Présence assurée |
| `text-2xl` | 1.5rem (24px) | 2rem (32px) | 700 | Titres de page | Importance chaleureuse |
| `text-3xl` | 1.875rem (30px) | 2.25rem (36px) | 700 | Titres principaux | Significativité marquée |
| `text-4xl` | 2.25rem (36px) | 2.5rem (40px) | 800 | Titres héroïques | Moments spéciaux |
| `text-5xl` | 3rem (48px) | 3.5rem (56px) | 800 | Titres exceptionnels | Célébration ludique |

### Poids de police - Les nuances de l'expression
- `font-light`: 300 - Pour les éléments qui doivent se faire discrets
- `font-normal`: 400 - Le corps de lecture, confortable
- `font-medium`: 500 - L'accent doux, l'attention bienveillante
- `font-semibold`: 600 - La présence assurée, sans agressivité
- `font-bold`: 700 - L'importance marquée, mais toujours chaleureuse
- `font-extrabold`: 800 - Les moments de forte affirmation ludique

## 📏 Espacement et grille - L'architecture de la respiration

### Échelle d'espacement - Le souffle entre les éléments
*(Base 8px, mais appliquée avec intention émotionnelle)*

| Classe | Valeur | Utilisation | Intention émotionnelle |
|--------|--------|-------------|------------------------|
| `px-0.5` | 1px | Ajustements fins | Précision bienveillante |
| `px-1` | 2px | Espacements très serrés | Intimité contrôlée |
| `px-1.5` | 3px | Espacements serrés | Proximité chaleureuse |
| `px-2` | 4px | Base pour éléments compacts | Connexion immédiate |
| `px-2.5` | 5px | Légers ajustements | Attention subtile |
| `px-3` | 6px | Espacements standards réduits | Confort habituel |
| `px-4` | 8px | **Unité de base** - espacement standard | Respiration naturelle |
| `px-5` | 10px | Légère augmentation | Pause réfléchie |
| `px-6` | 12px | Espacement confortable | Détente active |
| `px-8` | 16px | Espacement généreux | Espace pour apprécier |
| `px-10` | 20px | Bloc de contenu | Moment de découverte |
| `px-12` | 24px | Section séparée | Transition significative |
| `px-16` | 32px | Grande séparation | Pause contemplative |
| `px-20` | 40px | Contenant principal | Cadre accueillant |
| `px-24` | 48px | Marge extérieure importante | Respire profondément |

### Grille de layout - L'organisation qui invite à explorer
- **Conteneur** : `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Breakpoints** :
  - `sm`: 640px - Le seuil où l'on commence vraiment à apprécier l'espace
  - `md`: 768px - L'espace confortable pour partager
  - `lg`: 1024px - L'espace ample pour découvrir
  - `xl`: 1280px - L'espace généreux pour se perdre dans les jeux
  - `2xl`: 1536px - L'espace luxueux pour s'immerger totalement
- **Colonnes** : 12 colonnes avec gouttières pensées pour la découverte
- **Gouttières** : 
  - `gap-2` (0.5rem) : Proximité ludique
  - `gap-3` (0.75rem) : Connexion naturelle
  - `gap-4` (1rem) : Espace de respiration standard
  - `gap-6` (1.5rem) : Espace pour contempler
  - `gap-8` (2rem) : Espace pour s'immerger

## � Composants de base - Les éléments qui accueillent

### Boutons - Les invitations à agir

#### Variantes émotionnelles
```html
<!-- Primaire - Terre Cuite Chaleureuse -->
<button className="btn-primary">
  bg-terre-cuite-chaleureuse text-white hover:bg-terre-cuite-chaleureuse/90 
  focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 
  disabled:opacity-50
  transition-all duration-200 ease-out
  transform hover:scale-[1.02] active:scale-[0.98]
</button>

<!-- Secondaire - Bleu Canard Profond -->
<button className="btn-secondary">
  bg-bleu-canard-profond text-white hover:bg-bleu-canard-profond/90 
  focus:ring-2 focus:ring-bleu-canard-profond/20 
  disabled:opacity-50
  transition-all duration-200 ease-out
  transform hover:scale-[1.02] active:scale-[0.98]
</button>

<!-- Outline - Terre Cuite douce -->
<button className="btn-outline">
  border border-terre-cuite-chaleureuse text-terre-cuite-chaleureuse 
  hover:bg-terre-cuite-chaleureuse/10 
  focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 
  disabled:opacity-50
  transition-all duration-200 ease-out
</button>

<!-- Ghost - Présence subtile -->
<button className="btn-ghost">
  text-terre-cuite-chaleureuse 
  hover:bg-terre-cuite-chaleureuse/5 
  focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 
  disabled:opacity-50
  transition-all duration-200 ease-out
</button>
```

#### Tailles émotionnelles
- `btn-sm`: `px-3 py-1.5 text-sm radius-md` - Pour les actions discrètes mais présentes
- `btn-md`: `px-4 py-2 text-base radius-md` (défaut) - L'équilibre parfait
- `btn-lg`: `px-6 py-3 text-lg radius-lg` - Pour les actions qui comptent vraiment
- `btn-xl`: `px-8 py-4 text-xl radius-xl` - Pour les moments de célébration

### Champs de saisie - Les espaces qui écoutent

#### Styles communs - L'accueil bienveillant
```html
<input className="
  w-full px-4 py-3 border border-gris-pierre-chaude bg-creme-de-lait 
  focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse focus:border-terre-cuite-chaleureuse
  rounded-md transition-all duration-200 ease-in-out
  text-brun-cafe-doux placeholder-gris-perle
  shadow-sm hover:shadow-md
">
```

#### Variantes intentionnelles
- Avec icône à gauche : ajouter `pl-10` et positionner l'icône en `absolute left-3 top-1/2 -translate-y-1/2`
- Avec icône à droite : ajouter `pr-10` et positionner l'icône en `absolute right-3 top-1/2 -translate-y-1/2`
- Lecture seule : `bg-gris-perle/50 cursor-not-allowed`
- Avec texture légère : ajouter une classe qui apporte un bruit de fond subtil rappelant le papier

### Cartes - Les écrins qui présentent les trésors

#### Variante jeu (GameCard) - L'écrin du trésor ludique
```html
<div className="
  bg-creme-de-lait rounded-xl shadow-md border border-gris-pierre-chaude 
  overflow-hidden hover:shadow-jeu transition-shadow duration-300
  transform hover:-translate-y-1 hover:scale-100
  group
">
  <!-- Contenu avec attention aux détails qui comptent -->
</div>
```

#### Variante élevée (pour sections importantes) - Le présentoir d'honneur
```html
<div className="
  bg-creme-de-lait rounded-xl shadow-lg border border-gris-pierre-chaude 
  border-2 hover:shadow-jeu transition-shadow duration-300
">
  <!-- Contenu qui mérite l'attention particulière -->
</div>
```

#### Variante découverte (pour l'exploration) - L'invitation à voir plus
```html
<div className="
  bg-creme-de-lait rounded-xl shadow-md border border-gris-pierre-chaude 
  overflow-hidden
  hover:[transform:scale(1.02)] hover:shadow-jeu transition-all duration-300
  cursor-pointer
">
  <!-- Contenu qui invite à l'exploration -->
</div>
```

### Badges - Les petits signes qui communiquent avec chaleur

#### Styles émotionnels
```html
<!-- Primaire -->
<span className="badge-primary">
  bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse font-medium px-3 py-1 radius-md
</span>

<!-- Secondaire -->
<span className="badge-secondary">
  bg-bleu-canard-profond/10 text-bleu-canard-profond font-medium px-3 py-1 radius-md
</span>

<!-- Succès -->
<span className="badge-success">
  bg-vert-sauge-doux/10 text-vert-sauge-doux font-medium px-3 py-1 radius-md
</span>

<!-- Variante outline douce -->
<span className="badge-outline">
  border border-terre-cuite-chaleureuse/30 text-terre-cuite-chaleureuse 
  font-medium px-3 py-1 radius-md hover:bg-terre-cuite-chaleureuse/5
</span>
```

### Images et médias - Les fenêtres vers l'imaginaire

#### Styles d'image - La présentation qui invite au rêve
```html
<img className="
  w-full h-auto object-cover
  transition-transform duration-300 ease-in-out
  hover:scale-105
  rounded-lg
  shadow-sm
  hover:shadow-md
">
```

#### Conteneur d'image avec ratio ludique - La mise en scène
```html
<div className="relative w-full">
  <!-- Ratio 4:3 classique pour les boîtes de jeux -->
  <div className="aspect-[4/3]">
    <img className="absolute inset-0 w-full h-full object-cover" src="..." alt="..." />
  </div>
  <!-- Overlay optionnel pour les états spéciaux -->
  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-50 transition-opacity duration-200">
    <!-- Texte overlay ou icône de lecture -->
  </div>
</div>
```

## 🎮 Composants spécifiques au jeu de société - Les outils du ludique

### CardJeuÉmotionnelle
Pour les présentations qui veulent vraiment faire envie :
- Image principale avec traitement spécial (légère texture papier, ombre douce)
- Informations clés en évidence avec hiérarchie émotionnelle
- Description avec typographie optimisée pour l'immersion
- Mécaniques et catégories présentés comme des éléments de découverte
- Sections pour avis, extensions, variantes avec traitement chaleureux
- Effet de légère élévation au hover qui suggère la manipulatilité

### FiltreJeuChaleureux
Composant de filtrage qui guide plutôt que de simplement trier :
- Recherche par nom avec suggestions chaleureuses
- Curseurs pour nombre de joueurs avec feedback tactile
- Sélecteurs multiples pour catégories/mécaniques avec prévisualisation
- Options de tri présentées comme des chemins de découverte
- Affichage du nombre de résultats de façon encourageante
- État vide qui suggère plutôt que de constater l'absence

### IndicateurPartieConviviale
Pour afficher l'état d'une partie avec émotion :
- Couleurs selon statut mais toujours dans la palette chaleureuse
- Icônes appropriées qui racontent plutôt que d'indiquer simplement
- Informations clés présentées comme des éléments d'histoire
- Boutons d'action contextuels qui invitent à la participation
- Légère animation qui suggère le déroulement temporel

## ⚡ Animations et transitions - La vie subtile dans l'interface

### Durée standard - Le tempo des interactions
- `duration-100`: 100ms (micro-interactions presque invisibles)
- `duration-150`: 150ms (micro-interactions perceptibles)
- `duration-200`: 200ms (états de bouton, réponses claires)
- `duration-300`: 300ms (changements de layout, transitions de page)
- `duration-400`: 400ms (entrées de page importantes, révélations)
- `duration-500`: 500ms (transitions majeures, transformations significatives)

### Courbes d'easing - La personnalité du mouvement
- `ease-out-doux`: `cubic-bezier(0.16, 1, 0.3, 1)` (sortie naturelle, comme un soupir de contentement)
- `ease-in-out-naturel`: `cubic-bezier(0.4, 0, 0.2, 1)` (standard, mais pensé pour le naturel)
- `ease-spring-ludique`: `cubic-bezier(0.4, 0, 0.6, 1)` (effet ressort léger, comme une boîte qui s'ouvre)
- `ease-bounce-doux`: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (rebond très doux, comme une carte posée délicatement)

### Exemples d'utilisation émotionnelle

#### Bouton avec feedback chaleureux
```html
<button className="
  btn-primary
  transition-all duration-200 ease-out-doux
  hover:scale-[1.03]
  active:scale-[0.97]
  hover-shadow-md
">
  Jouer maintenant
</button>
```

#### Carte avec élévation qui invite à la découverte
```html
<div className="
  jeu-card-emotionnelle
  transition-all duration-300 ease-in-out-naturel
  hover:-translate-y-2 hover:shadow-jeu
  active:scale-[0.99]
">
  Contenu de la carte qui veut être découvert
</div>
```

#### Liste qui apparaît comme une révélation
```html
<ul className="
  liste-decouverte
  opacity-0 translate-y-4
  animate-[apparition_douce_400ms_ease-out-doux]
">
  <li>Élément 1 qui se révèle doucement</li>
  <li>Élément 2 qui suit avec naturel</li>
</ul>
```

#### Micro-interaction ludique (tilt doux)
```html
<div className="
  tilt-ludique
  transition-transform duration-200 ease-in-out
  hover:rotate-y-5 hover:rotate-x-2
">
  Élément qui réagit doucement à l'approche, comme une boîte qu'on soulève légèrement
</div>
```

## 📱 Guidelines responsive - L'adaptation qui préserve l'intimité

### Breakpoints et utilisation émotionnelle
| Breakpoint | Largeur minimale | Utilisation émotionnelle typique |
|------------|------------------|----------------------------------|
| `mobile` | < 640px | Expérience intime, toucher optimisé, découvertes séquentielles |
| `tablet` | ≥ 640px | Expérience partagée, découvertes parallélisées, conversations faciles |
| `desktop` | ≥ 1024px | Expérience d'exploration, vue d'ensemble, immersion possible |
| `wide` | ≥ 1440px | Expérience de contemplation, espaces généreux, détails appréciables |

### Adaptations spécifiques émotionnelles
- **Navbar** : Devient hamburger menu en dessous de `md`, mais avec une animation d'ouverture qui suggère la révélation
- **Cards grid** : 
  - Mobile : 1 colonne pour une découverte sérielle attentive
  - Tablet : 2 colonnes pour partager la découverte
  - Desktop : 3 colonnes pour une exploration équilibrée
  - Wide : 4 colonnes avec espaces généreux pour la contemplation
- **Espacements** : Augmenter progressivement avec la taille d'écran pour préserver la sensation d'espace
- **Typographie** : Augmenter légèrement les tailles sur grands écrans pour faciliter la lecture à distance
- **Images** : Légère augmentation de la taille relative sur grands écrans pour préserver l'impact émotionnel

## ♿ Accessibilité chaleureuse - L'inclusion qui vient du cœur

### Contraste minimum avec intention
- Texte normal : 4.5:1 (AA) - mais pensé pour être doux plutôt que cliniquement net
- Texte grand : 3:1 (AA) - adapté pour les titres qui doivent attirer sans agresser
- Éléments interactifs : 3:1 contre arrière-plan adjacent - mais avec des variations chaleureuses dans les états
- États de focus : Contraste renforcé mais avec des couleurs qui restent dans la palette chaleureuse

### Tailles de touche - L'accueil physique
- Minimum 48x48px pour tous les éléments interactifs (légèrement au-dessus du minimum pour plus de confort)
- Espacement recommandé de 12px entre éléments tactiles (plus que le minimum pour éviter les erreurs frustrantes)
- Zones de interaction généreuses pour les éléments importants

### Focus visible - L'attention qui se voit avec douceur
- Tous les éléments interactifs doivent avoir un état focus visible qui soit dans l'esprit chaleureux
- Utiliser `focus-ring-2 focus-ring-terre-cuite-chaleureuse/20 focus-ring-offset-2` comme base
- S'assurer que le contraste du focus est suffisant mais reste agréable
- Éviter les contours trop durs qui briseraient l'ambiance

### Navigation au clavier - Le parcours qui raconte une histoire
- Ordre logique de tabulation qui suit un chemin naturel de découverte
- Échappement possible des modals avec ESC - mais avec confirmation chaleureuse si action importante
- Indication claire du focus dans les composants complexes - pas juste un contour, mais une véritable invitation
- Raccourcis claviers pensés pour l'efficacité sans perdre en chaleur

### Lecteurs d'écran - La voix qui décrit avec émotion
- Labels explicites pour tous les contrôles de formulaire - mais écrits avec chaleur et personnalité
- Texte alternatif descriptif pour les images informatives - qui raconte plutôt que de simplement décrire
- Structure sémantique correcte (headers, listes, régions) - mais avec une pensée narrative
- Langue déclarée correctement pour une prononciation appropriée
- Éviter le texte qui se répète inutilement - respecter la concentration de l'utilisateur

## 📁 Organisation des fichiers - L'emplacement qui a du sens

```
src/
├── assets/
│   ├── images/           # Images statiques, illustrations ludiques
│   ├── icons/            # Icônes spécifiques au thème ludique
│   └── textures/         # Textures subtiles (papier, bois, tissu)
├── components/
│   ├── ui/               # Composants UI réutilisatifs chaleureux
│   │   ├── button/
│   │   │   ├── ButtonEmotionnel.tsx
│   │   │   ├── ButtonVariantsEmotionnels.tsx
│   │   │   └── button.emotionnel.styles.css
│   │   ├── input/
│   │   ├── card/
│   │   │   ├── CardJeuEmotionnelle.tsx
│   │   │   └── card.emotionnel.styles.css
│   │   ├── badge/
│   │   ├── modal/
│   │   │   ├── ModalEmotionnel.tsx
│   │   │   └-- modal.emotionnel.styles.css
│   │   ├── tooltip/
│   │   ├── toast/
│   │   └── ...
│   ├── layout/           # Composants de layout chaleureux
│   │   ├── header/
│   │   │   ├── HeaderEmotionnel.tsx
│   │   │   └── header.emotionnel.styles.css
│   │   ├── footer/
│   │   └── ...
│   └── jeu/              # Composants spécifiques au jeu émotionnel
│       ├── jeucard/
│   │       ├── JeuCardEmotionnelle.tsx
│   │       └── jeu-card.emotionnel.styles.css
│       ├── juefiltre/
│   │       ├── JeuFiltreChaleureux.tsx
│   │       └── jeu-filtre.chaleureux.styles.css
│       ├── jeudetail/
│   │       ├── JeuDetailImmersif.tsx
│   │       └── jeu-detail.immersif.styles.css
│       └── ...
├── pages/
│   ├── index/
│   │   ├── IndexEmotionnel.tsx
│   │   └── index.emotionnel.styles.css
│   ├── jeux/
│   │   ├── JeuxEmotionnels.tsx
│   │   └── jeux.emotionnel.styles.css
│   ├── jeu/
│   │   ├── JeuDetailPage.tsx
│   │   └── jeu.detail.emotionnel.styles.css
│   └── ...
├── hooks/
│   └── ...
├── styles/
│   ├── globals.css          # Styles globaux et reset émotionnel
│   ├── tokens.css           # Variables CSS pour les tokens de design émotionnel
│   ├── animations.css       # Keyframes et classes d'animation émotionnelle
│   └── thèmes/
│       └── chaleureux.css   # Thème spécifique à implémenter
├── lib/
│   └── ...
└── utils/
    └── ...
```

## 🛠️ Implémentation technique émotionnelle

### Configuration Tailwind émotionnelle (`tailwind.config.cjs`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terre-cuite-chaleureuse': '#E27D60',
        'bleu-canard-profond': '#2C5F6D',
        'vert-sauge-doux': '#8FBC8F',
        'creme-de-lait': '#F8F4E9',
        'gris-pierre-chaude': '#E2E8D0',
        'brun-cafe-doux': '#4A4A4A',
        'gris-perle': '#F0F0F0',
        // États
        'success-clair': '#A8D5BA',
        'warning-doux': '#D4A574',
        'error-atténue': '#E8B7B7',
      },
      fontFamily: {
        display: ['Cinzel', 'Playfair Display', 'Merriweather', 'Georgia', 'serif'],
        sans: ['Lato', 'Open Sans', 'Nunito', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Cinzel', 'Cormorant Garamond', 'Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        body: ['Lato', 'Open Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        '0.5': '1px',
        '1': '2px',
        '1.5': '3px',
        '2': '4px',
        '2.5': '5px',
        '3': '6px',
        '4': '8px',
        '5': '10px',
        '6': '12px',
        '8': '16px',
        '10': '20px',
        '12': '24px',
        '16': '32px',
        '20': '40px',
        '24': '48px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        md: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.09), 0 4px 6px -2px rgba(0,0,0,0.05)',
        inner: 'inset 0 2px 4px rgba(0,0,0,0.04)',
        jeu: '0 8px 25px -5px rgba(226, 125, 96, 0.15)',
      },
      transitionDuration: {
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'doux': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'naturel': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ludique': 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      keyframes: {
        apparition-douce: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulsation-douce: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        flottement-ludique: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        tilt-ludique: {
          '0%, 100%': { transform: 'rotate(0deg) rotateX(0deg)' },
          '50%': { transform: 'rotate(2deg) rotateX(1deg)' },
        },
      },
    },
  },
  plugins: [],
}
```

### Styles globaux émotionnels (`src/styles/globals.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import des tokens et animations */
@import "./tokens.css";
@import "./animations.css";

/* Reset et base émotionnelle */
* {
  @media (prefers-reduced-motion: no-preference) {
    scroll-behavior: smooth;
  }
}

/* Base émotionnelle - Fond qui accueille */
body {
  @apply bg-creme-de-lait text-brun-cafe-doux antialiased;
  /* Ligne de base subtile pour évoquer le papier */
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 29px,
      #e2e8d0 30px
    );
}

/* Titres avec personnalité émotionnelle */
h1, h2, h3, h4, h5, h6 {
  @apply font-display;
  /* Ligne de base subtile pour les titres */
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 29px,
      #e2e8d0 30px
    );
  background-size: 100% 30px;
  background-repeat: repeat-x;
  background-position: bottom;
}

/* Styles de focus émotionnels - Présence qui se voit avec douceur */
:focus-visible {
  @apply outline-none;
  @apply ring-2 ring-terre-cuite-chaleureuse/20 ring-offset-2;
  @apply border-terre-cuite-chaleureuse/30;
}

/* Transition globale émotionnelle - Réponses qui viennent naturellement */
* {
  @apply transition-colors duration-200 ease-out-doux;
  @apply transition-transform duration-200 ease-out-doux;
}

/* Animation de'apparition douce émotionnelle */
@keyframes apparition-douce {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.f apparition-douce {
  animation: apparition-douce 400ms ease-out-doux forwards;
}

/* Animation de pulsation douce pour les éléments d'attention bienveillante */
@keyframes pulsation-douce {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.pulsation-douce {
  animation: pulsation-douce 3s ease-in-out infinite;
}

/* Animation de flottement ludique pour les éléments qui invitent à la découverte */
@keyframes flottement-ludique {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

.flottement-ludique {
  animation: flottement-ludique 6s ease-in-out infinite;
}

/* Animation de tilt ludique pour la manipulation subtile */
@keyframes tilt-ludique {
  0%, 100% {
    transform: rotate(0deg) rotateX(0deg);
  }
  50% {
    transform: rotate(2deg) rotateX(1deg);
  }
}

.tilt-ludique {
  animation: tilt-ludique 4s ease-in-out infinite;
}

/* Style pour les éléments qui doivent avoir une texture papier subtile */
.texture-papier-légère {
  background-image: 
    "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8d0' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
}

/* Conteneurs avec bordure émotionnelle */
.container-emotionnel {
  @apply bg-creme-de-lait rounded-xl shadow-md border border-gris-pierre-chaude;
}

.container-emotionnel:hover {
  @apply shadow-jeu;
}

/* Textes avec hiérarchie émotionnelle */
.text-emotionnel-title {
  @apply font-display text-2xl text-brun-cafe-doux;
}

.text-emotionnel-subtitle {
  @apply font-serif text-lg text-brun-cafe-doux/80;
}

.text-emotionnel-body {
  @apply font-sans text-base text-brun-cafe-doux/90;
}

.text-emotionnel-caption {
  @apply font-sans text-sm text-brun-cafe-doux/60;
}
```

## 🧪 Tests et validation émotionnelle

### Checklist émotionnelle
- [ ] Palette de couleurs chaleureuse appliquée cohéremment
- [ ] Typographie respectant l'échelle émotionnelle définie
- [ ] Espacements multiples de 8px mais appliqués avec intention émotionnelle
- [ ] Rayons de bordure utilisés selon leur intention émotionnelle (sm/md/lg/xl)
- [ ] Ombres utilisées selon leur intention émotionnelle (sm/md/lg/jeu)
- [ ] États hover/focus/disabled présents et pensés pour renforcer l'expérience ludique
- [ ] Contraste vérifié (minimum 4.5:1 pour texte normal) mais avec chaleur
- [ ] Tailles de touche respectées (min 48x48px pour confort émotionnel)
- [ ] Focus visible et accessible avec chaleur émotionnelle
- [ ] Layouts responsive testés sur tous les breakpoints avec préservation de l'intimité émotionnelle
- [ ] Animations présentes mais subtiles (pas de distraction, juste de la vie émotionnelle)
- [ ] Aucune utilisation de couleurs/typographies/espacements qui brisent l'ambiance chaleureuse
- [ ] Éléments interactifs qui réagissent avec des micro-interactions ludiques appropriées

### Outils recommandés pour l'émotion
- **Lighthouse** : Pour auditer performance, accessibilité, meilleures pratiques (avec ajustements pour l'émotion)
- **Wave** : Pour vérifier l'accessibilité détaillée
- **Storybook** : Pour développer et tester les composants isolément avec leur contexte émotionnel
- **Figma/Sketch/Adobe XD** : Pour créer les maquettes émotionnelles avant implémentation
- **axe-core** : Pour tests d'accessibilité automatisés
- **Tests utilisateurs** : Essentiel pour valider l'impact émotionnel réel

## 📖 Documentation pour l'équipe émotionnelle

### Comment ajouter un nouveau composant émotionnel
1. Définir son rôle émotionnel dans l'interface - quelle histoire il raconte
2. Vérifier s'il existe déjà un composant émotionnel similaire à réutiliser
3. Créer le dossier dans `src/components/ui/[nom]/emotionnel/`
4. Implémenter le composant avec les tokens du design émotionnel
5. Ajouter les variantes émotionnelles nécessaires (taille, état, émotion)
6. Documenter l'utilisation émotionnelle dans ce fichier
7. Ajouter des histoires Storybook émotionnelles si applicable
8. Créer des tests utilisateurs émotionnels si nécessaire

### Quand créer un nouveau token émotionnel
- Seulement si aucune valeur émotionnelle existante ne convient
- Après validation avec le responsable émotionnel/design
- En suivant l'intention émotionnelle établie (pas de valeurs intermédiaires arbitraires)
- En documentant clairement son intention émotionnelle et son utilisation

### Maintenance du design émotionnel
- Revue émotionnelle mensuelle des incohérences qui brisent la chaleur
- Mise à jour de la documentation émotionnelle lors des changements
- Formation émotionnelle des nouveaux membres sur les principes
- Audit émotionnel trimestriel pour détecter les dérives de température
- Tests utilisateurs réguliers pour valider l'impact émotionnel réel

## 🌡️ Indice de température émotionnelle

Un bon design émotionnel pour cette ludothèque devrait maintenir :
- **Température de base** : 22°C (chaleureux mais pas écrasant)
- **Variation maximale** : ±3°C (pour éviter les chocs thermiques émotionnels)
- **Points chauds locaux** : Jusqu'à 27°C sur les éléments d'action principale (invitations chaleureuses)
- **Points froids locaux** : Pas en dessous de 19°C (pour éviter toute sensation de froideur ou d'hostilité)
- **Gradient émotionnel** : Transitions douces entre les zones de différentes températures

*Ce design system a été créé pour répondre à la demande d'une interface chaleureuse, conviviale et premium qui mette les jeux en héros de l'expérience émotionnelle, tout en restant fonctionnelle et maintenable pour une équipe de développement qui comprend que les jeux sont avant tout une affaire de cœur et de connexion humaine.*