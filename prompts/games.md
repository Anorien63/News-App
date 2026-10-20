# Collecte du jour — thème « games » (jeux vidéo)

Tu alimentes l'app « veille. » de Nahel. Tu tournes dans GitHub Actions : personne ne lit la session,
il n'y a pas de message à envoyer, ton seul livrable est le fichier `tmp/new-games.json`.
Écris tout le texte destiné à l'app en français.

## 1. Recherche

Objectif : uniquement les actualités publiées la veille, c'est-à-dire le jour J-1 entier, de 0 h à
23 h 59 (heure de Paris). La date de ce jour t'est donnée dans la consigne. Vérifie la date de
publication de chaque source et écarte tout ce qui a été publié avant ou après ce jour (des faits plus anciens peuvent servir de contexte dans `detail`, mais
l'actualité elle-même doit dater de ce jour).

Exhaustivité : ne RIEN rater. Pour chaque thème ci-dessous, fais plusieurs recherches web (au moins 3, sous
des angles différents : noms des principaux acteurs, termes en français et en anglais, sites spécialisés,
blogs et comptes officiels), puis continue tant que de nouvelles actualités apparaissent.

Thèmes à couvrir :
1. Constructeurs de consoles : Xbox/Microsoft, Nintendo, Sony/PlayStation — matériel, stratégie,
   politique commerciale, annonces officielles.
2. Studios et éditeurs : jeux annoncés ou en développement, dates de sortie, rachats, licenciements,
   fermetures, résultats financiers, polémiques.
3. Plateformes de vente et d'abonnement : Steam, Epic Games Store, PlayStation Store/PS Plus,
   Xbox Game Pass, Nintendo eShop, GOG, etc. — changements de politique, prix, catalogue, fonctionnalités.
4. Sorties et événements marquants : grosses sorties, showcases, salons, mises à jour majeures.

Pour chaque actualité importante, va au-delà du simple titre, dans l'esprit de ces exemples :
- « Larian travaille actuellement sur [nouveau jeu] ; la date de sortie n'est pas encore communiquée,
  mais voici ce que l'on sait déjà : … »
- « Sony revoit sa politique concernant la propriété des jeux ; voici le résumé de l'annonce et voici
  comment la communauté a réagi… »
Donc : ce qui est annoncé, ce qu'on sait déjà (infos confirmées ou rumeurs), et la réaction de la
communauté ou de la presse quand elle est notable — ces éléments vont dans `detail`.

## 2. Sources

Il n'y a AUCUNE limite sur le type de source : tout site, blog, média, forum, vidéo ou réseau social,
y compris X (Twitter), à une condition : l'information doit être vérifiée.
- Une information est vérifiée si elle est publiée directement par l'entreprise, le studio ou la personne
  concernée (compte ou site officiel), ou si elle est confirmée par au moins une autre source fiable et
  indépendante. Sinon, présente-la comme une rumeur (summary commençant par « Rumeur : »), ou écarte-la.
- Sur X, ne retiens que les publications de comptes d'entreprises, de studios ou de personnalités qui ont
  un badge : doré (organisation vérifiée), gris (institution ou gouvernement) ou bleu. Le badge bleu
  s'achète et ne prouve pas l'identité à lui seul : avec un badge bleu, vérifie aussi que c'est bien le
  compte officiel (lien depuis son site officiel, ou compte reconnu comme tel par la presse). Ignore les
  comptes sans badge, parodiques ou d'agrégation anonymes.
- Diversité : au plus 3 articles par source (même média ou même compte) dans ce fichier. Au-delà, cite
  une autre source fiable qui couvre la même information (site ou compte officiel, autre média). Ne
  supprime jamais une actualité à cause de cette limite : si aucune autre source n'existe, garde-la avec
  sa source d'origine.
- Le lien de l'article pointe vers la publication elle-même (pour X, l'URL x.com du post). Si un post X
  n'est pas lisible directement, appuie-toi sur un média qui le cite.

## 3. Ne pas se répéter

Lis `news.json` : n'ajoute pas une actualité déjà présente (même sujet, même lien), sauf si elle a
réellement évolué (dans ce cas, nouvel article qui dit ce qui a changé).

## 4. Livrable : `tmp/new-games.json`

Retiens TOUTES les actualités pertinentes et vérifiées de la fenêtre, sans plafond : les grandes comme
les plus secondaires. Une même actualité ne donne qu'un seul article, même si plusieurs médias en parlent.
Range-les de la plus importante à la moins importante. Pour chacune, lis la page source (WebFetch)
afin d'écrire un contenu précis, et écris-les avec l'outil Write dans
`tmp/new-games.json`, sous forme d'une liste JSON (et rien d'autre dans le fichier) :

```json
[
  {
    "id": "AAAA-MM-JJ-slug-court",
    "theme": "games",
    "source": "Nom du média ou de l'éditeur",
    "date": "AAAA-MM-JJ",
    "headline": { "pre": "Texte avant ", "hl": "Mot-clé", "post": " texte après" },
    "summary": "2 à 3 phrases factuelles qui résument l'essentiel, dans tes mots.",
    "detail": "Un paragraphe de 4 à 7 phrases (voir ci-dessous).",
    "points": ["Point clé n° 1", "Point clé n° 2", "Point clé n° 3"],
    "url": "https://lien-reel-vers-la-source"
  }
]
```

- `id` : date du jour + slug en minuscules, sans accents, mots séparés par des tirets ; unique.
- `theme` : toujours `"games"`.
- `source` : pour un post X, le nom du compte suivi de « sur X » (ex. « PlayStation sur X »).
- `date` : date de publication de la source ; elle doit être celle du jour J-1, sinon l'article est refusé.
- `headline` : titre accrocheur en français de 4 à 9 mots au total ; `hl` est le mot-clé affiché en orange
  (jeu, studio, console ou plateforme) ; `pre` ou `post` peuvent être vides ; pense aux espaces en bordure.
- `summary` : 2 à 3 phrases, l'essentiel de l'info, lisible sans ouvrir l'article.
- `detail` : un vrai paragraphe de 4 à 7 phrases, dans tes mots : le contexte (ce qui s'est passé avant),
  ce qui est annoncé précisément (chiffres, dates, prix, plateformes, disponibilité), ce qu'on ne sait pas encore,
  la réaction de la communauté ou de la presse quand elle est notable, et ce qui va suivre.
  Chaque fait vient d'une source que tu as lue ; pas de remplissage ni de formule creuse.
- `points` : 3 à 5 faits clés très courts (moins de 15 mots chacun), sans répéter le titre.
- `url` : la page de l'article lui-même (pas une page d'accueil ni un agrégateur quand l'article
  d'origine existe) : l'image de l'article est récupérée automatiquement sur cette page.
  N'ajoute jamais de champ `image` toi-même.
- Lien réel, jamais inventé ni reconstruit de mémoire.

N'invente aucun fait : uniquement ce que disent les sources. Si tu ne trouves rien de fiable, écris `[]`.
Ne modifie aucun autre fichier, ne lance aucune commande git : la fusion, la validation, le commit et
le déploiement sont faits automatiquement après toi.
