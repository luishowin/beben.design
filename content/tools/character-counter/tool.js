(function () {
    'use strict';

    var STORE_KEY = 'beben-does-it-fit-text';
    var TIGHT = 0.9;
    var WORDS_PER_MINUTE = 200;

    // Hard limits are enforced by the platform. Preview limits are where
    // the copy gets hidden behind "see more", which matters just as much.
    var LIMITS = [
        { id: 'title', name: 'SEO title tag', limit: 60,
          note: 'Google measures pixels, not characters, and cuts around 600px. Sixty is the safe read.' },
        { id: 'meta', name: 'Meta description', limit: 155,
          note: 'Desktop snippets truncate near 155 characters. Mobile cuts earlier, closer to 120.' },
        { id: 'x', name: 'X post', limit: 280,
          note: 'Hard limit. Every link counts as 23 characters no matter how long the URL is.' },
        { id: 'linkedin', name: 'LinkedIn preview', limit: 210,
          note: 'Everything past this collapses behind "see more" in the feed.' },
        { id: 'instagram', name: 'Instagram caption preview', limit: 125,
          note: 'The feed truncates to "more" around 125 characters. The full caption allows 2,200.' },
        { id: 'subject', name: 'Email subject line', limit: 50,
          note: 'Most mobile clients show about 50 characters in the inbox list.' },
        { id: 'ads', name: 'Google Ads headline', limit: 30,
          note: 'Hard limit per headline field. The form rejects anything longer.' },
        { id: 'youtube', name: 'YouTube title', limit: 100,
          note: 'Hard limit of 100, but search and suggested results cut around 70.' },
        { id: 'appstore', name: 'App Store subtitle', limit: 30,
          note: 'Hard limit on the subtitle field. The app name gets its own 30.' }
    ];

    var input = Tool.$('textInput');
    var list = Tool.$('limitList');
    var status = Tool.$('fitStatus');
    var selectedId = LIMITS[0].id;

    // ── COUNTING ──────────────────────────────────────────────────
    // Array.from splits on code points, so an emoji counts once rather
    // than as its two surrogate halves.
    function chars(text) {
        return Array.from(text).length;
    }

    function sliceChars(text, n) {
        return Array.from(text).slice(0, n).join('');
    }

    function stats(text) {
        var trimmed = text.trim();
        var words = trimmed ? trimmed.split(/\s+/).length : 0;
        var sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+(\s|$)/g) || [trimmed]).length : 0;
        var seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
        return {
            chars: chars(text),
            noSpace: chars(text.replace(/\s/g, '')),
            words: words,
            sentences: sentences,
            read: seconds < 60 ? seconds + 's' : Math.round(seconds / 60) + 'm'
        };
    }

    // ── RENDER ────────────────────────────────────────────────────
    function buildRows() {
        LIMITS.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'limit-row';
            li.setAttribute('data-id', item.id);
            li.setAttribute('role', 'button');
            li.setAttribute('tabindex', '0');
            li.innerHTML =
                '<span class="limit-name">' + item.name + '</span>' +
                '<span class="limit-count"><span class="limit-n">0</span> / ' + item.limit + '</span>' +
                '<span class="limit-bar"><span class="limit-fill"></span></span>';
            list.appendChild(li);
        });
    }

    function update() {
        var text = input.value;
        var s = stats(text);

        Tool.$('statChars').textContent = s.chars.toLocaleString();
        Tool.$('statNoSpace').textContent = s.noSpace.toLocaleString();
        Tool.$('statWords').textContent = s.words.toLocaleString();
        Tool.$('statSentences').textContent = s.sentences.toLocaleString();
        Tool.$('statRead').textContent = s.read;

        var over = 0;
        LIMITS.forEach(function (item) {
            var row = list.querySelector('[data-id="' + item.id + '"]');
            var pct = item.limit ? s.chars / item.limit : 0;

            row.classList.toggle('is-over', pct > 1);
            row.classList.toggle('is-tight', pct <= 1 && pct >= TIGHT);
            if (pct > 1) over += 1;

            row.querySelector('.limit-n').textContent = s.chars.toLocaleString();
            row.querySelector('.limit-fill').style.width = Math.min(100, pct * 100) + '%';
        });

        if (!s.chars) {
            status.textContent = 'EMPTY';
        } else if (over) {
            status.textContent = over + ' OVER';
        } else {
            status.textContent = 'ALL FIT';
        }

        renderCut();
        try { localStorage.setItem(STORE_KEY, text); } catch (e) { /* private mode */ }
    }

    function renderCut() {
        var item = LIMITS.filter(function (l) { return l.id === selectedId; })[0];
        var text = input.value;
        var all = Array.from(text);

        Tool.$('cutName').textContent = item.name + ' - ' + item.limit + ' characters';
        Tool.$('cutNote').textContent = item.note;

        var preview = Tool.$('cutPreview');
        if (!all.length) {
            preview.innerHTML = '<span class="cut-empty">Nothing to show yet.</span>';
            return;
        }

        var keep = document.createElement('span');
        keep.className = 'cut-keep';
        keep.textContent = all.slice(0, item.limit).join('');

        preview.innerHTML = '';
        preview.appendChild(keep);

        if (all.length > item.limit) {
            var drop = document.createElement('span');
            drop.className = 'cut-drop';
            drop.textContent = all.slice(item.limit).join('');
            preview.appendChild(drop);
        }
    }

    function select(id) {
        selectedId = id;
        Array.prototype.forEach.call(list.children, function (row) {
            row.classList.toggle('is-selected', row.getAttribute('data-id') === id);
        });
        renderCut();
    }

    // ── WIRING ────────────────────────────────────────────────────
    list.addEventListener('click', function (e) {
        var row = e.target.closest ? e.target.closest('.limit-row') : null;
        if (row) select(row.getAttribute('data-id'));
    });

    list.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var row = e.target.closest ? e.target.closest('.limit-row') : null;
        if (row) {
            e.preventDefault();
            select(row.getAttribute('data-id'));
        }
    });

    input.addEventListener('input', update);

    Tool.$('trimBtn').addEventListener('click', function () {
        var item = LIMITS.filter(function (l) { return l.id === selectedId; })[0];
        var text = input.value;
        if (!text) return Tool.toast('Nothing to copy yet.');
        var out = sliceChars(text, item.limit);
        Tool.copy(out, chars(text) > item.limit
            ? 'Trimmed to ' + item.limit + ' characters and copied.'
            : 'Copied, already within ' + item.limit + '.');
    });

    Tool.$('clearBtn').addEventListener('click', function () {
        input.value = '';
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* private mode */ }
        update();
        input.focus();
    });

    buildRows();
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }
    if (saved) input.value = saved;
    select(selectedId);
    update();
})();
