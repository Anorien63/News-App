# News-App — veille.

Application personnelle pour iPhone qui rassemble chaque jour les actualités **IA** et **jeux vidéo**.
C'est une web app (PWA) : elle s'installe sur l'écran d'accueil depuis Safari, sans App Store ni Mac.

## Installer sur l'iPhone

1. Ouvrir **https://anorien63.github.io/News-App/** dans Safari.
2. Toucher **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lancer « veille. » depuis l'icône : l'app s'ouvre en plein écran.

## Comment les actualités arrivent

Tout passe par GitHub Actions :

1. **`Veille quotidienne`** (`.github/workflows/veille.yml`) tourne chaque matin vers 5 h 07 (heure d'été)
   / 4 h 07 (heure d'hiver), GitHub pouvant retarder le lancement, ou à la main depuis l'onglet **Actions → Veille quotidienne → Run workflow**.
   - Fenêtre de collecte (heure de Paris) :
     - run planifié : depuis la veille à 0 h (J-1) jusqu'au lancement du run ;
     - run manuel : depuis le dernier run réussi du thème jusqu'au lancement.
     L'heure de chaque run réussi est notée dans `collecte.json` ; le script refuse les articles
     publiés hors de la fenêtre.
   - Pour limiter les coûts, Claude (modèle Sonnet) lit une liste compacte des articles déjà publiés
     (`tmp/deja-publies-<thème>.txt`, générée par `scripts/news.py index`) plutôt que `news.json`.
   - Claude (via `anthropics/claude-code-action`) suit `prompts/ai.md` puis `prompts/games.md`
     et écrit les nouveaux articles dans `tmp/new-ai.json` et `tmp/new-games.json`.
   - `scripts/news.py merge` les fusionne dans `news.json` : chaque fichier ne peut ajouter que son thème,
     les articles mal formés sont écartés, les doublons retirés, les articles de plus de 15 jours supprimés,
     puis il visite la page source de chaque nouvel article pour y récupérer son image d'aperçu officielle.
   - Le workflow commite `news.json` puis déclenche le déploiement.
2. **`Déploiement de l'app`** (`.github/workflows/pages.yml`) vérifie `news.json` (`scripts/news.py check`)
   puis publie l'app sur GitHub Pages. Il tourne aussi à chaque push sur `main` : un `news.json` cassé
   bloque la publication, et la version en ligne reste intacte.

L'app recharge `news.json` à l'ouverture, au retour dans l'app (après 30 min) et via le bouton d'actualisation.

**Prérequis** :
- Un secret `ANTHROPIC_API_KEY` (clé API de la Claude Console) dans Settings → Secrets and variables → Actions
  → onglet **Secrets**. La clé reste chez GitHub et n'apparaît jamais dans le code public.
- Settings → Pages → Source : **GitHub Actions**.

Modifier les consignes de recherche : éditer `prompts/ai.md` ou `prompts/games.md`.

Les articles **enregistrés**, **aimés** et **lus** restent sur l'iPhone (stockage local) ;
un article enregistré reste disponible même après être sorti du fil.

## Format de `news.json`

```json
{
  "version": 1,
  "updatedAt": "2026-10-15T07:00:00+02:00",
  "items": [
    {
      "id": "2026-10-15-slug-unique",
      "theme": "ai",
      "source": "Nom du média",
      "date": "2026-10-15",
      "dateLabel": "Agenda d’octobre",
      "headline": { "pre": "Texte avant ", "hl": "mot-clé en orange", "post": " texte après" },
      "summary": "Deux ou trois phrases affichées sous la carte.",
      "detail": "Paragraphe de 4 à 7 phrases affiché dans la vue détail (peut être vide).",
      "points": ["Fait clé n° 1", "Fait clé n° 2", "Fait clé n° 3"],
      "url": "https://lien-vers-l-article-source",
      "image": "https://image-d-apercu-de-la-page-source.jpg",
      "imageAlt": "Description de l'image (si la page en fournit une)"
    }
  ]
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `id` | oui | Identifiant stable et unique (sert à mémoriser lu / enregistré). |
| `theme` | oui | `ai` ou `games`. |
| `source` | oui | Nom du média ; les initiales de l'avatar en sont tirées. |
| `date` | oui | Date ISO de publication ; le fil est trié dessus (plus récent d'abord). |
| `dateLabel` | non | Remplace la date affichée (« Agenda d'octobre »…). |
| `headline` | oui | Titre en trois morceaux ; `hl` s'affiche en orange. |
| `summary` | oui | Résumé de 2 à 3 phrases sous la carte. |
| `detail` | non | Paragraphe de contexte (4 à 7 phrases) dans la vue détail. |
| `points` | non | 3 à 5 faits clés, affichés dans le bloc « L'essentiel » de la vue détail. |
| `url` | oui | Lien « Lire sur … » vers l'article d'origine. |
| `image` | non | Image d'aperçu officielle de la page source (`og:image`), en `https`. Ajoutée **uniquement** par `scripts/news.py`, jamais écrite à la main ni par Claude. `""` = la page n'en propose pas. |
| `imageAlt` | non | Texte alternatif de l'image, repris de la page source quand il existe. |

Ajouter une thématique : une entrée dans `THEMES` et `TABS` en haut de `app.js` (+ une icône dans `ICON`).

## Fichiers

- `index.html`, `styles.css`, `app.js` — l'application
- `news.json` — les actualités du jour (réécrit par la tâche planifiée)
- `manifest.webmanifest`, `icons/` — installation sur l'écran d'accueil
- `sw.js` — ouverture hors ligne (les actus sont toujours redemandées au réseau d'abord)
- `prompts/` — consignes de recherche suivies par Claude pour chaque thème
- `scripts/news.py` — fusion et validation de `news.json`
- `.github/workflows/` — collecte quotidienne et déploiement
