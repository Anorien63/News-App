/* veille. — fil d'actualités IA & jeux vidéo
 * Lit news.json (mis à jour chaque matin par une tâche planifiée Claude).
 * Les articles enregistrés, aimés et lus restent sur l'appareil (localStorage). */
(function () {
  'use strict';

  /* ---------- Icônes (SVG en trait, aria-hidden) ---------- */
  var ICON = {
    home: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path class="fillable" d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/></svg>',
    ai: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path class="fillable" d="M11 3.5l1.9 5.1L18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path class="fillable" d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
    games: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g class="thick"><path d="M6 8h12a4 4 0 0 1 4 4v3.5a2.5 2.5 0 0 1-4.5 1.5L16 15H8l-1.5 2A2.5 2.5 0 0 1 2 15.5V12a4 4 0 0 1 4-4z"/><path d="M7 10.5v3.5M5.25 12.25h3.5"/><path d="M16 11h.01M18 13.5h.01"/></g></svg>',
    saved: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path class="fillable" d="M6 3.5h12v17l-6-4.5-6 4.5z"/></svg>',
    check: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    heart: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>',
    share: '<svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5z"/></svg>',
    bookmark: '<svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
    chevronRight: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    chevronLeft: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    external: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>'
  };
  var DECOR = {
    ai: '<svg class="cover-decor" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    games: '<svg class="cover-decor" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M6 8h12a4 4 0 0 1 4 4v3.5a2.5 2.5 0 0 1-4.5 1.5L16 15H8l-1.5 2A2.5 2.5 0 0 1 2 15.5V12a4 4 0 0 1 4-4z"/><path d="M7 10.5v3.5M5.25 12.25h3.5"/></svg>'
  };

  /* Thèmes : ajouter une entrée ici + un onglet pour une nouvelle thématique */
  var THEMES = {
    ai: { label: 'IA', title: 'Intelligence artificielle' },
    games: { label: 'Jeux vidéo', title: 'Jeux vidéo' }
  };
  /* Catégories (identifiants uniques, toutes thématiques confondues) — même liste que scripts/news.py */
  var CATEGORIES = {
    ai: [
      { id: 'modeles', label: 'Modèles', short: 'LLM' },
      { id: 'design', label: 'Design', short: 'DES' },
      { id: 'code', label: 'Code', short: '</>' },
      { id: 'agents', label: 'Agents', short: 'AG' },
      { id: 'business', label: 'Business', short: 'BIZ' }
    ],
    games: [
      { id: 'pc', label: 'PC', short: 'PC' },
      { id: 'playstation', label: 'PlayStation', short: 'PS' },
      { id: 'xbox', label: 'Xbox', short: 'XB' },
      { id: 'nintendo', label: 'Nintendo', short: 'NS' },
      { id: 'mobile', label: 'Mobile', short: 'MOB' },
      { id: 'industrie', label: 'Industrie', short: 'IND' },
      { id: 'evenements', label: 'Événements', short: 'EVT' }
    ]
  };
  var CAT_BY_ID = {};
  Object.keys(CATEGORIES).forEach(function (t) { CATEGORIES[t].forEach(function (c) { CAT_BY_ID[c.id] = c; }); });

  var TABS = [
    { id: 'home', label: 'Accueil', title: 'À la une' },
    { id: 'ai', label: 'IA', title: THEMES.ai.title },
    { id: 'games', label: 'Jeux vidéo', title: THEMES.games.title },
    { id: 'saved', label: 'Enregistrés', title: 'Enregistrés' }
  ];

  /* ---------- Stockage local (protégé : peut être indisponible) ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
  }

  var state = {
    tab: load('veille.tab', 'home'),
    fav: load('veille.favCats', []).filter(function (id) { return !!CAT_BY_ID[id]; }), // catégories favorites, gardées sur l'iPhone
    items: [],
    updatedAt: null,
    loading: true,
    offline: false,
    saved: load('veille.saved', {}),   // id -> article complet (reste dispo même s'il sort du fil)
    liked: load('veille.liked', {}),
    seen: load('veille.seen', {}),
    openId: null,
    lastFetch: 0
  };
  if (!TABS.some(function (t) { return t.id === state.tab; })) state.tab = 'home';

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    feed: $('feed'), list: $('list'), sources: $('sources'), title: $('feed-title'),
    status: $('feed-status'), banner: $('offline-banner'), detail: $('detail'),
    toast: $('toast'), tabbar: $('tabbar'), refresh: $('refresh-btn')
  };

  /* ---------- Utilitaires ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : '#'; }
  var MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function dayDiff(d) {
    var a = new Date(d); var b = new Date();
    a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
  }
  function dateLabel(it) {
    if (it.dateLabel) return it.dateLabel;
    if (!it.date) return '';
    var d = new Date(it.date); if (isNaN(d)) return '';
    var n = dayDiff(d);
    if (n === 0) return 'Aujourd’hui';
    if (n === 1) return 'Hier';
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function updatedLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    var hh = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    var n = dayDiff(d);
    if (n === 0) return 'mis à jour aujourd’hui à ' + hh;
    if (n === 1) return 'mis à jour hier à ' + hh;
    return 'mis à jour le ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' à ' + hh;
  }
  var SMALL_WORDS = /^(à|au|aux|de|des|du|d’|la|le|les|l’|et|of|and)$/i;
  function initials(name) {
    var words = String(name || '?').split(/\s+/).filter(function (w) { return w && !SMALL_WORDS.test(w); });
    return words.slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?';
  }
  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }

  /* ---------- Données ---------- */
  function normalize(raw) {
    return (raw || []).filter(function (it) { return it && it.id && it.headline; }).map(function (it) {
      var h = typeof it.headline === 'string' ? { pre: it.headline, hl: '', post: '' } : it.headline;
      return {
        id: String(it.id), theme: it.theme, source: it.source || 'Source',
        initials: it.initials || initials(it.source), date: it.date, dateLabel: it.dateLabel,
        headline: { pre: h.pre || '', hl: h.hl || '', post: h.post || '' },
        summary: it.summary || '', detail: it.detail || '', url: it.url || '',
        tags: Array.isArray(it.tags) ? it.tags.filter(function (t) { return !!CAT_BY_ID[t]; }) : [],
        image: /^https:\/\//i.test(it.image || '') ? it.image : '', imageAlt: it.imageAlt || '',
        points: Array.isArray(it.points) ? it.points.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []
      };
    }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  }

  function applyData(data, fromCache) {
    state.items = normalize(data.items);
    state.updatedAt = data.updatedAt || null;
    if (!fromCache) save('veille.cache', data);
  }

  function fetchNews(manual) {
    els.refresh.classList.add('is-spinning');
    els.refresh.setAttribute('aria-busy', 'true');
    return fetch('news.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var before = state.updatedAt;
        applyData(data, false);
        // hors ligne, le service worker répond avec la dernière version gardée sur l'appareil
        state.offline = navigator.onLine === false;
        state.lastFetch = Date.now();
        if (manual) {
          toast(state.offline ? 'Hors ligne — dernière version enregistrée affichée'
            : before && before === state.updatedAt ? 'Vous êtes déjà à jour' : 'Actualités mises à jour');
        }
      })
      .catch(function () {
        state.offline = true;
        if (manual) toast('Impossible d’actualiser — vérifiez votre connexion');
      })
      .then(function () {
        state.loading = false;
        els.refresh.classList.remove('is-spinning');
        els.refresh.removeAttribute('aria-busy');
        render();
      });
  }

  /* ---------- Vues dérivées ---------- */
  function itemsForTab(tab) {
    if (tab === 'saved') {
      return Object.keys(state.saved).map(function (id) { return state.saved[id]; })
        .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    }
    if (tab === 'home') return state.items;
    return state.items.filter(function (it) { return it.theme === tab; });
  }
  function findItem(id) {
    return state.items.find(function (it) { return it.id === id; }) || state.saved[id] || null;
  }
  function unreadCount(theme) {
    return state.items.filter(function (it) { return it.theme === theme && !state.seen[it.id]; }).length;
  }

  /* ---------- Rendu ---------- */
  function renderTabs() {
    els.tabbar.innerHTML = TABS.map(function (t) {
      var count = THEMES[t.id] ? unreadCount(t.id) : 0;
      var label = t.label + (count ? ', ' + plural(count, 'nouvelle', 'nouvelles') : '');
      return '<button type="button" class="tab" data-action="tab" data-id="' + t.id + '"' +
        (state.tab === t.id ? ' aria-current="page"' : '') + ' aria-label="' + esc(label) + '">' +
        '<span class="tab-bar" aria-hidden="true"></span>' +
        '<span class="tab-icon">' + ICON[t.id] + (count ? '<span class="badge" aria-hidden="true">' + (count > 9 ? '9+' : count) + '</span>' : '') + '</span>' +
        '<span class="tab-label" aria-hidden="true">' + esc(t.label) + '</span></button>';
    }).join('');
  }

  /* Catégories proposées dans l'onglet courant */
  function tabCats(tab, base) {
    if (tab === 'ai' || tab === 'games') return CATEGORIES[tab];
    if (tab === 'saved') {
      var themes = {};
      base.forEach(function (it) { themes[it.theme] = 1; });
      return [].concat(themes.ai ? CATEGORIES.ai : [], themes.games ? CATEGORIES.games : []);
    }
    return CATEGORIES.ai.concat(CATEGORIES.games);
  }
  function activeCats(cats) {
    return cats.filter(function (c) { return state.fav.indexOf(c.id) !== -1; }).map(function (c) { return c.id; });
  }
  function catLabels(ids) { return ids.map(function (id) { return CAT_BY_ID[id].label; }).join(', '); }

  function renderCats(base, cats, active) {
    if (!cats.length) { els.sources.hidden = true; els.sources.innerHTML = ''; return; }
    els.sources.hidden = false;
    var chips = [{ id: '', label: 'Tout', short: 'Tout', pressed: !active.length, count: base.length }].concat(cats.map(function (c) {
      return { id: c.id, label: c.label, short: c.short, pressed: active.indexOf(c.id) !== -1,
        count: base.filter(function (it) { return it.tags.indexOf(c.id) !== -1; }).length };
    }));
    els.sources.innerHTML = chips.map(function (c) {
      var aria = c.label + ', ' + plural(c.count, 'actualité', 'actualités') + (c.id ? ' — catégorie favorite' : '');
      return '<button type="button" class="source" data-action="' + (c.id ? 'cat' : 'cat-clear') + '" data-key="' + esc(c.id || 'tout') + '" aria-pressed="' + c.pressed + '" aria-label="' + esc(aria) + '">' +
        '<span class="source-ring" aria-hidden="true"><span class="source-avatar">' + esc(c.short) + '</span>' +
        (c.id ? '<span class="source-check">' + ICON.check + '</span>' : '') + '</span>' +
        '<span class="source-label" aria-hidden="true">' + esc(c.label) + '</span></button>';
    }).join('');
  }

  function toggleCat(id) {
    var i = state.fav.indexOf(id);
    if (i === -1) state.fav.push(id); else state.fav.splice(i, 1);
    save('veille.favCats', state.fav);
  }
  function clearCats() {
    var cats = tabCats(state.tab, itemsForTab(state.tab)).map(function (c) { return c.id; });
    state.fav = state.fav.filter(function (id) { return cats.indexOf(id) === -1; });
    save('veille.favCats', state.fav);
  }

  function headlineHTML(h) {
    return esc(h.pre) + (h.hl ? '<span class="hl">' + esc(h.hl) + '</span>' : '') + esc(h.post);
  }

  var brokenImages = {};   // images qui n'ont pas pu se charger pendant cette session
  function hasImage(it) { return !!it.image && !brokenImages[it.image]; }

  function coverTopHTML(it, i, total, theme) {
    return '<div class="cover-top">' + (theme ? '<span class="chip">' + ICON[it.theme].replace('width="26" height="26"', '') + esc(theme.label) + '</span>' : '<span></span>') +
      '<span class="counter"><span class="sr-only">Actualité </span>' + (i + 1) + '<span aria-hidden="true"> / </span><span class="sr-only"> sur </span>' + total + '</span></div>';
  }

  function imgHTML(it, cls) {
    // referrerpolicy : certains sites refusent l'affichage de leurs images quand la page d'origine est indiquée
    return '<img class="' + cls + '" src="' + esc(it.image) + '" alt="' + esc(it.imageAlt) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
  }

  function postHTML(it, i, total) {
    var theme = THEMES[it.theme];
    var withImg = hasImage(it);
    var isNew = !state.seen[it.id] && state.tab !== 'saved';
    var saved = !!state.saved[it.id];
    var liked = !!state.liked[it.id];
    var cover = withImg
      ? '<div class="cover cover--image">' + imgHTML(it, 'cover-img') + coverTopHTML(it, i, total, theme) + '</div>' +
        '<h2 class="headline headline--below" id="h-' + esc(it.id) + '">' + headlineHTML(it.headline) + '</h2>'
      : '<div class="cover">' + (DECOR[it.theme] || '') + coverTopHTML(it, i, total, theme) +
        '<h2 class="headline" id="h-' + esc(it.id) + '">' + headlineHTML(it.headline) + '</h2></div>';
    return '<article class="post' + (isNew ? ' is-new' : '') + '" data-id="' + esc(it.id) + '" data-i="' + i + '" data-total="' + total + '" aria-labelledby="h-' + esc(it.id) + '">' +
      '<div class="post-head"><span class="avatar" aria-hidden="true">' + esc(it.initials) + '</span>' +
      '<div class="post-meta"><span class="post-source">' + esc(it.source) + (isNew ? '<span class="new-tag">Nouveau</span>' : '') + '</span>' +
      '<span class="post-sub">' + esc(theme ? theme.label : '') + (theme ? ' · ' : '') +
        (it.tags.length ? esc(catLabels(it.tags)) + ' · ' : '') + esc(dateLabel(it)) + '</span></div></div>' +
      cover +
      '<div class="actions">' +
      '<button type="button" class="action" data-action="like" data-id="' + esc(it.id) + '" aria-pressed="' + liked + '" aria-label="J’aime">' + ICON.heart + '</button>' +
      '<button type="button" class="action" data-action="share" data-id="' + esc(it.id) + '" aria-label="Partager">' + ICON.share + '</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="action" data-action="save" data-id="' + esc(it.id) + '" aria-pressed="' + saved + '" aria-label="Enregistrer">' + ICON.bookmark + '</button>' +
      '</div>' +
      '<div class="caption"><p>' + esc(it.summary) + '</p>' +
      '<button type="button" class="more" data-action="open" data-id="' + esc(it.id) + '">Lire la suite<span class="sr-only"> : ' + esc(it.headline.pre + it.headline.hl + it.headline.post) + '</span>' + ICON.chevronRight + '</button></div>' +
      '</article>';
  }

  function render() { withFocus(renderInner); }

  // garder le focus (clavier / VoiceOver) sur le même contrôle après un re-rendu
  function withFocus(fn) {
    var active = document.activeElement;
    var focusSel = null;
    if (active && active.closest && active.closest('#tabbar, #sources') && active.dataset.action) {
      focusSel = '[data-action="' + active.dataset.action + '"]' +
        (active.dataset.id ? '[data-id="' + active.dataset.id + '"]' : '') +
        (active.dataset.key ? '[data-key="' + CSS.escape(active.dataset.key) + '"]' : '');
    }
    fn();
    if (focusSel) { var el = document.querySelector(focusSel); if (el) el.focus(); }
  }

  function renderInner() {
    var tab = TABS.find(function (t) { return t.id === state.tab; });
    var base = itemsForTab(state.tab);
    var cats = tabCats(state.tab, base);
    var active = activeCats(cats);
    // Les favoris d'un thème ne filtrent que les articles de ce thème : sans favori IA, toute l'IA reste visible
    var activeByTheme = {};
    active.forEach(function (id) {
      Object.keys(CATEGORIES).forEach(function (t) {
        if (CATEGORIES[t].some(function (c) { return c.id === id; })) (activeByTheme[t] = activeByTheme[t] || []).push(id);
      });
    });
    var list = base.filter(function (it) {
      var want = activeByTheme[it.theme];
      return !want || it.tags.some(function (t) { return want.indexOf(t) !== -1; });
    });

    els.title.textContent = tab.title;
    document.title = tab.title + ' · veille.';
    renderTabs();
    renderCats(base, cats, active);

    var n = list.length;
    if (state.loading && !state.items.length) {
      els.status.textContent = 'Chargement des actualités…';
    } else if (state.tab === 'saved') {
      els.status.textContent = n ? plural(n, 'article enregistré', 'articles enregistrés') + ' · disponibles hors ligne' : 'Aucun article';
    } else {
      els.status.textContent = plural(n, 'actualité', 'actualités') +
        (active.length ? ' · ' + catLabels(active) : (state.updatedAt ? ' · ' + updatedLabel(state.updatedAt) : ''));
    }

    if (state.offline) {
      els.banner.hidden = false;
      els.banner.textContent = state.items.length
        ? 'Hors ligne : vous lisez la dernière version enregistrée sur l’appareil.'
        : 'Hors ligne : impossible de charger les actualités. Réessayez avec le bouton d’actualisation en haut à droite.';
    } else { els.banner.hidden = true; }

    if (state.loading && !state.items.length) {
      els.list.innerHTML = '<div class="skeleton" aria-hidden="true"><div class="sk-line" style="width:40%"></div><div class="sk-cover"></div><div class="sk-line" style="width:85%"></div><div class="sk-line" style="width:60%"></div></div>';
    } else if (!n && active.length && base.length) {
      els.list.innerHTML = '<div class="empty"><h2>Rien dans vos catégories ici</h2><p>Aucune actualité pour ' + esc(catLabels(active)) +
        ' dans cet onglet pour l’instant.</p><button type="button" class="btn-primary" data-action="cat-clear">Tout afficher</button></div>';
    } else if (!n) {
      els.list.innerHTML = state.tab === 'saved'
        ? '<div class="empty">' + ICON.bookmark.replace('stroke="currentColor"', 'stroke="#FFB27A"') +
          '<h2>Rien d’enregistré pour l’instant</h2><p>Touchez l’icône signet sous une actualité pour la retrouver ici, même hors ligne.</p>' +
          '<button type="button" class="btn-primary" data-action="tab" data-id="home">Parcourir l’actu</button></div>'
        : '<div class="empty"><h2>Pas encore d’actualité ici</h2><p>La prochaine collecte a lieu demain matin. Vous pouvez aussi actualiser maintenant.</p>' +
          '<button type="button" class="btn-primary" data-action="refresh">Actualiser</button></div>';
    } else {
      els.list.innerHTML = list.map(function (it, i) { return postHTML(it, i, n); }).join('') +
        (state.tab === 'saved' ? '' : '<p class="feed-end">Vous êtes à jour · prochaine collecte demain matin</p>');
    }
    observeSeen();
    renderDetail();
  }

  function renderDetail() {
    var it = state.openId ? findItem(state.openId) : null;
    document.body.classList.toggle('detail-open', !!it);
    if (!it) { els.detail.hidden = true; els.detail.innerHTML = ''; return; }
    var theme = THEMES[it.theme];
    var saved = !!state.saved[it.id];
    els.detail.innerHTML =
      '<div class="detail-bar"><button type="button" class="back" data-action="close">' + ICON.chevronLeft + 'Retour</button></div>' +
      '<div class="detail-body">' +
      '<div class="chip-row">' + (theme ? '<span class="chip">' + esc(theme.label) + '</span>' : '') +
        it.tags.map(function (t) { return '<span class="chip chip--tag">' + esc(CAT_BY_ID[t].label) + '</span>'; }).join('') + '</div>' +
      '<h2 class="headline" id="detail-title">' + headlineHTML(it.headline) + '</h2>' +
      '<p class="meta">' + esc(it.source) + ' · ' + esc(dateLabel(it)) + '</p>' +
      (hasImage(it) ? '<figure class="detail-figure">' + imgHTML(it, 'detail-img') +
        '<figcaption>Image : ' + esc(it.source) + '</figcaption></figure>' : '') +
      '<p class="text lead">' + esc(it.summary) + '</p>' +
      (it.points.length ? '<section class="points" aria-labelledby="points-title"><h3 id="points-title">L’essentiel</h3><ul>' +
        it.points.map(function (pt) { return '<li>' + esc(pt) + '</li>'; }).join('') + '</ul></section>' : '') +
      (it.detail ? '<p class="text">' + esc(it.detail) + '</p>' : '') +
      '<div class="detail-actions">' +
      '<button type="button" class="btn-secondary" data-action="save" data-id="' + esc(it.id) + '" aria-pressed="' + saved + '">' + ICON.bookmark.replace('width="25" height="25"', 'width="20" height="20"') + (saved ? 'Enregistré' : 'Enregistrer') + '</button>' +
      '<button type="button" class="btn-secondary" data-action="share" data-id="' + esc(it.id) + '">' + ICON.share.replace('width="25" height="25"', 'width="20" height="20"') + 'Partager</button>' +
      '</div>' +
      (it.url ? '<a class="btn-primary" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener">Lire sur ' + esc(it.source) + ICON.external + '<span class="sr-only"> (ouvre le navigateur)</span></a>' : '') +
      '</div>';
    els.detail.hidden = false;
  }

  /* ---------- Lu / non lu ---------- */
  var observer = null;
  function observeSeen() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window) || state.tab === 'saved') return;
    observer = new IntersectionObserver(function (entries) {
      var changed = false;
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var id = e.target.getAttribute('data-id');
          if (id && !state.seen[id]) {
            // marqué lu après 1,5 s à l'écran : la mention « Nouveau » reste visible pendant la lecture
            setTimeout(function () {
              if (!state.seen[id]) { state.seen[id] = Date.now(); save('veille.seen', pruneSeen(state.seen)); withFocus(renderTabs); }
            }, 1500);
            changed = true;
          }
        }
      });
      return changed;
    }, { threshold: 0.6 });
    els.list.querySelectorAll('.post').forEach(function (p) { observer.observe(p); });
  }
  function pruneSeen(seen) {
    var cutoff = Date.now() - 1000 * 60 * 60 * 24 * 60; // garde 60 jours
    Object.keys(seen).forEach(function (k) { if (seen[k] < cutoff) delete seen[k]; });
    return seen;
  }

  /* ---------- Toast avec « Annuler » ---------- */
  var toastTimer = null; var toastUndo = null;
  function toast(msg, undo) {
    clearTimeout(toastTimer);
    toastUndo = undo || null;
    els.toast.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button" data-action="undo">Annuler</button>' : '');
    els.toast.hidden = false;
    toastTimer = setTimeout(hideToast, undo ? 5000 : 3000);
  }
  function hideToast() { els.toast.hidden = true; toastUndo = null; }

  /* ---------- Actions ---------- */
  function toggleSave(id) {
    var it = findItem(id); if (!it) return;
    var prev = state.saved[id] || null;
    if (prev) delete state.saved[id];
    else state.saved[id] = Object.assign({}, it, { savedAt: Date.now() });
    save('veille.saved', state.saved);
    render();
    toast(prev ? 'Retiré des enregistrés' : 'Article enregistré', function () {
      if (prev) state.saved[id] = prev; else delete state.saved[id];
      save('veille.saved', state.saved); render();
    });
  }
  function toggleLike(id, btn) {
    if (state.liked[id]) delete state.liked[id]; else state.liked[id] = true;
    save('veille.liked', state.liked);
    if (btn) btn.setAttribute('aria-pressed', String(!!state.liked[id]));
  }
  function share(id) {
    var it = findItem(id); if (!it) return;
    var title = it.headline.pre + it.headline.hl + it.headline.post;
    if (navigator.share) {
      navigator.share({ title: title, text: it.summary, url: it.url || location.href }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(it.url || location.href).then(function () { toast('Lien copié'); }, function () { toast('Copie impossible'); });
    }
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollToTop(smooth) {
    window.scrollTo({ top: 0, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  }

  var lastOpener = null;
  function openDetail(id, opener) {
    lastOpener = opener || null;
    state.openId = id;
    renderDetail();
    els.detail.scrollTop = 0;
    var back = els.detail.querySelector('.back'); if (back) back.focus();
  }
  function closeDetail() {
    state.openId = null; renderDetail();
    if (lastOpener && document.body.contains(lastOpener)) lastOpener.focus();
  }
  function pickTab(id) {
    if (state.openId) { state.openId = null; }
    if (state.tab === id) { scrollToTop(true); renderDetail(); return; } // re-toucher l'onglet = remonter en haut
    state.tab = id;
    save('veille.tab', id);
    render();
    scrollToTop(false);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]'); if (!btn) return;
    var id = btn.getAttribute('data-id');
    switch (btn.getAttribute('data-action')) {
      case 'tab': pickTab(id); break;
      case 'cat': toggleCat(btn.getAttribute('data-key')); render(); scrollToTop(false); break;
      case 'cat-clear': clearCats(); render(); scrollToTop(false); break;
      case 'like': toggleLike(id, btn); break;
      case 'save': toggleSave(id); break;
      case 'share': share(id); break;
      case 'open': openDetail(id, btn); break;
      case 'close': closeDetail(); break;
      case 'refresh': fetchNews(true); break;
      case 'undo': if (toastUndo) { var u = toastUndo; hideToast(); u(); } break;
    }
  });
  els.refresh.addEventListener('click', function () { fetchNews(true); });
  // toucher le logo = remonter en haut du fil (en plus du toucher sur la barre d'état de l'iPhone)
  document.getElementById('top-btn').addEventListener('click', function () {
    if (state.openId) closeDetail();
    scrollToTop(true);
  });

  // Image introuvable ou bloquée par le site : on revient à la couverture typographique
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || !/cover-img|detail-img/.test(img.className)) return;
    brokenImages[img.getAttribute('src')] = true;
    if (img.classList.contains('detail-img')) { var fig = img.closest('figure'); if (fig) fig.remove(); return; }
    var art = img.closest('.post'); if (!art) return;
    var it = findItem(art.getAttribute('data-id')); if (!it) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = postHTML(it, +art.getAttribute('data-i'), +art.getAttribute('data-total'));
    art.replaceWith(tmp.firstChild);
    observeSeen();
  }, true);
  els.detail.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });

  // Retour sur l'app après un moment : on recharge si la dernière collecte date de plus de 30 min
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - state.lastFetch > 30 * 60 * 1000) fetchNews(false);
  });

  /* ---------- Démarrage ---------- */
  var cached = load('veille.cache', null);
  if (cached) { applyData(cached, true); state.loading = false; }
  render();
  fetchNews(false);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
