#!/usr/bin/env python3
"""Outil de maintenance de news.json pour l'app « veille. ».

  python3 scripts/news.py check
      Vérifie news.json (format, champs obligatoires, doublons). Code de sortie 1 en cas d'erreur.

  python3 scripts/news.py merge --today AAAA-MM-JJ [--new tmp/new-ai.json ...]
      Fusionne les nouveaux articles produits par Claude dans news.json :
      - chaque fichier tmp/new-<theme>.json ne peut ajouter que des articles de son thème ;
      - les articles invalides sont écartés (et signalés dans le journal) ;
      - nouveaux articles en tête, doublons retirés (même id, ou même url et même mot-clé : le plus récent gagne) ;
      - articles de plus de 15 jours supprimés, aucune autre limite ;
      - chaque article sans image reçoit l'image d'aperçu officielle de sa page source
        (balises og:image / twitter:image), ou "" si la page n'en propose pas ;
      - updatedAt n'est changé que si le contenu a réellement changé.
"""
import argparse
import glob
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS = os.path.join(ROOT, "news.json")
THEMES = {"ai", "games"}
MAX_AGE_DAYS = 15
PARIS = ZoneInfo("Europe/Paris")
ID_RE = re.compile(r"^\d{4}-\d{2}(-\d{2})?-[a-z0-9]+(-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HTTPS_RE = re.compile(r"^https://\S+$")
MAX_IMAGE_LOOKUPS = 60          # pages visitées au plus par fusion
USER_AGENT = "Mozilla/5.0 (compatible; veille-bot/1.0; +https://github.com/Anorien63/News-App)"


def item_problems(it, expected_theme=None):
    """Retourne la liste des problèmes d'un article (vide = article valide)."""
    p = []
    if not isinstance(it, dict):
        return ["n'est pas un objet"]
    if not isinstance(it.get("id"), str) or not ID_RE.match(it["id"]):
        p.append("id absent ou mal formé (attendu AAAA-MM-JJ-slug-sans-accents)")
    if it.get("theme") not in THEMES:
        p.append("theme doit valoir 'ai' ou 'games'")
    elif expected_theme and it["theme"] != expected_theme:
        p.append(f"theme '{it['theme']}' alors que ce fichier ne peut ajouter que '{expected_theme}'")
    if not isinstance(it.get("source"), str) or not it["source"].strip():
        p.append("source manquante")
    if not isinstance(it.get("date"), str) or not DATE_RE.match(it["date"]):
        p.append("date absente ou pas au format AAAA-MM-JJ")
    else:
        try:
            date.fromisoformat(it["date"])
        except ValueError:
            p.append("date impossible")
    h = it.get("headline")
    if not isinstance(h, dict) or not all(isinstance(h.get(k, ""), str) for k in ("pre", "hl", "post")):
        p.append("headline doit être un objet {pre, hl, post}")
    elif not (h.get("pre", "") + h.get("hl", "") + h.get("post", "")).strip():
        p.append("headline vide")
    if not isinstance(it.get("summary"), str) or not it["summary"].strip():
        p.append("summary manquant")
    if "detail" in it and not isinstance(it["detail"], str):
        p.append("detail doit être du texte")
    if "dateLabel" in it and not isinstance(it["dateLabel"], str):
        p.append("dateLabel doit être du texte")
    if not isinstance(it.get("url"), str) or not re.match(r"^https?://\S+$", it["url"]):
        p.append("url absente ou invalide")
    if "points" in it and (not isinstance(it["points"], list)
                           or not all(isinstance(x, str) and x.strip() for x in it["points"])):
        p.append("points doit être une liste de phrases")
    if "image" in it and it["image"] != "" and not (isinstance(it["image"], str) and HTTPS_RE.match(it["image"])):
        p.append("image doit être une adresse https ou une chaîne vide")
    if "imageAlt" in it and not isinstance(it["imageAlt"], str):
        p.append("imageAlt doit être du texte")
    return p


def clean(it):
    """Ne garde que les champs connus, dans l'ordre du README."""
    h = it["headline"]
    out = {
        "id": it["id"], "theme": it["theme"], "source": it["source"].strip(), "date": it["date"],
    }
    if it.get("dateLabel"):
        out["dateLabel"] = it["dateLabel"]
    out["headline"] = {"pre": h.get("pre", ""), "hl": h.get("hl", ""), "post": h.get("post", "")}
    out["summary"] = it["summary"].strip()
    out["detail"] = (it.get("detail") or "").strip()
    points = [x.strip() for x in it.get("points") or [] if isinstance(x, str) and x.strip()]
    if points:
        out["points"] = points[:5]
    out["url"] = it["url"].strip()
    return out


class _MetaParser(HTMLParser):
    """Récupère les balises <meta property/name=… content=…> du <head>."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        if tag != "meta":
            return
        a = {k.lower(): (v or "") for k, v in attrs}
        key = (a.get("property") or a.get("name") or "").lower()
        if key and a.get("content") and key not in self.meta:
            self.meta[key] = a["content"].strip()


def find_image(page_url):
    """Image d'aperçu officielle de la page (og:image / twitter:image).
    Renvoie ("", "") si la page n'en propose pas, None si la page n'a pas pu être lue."""
    try:
        req = urllib.request.Request(page_url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
        with urllib.request.urlopen(req, timeout=10) as r:
            if "html" not in (r.headers.get("Content-Type") or "html"):
                return "", ""
            raw = r.read(1_500_000)
            charset = r.headers.get_content_charset() or "utf-8"
        parser = _MetaParser()
        parser.feed(raw.decode(charset, errors="replace"))
    except Exception as e:  # réseau, 403, timeout… : on réessaiera à la prochaine collecte
        print(f"  page illisible pour l'image : {page_url} ({type(e).__name__})")
        return None
    m = parser.meta
    img = (m.get("og:image:secure_url") or m.get("og:image") or m.get("og:image:url")
           or m.get("twitter:image") or m.get("twitter:image:src") or "")
    if not img:
        return "", ""
    img = urljoin(page_url, img)
    if img.startswith("http://"):
        img = "https://" + img[len("http://"):]
    if not HTTPS_RE.match(img):
        return "", ""
    alt = m.get("og:image:alt") or m.get("twitter:image:alt") or ""
    return img, alt[:200]


def add_images(items, offline=False):
    """Complète les articles qui n'ont pas encore de champ image (une seule tentative par article)."""
    if offline:
        return 0, 0
    todo = [it for it in items if "image" not in it]
    cache, found, tried = {}, 0, 0
    for it in todo:
        url = it["url"]
        if url not in cache:
            if tried >= MAX_IMAGE_LOOKUPS:
                break
            cache[url] = find_image(url)
            tried += 1
        res = cache[url]
        if res is None:          # page illisible : pas de champ image, nouvel essai la prochaine fois
            continue
        img, alt = res
        it["image"] = img        # "" = la page ne propose pas d'image (on ne réessaie plus)
        if alt:
            it["imageAlt"] = alt
        found += bool(img)
    return found, tried


def load_news():
    with open(NEWS, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ValueError("news.json doit être un objet avec une liste 'items'")
    return data


def write_news(data):
    with open(NEWS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def story_key(it):
    h = it.get("headline") if isinstance(it.get("headline"), dict) else {}
    return ((it.get("url") or "").strip().rstrip("/"), (h.get("hl") or "").strip().lower())


def item_day(it):
    try:
        return date.fromisoformat(it.get("date", ""))
    except (TypeError, ValueError):
        m = re.match(r"^(\d{4}-\d{2}-\d{2})", it.get("id", ""))
        return date.fromisoformat(m.group(1)) if m else None


def cmd_check(_args):
    try:
        data = load_news()
    except (OSError, ValueError) as e:
        print(f"::error file=news.json::{e}")
        return 1
    errors = 0
    seen_ids, seen_stories = set(), set()
    for i, it in enumerate(data["items"]):
        for prob in item_problems(it):
            print(f"::error file=news.json::article #{i} ({it.get('id', '?') if isinstance(it, dict) else '?'}) : {prob}")
            errors += 1
        if isinstance(it, dict):
            if it.get("id") in seen_ids:
                print(f"::error file=news.json::id en double : {it.get('id')}")
                errors += 1
            seen_ids.add(it.get("id"))
            if story_key(it) in seen_stories:
                print(f"::warning file=news.json::article en double (même lien et même mot-clé) : {it.get('id')}")
            seen_stories.add(story_key(it))
    if not data.get("updatedAt"):
        print("::error file=news.json::updatedAt manquant")
        errors += 1
    print(f"news.json : {len(data['items'])} articles, {errors} erreur(s).")
    return 1 if errors else 0


def cmd_merge(args):
    today = date.fromisoformat(args.today)
    data = load_news()
    before = json.dumps(data["items"], ensure_ascii=False, sort_keys=True)

    files = args.new or sorted(glob.glob(os.path.join(ROOT, "tmp", "new-*.json")))
    fresh, report = [], []
    for path in files:
        theme = os.path.basename(path)[len("new-"):-len(".json")]
        if theme not in THEMES:
            print(f"::warning::{path} ignoré : thème inconnu '{theme}'")
            continue
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError) as e:
            print(f"::warning::{path} illisible, aucun article {theme} ajouté : {e}")
            report.append(f"{theme} : fichier illisible")
            continue
        if isinstance(raw, dict):
            raw = raw.get("items", [])
        kept = 0
        for it in raw if isinstance(raw, list) else []:
            probs = item_problems(it, expected_theme=theme)
            if probs:
                print(f"::warning::article {theme} écarté ({it.get('id', '?') if isinstance(it, dict) else '?'}) : {'; '.join(probs)}")
                continue
            fresh.append(clean(it))
            kept += 1
        report.append(f"{theme} : {kept} article(s) proposé(s)")

    # nouveaux en tête, puis les anciens ; doublons : le premier rencontré (le plus récent) gagne.
    # Doublon = même id, ou même url ET même mot-clé (une page récap ou un agenda
    # peut légitimement servir de source à plusieurs actualités différentes).
    merged, ids, stories = [], set(), set()
    for it in fresh + data["items"]:
        if not isinstance(it, dict):
            continue
        key = story_key(it)
        if it.get("id") in ids or key in stories:
            continue
        ids.add(it.get("id"))
        stories.add(key)
        merged.append(it)

    # articles de plus de 15 jours supprimés
    limit = today - timedelta(days=MAX_AGE_DAYS)
    kept_items = [it for it in merged if (item_day(it) is None or item_day(it) >= limit)]
    removed = len(merged) - len(kept_items)

    found, tried = add_images(kept_items, offline=args.no_images)
    if tried:
        report.append(f"images : {found} trouvée(s) sur {tried} page(s) visitée(s)")

    data["items"] = kept_items
    data["version"] = 1
    changed = json.dumps(kept_items, ensure_ascii=False, sort_keys=True) != before
    if changed:
        data["updatedAt"] = datetime.now(PARIS).replace(microsecond=0).isoformat()
    write_news(data)

    added = len([it for it in fresh if it in kept_items])
    print(f"Fusion : {' ; '.join(report) or 'aucun fichier'} → {added} ajouté(s), {removed} retiré(s) (> {MAX_AGE_DAYS} j), {len(kept_items)} au total.")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"### Fusion de news.json ({args.today})\n\n")
            for line in report:
                f.write(f"- {line}\n")
            f.write(f"- **{added}** ajouté(s), **{removed}** retiré(s) car trop anciens, **{len(kept_items)}** au total\n")
    return cmd_check(args)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    m = sub.add_parser("merge")
    m.add_argument("--today", default=datetime.now(PARIS).date().isoformat())
    m.add_argument("--new", nargs="*")
    m.add_argument("--no-images", action="store_true", help="ne pas visiter les pages sources")
    args = ap.parse_args()
    sys.exit(cmd_check(args) if args.cmd == "check" else cmd_merge(args))


if __name__ == "__main__":
    main()
