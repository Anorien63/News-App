# News-App — veille.

Application personnelle pour iPhone qui rassemble chaque jour les actualités **IA** et **jeux vidéo**.
C'est une web app (PWA) : elle s'installe sur l'écran d'accueil depuis Safari, sans App Store ni Mac.

## Installer sur l'iPhone

1. Ouvrir **https://anorien63.github.io/News-App/** dans Safari.
2. Toucher **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lancer « veille. » depuis l'icône : l'app s'ouvre en plein écran.

## Comment les actualités arrivent

Une tâche planifiée Claude tourne chaque matin. Elle recherche les actualités du jour,
réécrit `news.json` et le pousse sur `main`. GitHub Pages publie le fichier en une à deux minutes,
et l'app le recharge à l'ouverture, au retour dans l'app (après 30 min) et via le bouton d'actualisation.

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
      "summary": "Une ou deux phrases affichées sous la carte.",
      "detail": "Paragraphe complémentaire affiché dans la vue détail (peut être vide).",
      "url": "https://lien-vers-l-article-source"
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
| `summary` | oui | Résumé court sous la carte. |
| `detail` | non | Texte supplémentaire dans la vue détail. |
| `url` | oui | Lien « Lire sur … » vers l'article d'origine. |

Ajouter une thématique : une entrée dans `THEMES` et `TABS` en haut de `app.js` (+ une icône dans `ICON`).

## Fichiers

- `index.html`, `styles.css`, `app.js` — l'application
- `news.json` — les actualités du jour (réécrit par la tâche planifiée)
- `manifest.webmanifest`, `icons/` — installation sur l'écran d'accueil
- `sw.js` — ouverture hors ligne (les actus sont toujours redemandées au réseau d'abord)
