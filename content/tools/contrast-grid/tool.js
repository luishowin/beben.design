(function () {
    'use strict';

    var STORE_KEY = 'beben-contrast-grid-palette';
    var MAX_COLOURS = 12;

    var DEFAULT_PALETTE = [
        '#141414 Ink',
        '#f5f5f5 Paper',
        '#efefef Paper Soft',
        '#E71D36 Signal',
        '#FFC710 Banana',
        '#767676 Muted'
    ].join('\n');

    // Canvas normalises any colour the browser understands and leaves
    // fillStyle untouched when it does not, which doubles as validation.
    var probe = document.createElement('canvas').getContext('2d');

    var input = Tool.$('paletteInput');
    var scroll = Tool.$('gridScroll');
    var status = Tool.$('gridStatus');
    var summary = Tool.$('summary');
    var detail = Tool.$('detail');
    var detailEmpty = Tool.$('detailEmpty');
    var detailSwatch = Tool.$('detailSwatch');

    var size = 'normal';
    var colours = [];
    var selected = null;

    // ── COLOUR ────────────────────────────────────────────────────
    function parseColour(str) {
        probe.fillStyle = '#000000';
        probe.fillStyle = str;
        var first = probe.fillStyle;
        probe.fillStyle = '#ffffff';
        probe.fillStyle = str;
        if (first !== probe.fillStyle) return null;

        var m = /^#([0-9a-f]{6})$/i.exec(first);
        if (m) {
            var n = parseInt(m[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(first);
        if (m) return [+m[1], +m[2], +m[3]];
        return null;
    }

    function toHex(rgb) {
        return '#' + rgb.map(function (v) {
            return ('0' + Math.round(v).toString(16)).slice(-2);
        }).join('');
    }

    function luminance(rgb) {
        var c = rgb.map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    function ratio(a, b) {
        var la = luminance(a), lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    function thresholds() {
        return size === 'large' ? { aa: 3, aaa: 4.5 } : { aa: 4.5, aaa: 7 };
    }

    function grade(r) {
        var t = thresholds();
        if (r >= t.aaa) return 'AAA';
        if (r >= t.aa) return 'AA';
        return 'FAIL';
    }

    // A pair too close to read would render its own score invisible, which
    // looks like a broken cell rather than a verdict. Below 2:1 the label
    // switches to whichever of black or white the background can carry;
    // the cell keeps the real colours, and the badge still says FAIL.
    function labelColour(fg, bg) {
        if (ratio(fg, bg) >= 2) return toHex(fg);
        return luminance(bg) > 0.4 ? '#141414' : '#F7F4F3';
    }

    // ── PARSE ─────────────────────────────────────────────────────
    // One entry per line. Commas also separate entries, but only on lines
    // with no brackets, because rgb(231, 29, 54) is full of commas that
    // are part of the value.
    function splitEntries(text) {
        var entries = [];
        text.split(/[\n;]+/).forEach(function (line) {
            line = line.trim();
            if (!line) return;
            if (line.indexOf('(') === -1) {
                line.split(',').forEach(function (part) {
                    part = part.trim();
                    if (part) entries.push(part);
                });
            } else {
                entries.push(line);
            }
        });
        return entries;
    }

    function parsePalette(text) {
        var out = [], bad = [];
        splitEntries(text).forEach(function (entry) {
            // "rgb(231, 29, 54) Signal" or "#141414 Ink": a value, then an
            // optional human label.
            var split = /^([a-z]+\([^)]*\))\s*(.*)$/i.exec(entry)
                || /^(\S+)\s*(.*)$/.exec(entry);
            if (!split) { bad.push(entry); return; }

            var value = split[1];
            var label = (split[2] || '').trim();
            var rgb = parseColour(value);

            if (!rgb) { bad.push(entry); return; }
            out.push({ rgb: rgb, hex: toHex(rgb), label: label || toHex(rgb) });
        });
        return { colours: out, bad: bad };
    }

    // ── RENDER ────────────────────────────────────────────────────
    function headCell(colour, isRow) {
        return '<div class="head-chip">'
            + '<span class="head-dot" style="background:' + colour.hex + '"></span>'
            + '<span class="head-name" title="' + colour.hex + '">' + escapeHtml(colour.label) + '</span>'
            + '</div>';
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function render() {
        var parsed = parsePalette(input.value);
        colours = parsed.colours;

        if (colours.length > MAX_COLOURS) {
            colours = colours.slice(0, MAX_COLOURS);
        }

        if (!colours.length) {
            scroll.innerHTML = '<p class="parse-error">No colours recognised yet. '
                + 'Try one per line, like <strong>#E71D36</strong>.</p>';
            status.textContent = 'EMPTY';
            summary.textContent = 'Waiting for a palette.';
            clearDetail();
            return;
        }

        var html = '<table class="grid-table"><thead><tr><th class="corner">on &rarr;</th>';
        colours.forEach(function (bg) {
            html += '<th scope="col">' + headCell(bg) + '</th>';
        });
        html += '</tr></thead><tbody>';

        var pass = 0, total = 0;
        colours.forEach(function (fg, r) {
            html += '<tr><th scope="row" class="row-head">' + headCell(fg, true) + '</th>';
            colours.forEach(function (bg, c) {
                var value = ratio(fg.rgb, bg.rgb);
                var badge = grade(value);
                total += 1;
                if (badge !== 'FAIL') pass += 1;
                html += '<td>'
                    + '<button type="button" class="cell' + (badge === 'FAIL' ? ' is-fail' : '')
                    + '" data-r="' + r + '" data-c="' + c + '"'
                    + ' style="background:' + bg.hex + ';color:' + labelColour(fg.rgb, bg.rgb) + '"'
                    + ' title="' + escapeHtml(fg.label) + ' on ' + escapeHtml(bg.label) + '">'
                    + '<span class="cell-ratio">' + value.toFixed(2) + '</span>'
                    + '<span class="cell-badge">' + badge + '</span>'
                    + '</button></td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        scroll.innerHTML = html;
        status.textContent = colours.length + ' x ' + colours.length;

        var t = thresholds();
        var note = pass + ' of ' + total + ' pairs clear AA at ' + t.aa.toFixed(1) + ':1';
        if (parsed.bad.length) {
            note += '. Skipped ' + parsed.bad.length + ' unrecognised '
                + (parsed.bad.length === 1 ? 'value' : 'values');
        }
        if (parsed.colours.length > MAX_COLOURS) {
            note += '. Showing the first ' + MAX_COLOURS + ' colours';
        }
        summary.textContent = note + '.';

        if (selected && (selected.r >= colours.length || selected.c >= colours.length)) {
            clearDetail();
        } else if (selected) {
            showDetail(selected.r, selected.c);
        }
    }

    // ── DETAIL ────────────────────────────────────────────────────
    function clearDetail() {
        selected = null;
        detail.hidden = true;
        detailEmpty.hidden = false;
    }

    function showDetail(r, c) {
        var fg = colours[r], bg = colours[c];
        if (!fg || !bg) return clearDetail();

        selected = { r: r, c: c };
        detail.hidden = false;
        detailEmpty.hidden = true;

        detailSwatch.style.background = bg.hex;
        detailSwatch.style.color = fg.hex;

        var value = ratio(fg.rgb, bg.rgb);
        Tool.$('detailPair').textContent = fg.label + ' on ' + bg.label;
        Tool.$('detailRatio').textContent = value.toFixed(2) + ':1';

        var t = thresholds();
        setVerdict(Tool.$('detailAA'), value >= t.aa, t.aa);
        setVerdict(Tool.$('detailAAA'), value >= t.aaa, t.aaa);

        var cells = scroll.querySelectorAll('.cell');
        Array.prototype.forEach.call(cells, function (cell) {
            cell.classList.toggle('is-selected',
                +cell.getAttribute('data-r') === r && +cell.getAttribute('data-c') === c);
        });
    }

    function setVerdict(el, ok, threshold) {
        el.textContent = (ok ? 'Pass' : 'Fail') + ' (needs ' + threshold.toFixed(1) + ':1)';
        el.className = 'spec-value ' + (ok ? 'pass' : 'fail');
    }

    scroll.addEventListener('click', function (e) {
        var cell = e.target.closest ? e.target.closest('.cell') : null;
        if (cell) showDetail(+cell.getAttribute('data-r'), +cell.getAttribute('data-c'));
    });

    // ── MARKDOWN ──────────────────────────────────────────────────
    function markdown() {
        if (!colours.length) return '';
        var t = thresholds();
        var head = ['Text \\ Background'].concat(colours.map(function (c) { return c.label; }));
        var rows = [
            '| ' + head.join(' | ') + ' |',
            '| ' + head.map(function () { return '---'; }).join(' | ') + ' |'
        ];
        colours.forEach(function (fg) {
            var cells = colours.map(function (bg) {
                var v = ratio(fg.rgb, bg.rgb);
                return v.toFixed(2) + ' ' + grade(v);
            });
            rows.push('| ' + fg.label + ' | ' + cells.join(' | ') + ' |');
        });
        rows.push('');
        rows.push('WCAG 2.1, ' + (size === 'large' ? 'large or bold text' : 'normal text')
            + ': AA needs ' + t.aa.toFixed(1) + ':1, AAA needs ' + t.aaa.toFixed(1) + ':1.');
        return rows.join('\n');
    }

    // ── WIRING ────────────────────────────────────────────────────
    Tool.segmented(Tool.$('sizeControl'), function (value) {
        size = value;
        render();
    });

    input.addEventListener('input', function () {
        try { localStorage.setItem(STORE_KEY, input.value); } catch (e) { /* private mode */ }
        render();
    });

    Tool.$('copyBtn').addEventListener('click', function () {
        var md = markdown();
        if (!md) return Tool.toast('Add a palette first.');
        Tool.copy(md, 'Markdown table copied to clipboard.');
    });

    Tool.$('resetBtn').addEventListener('click', function () {
        input.value = DEFAULT_PALETTE;
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* private mode */ }
        clearDetail();
        render();
        Tool.toast('Sample palette restored.');
    });

    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }
    input.value = saved || DEFAULT_PALETTE;
    render();
})();
