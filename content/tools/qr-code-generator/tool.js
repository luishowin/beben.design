(function () {
    'use strict';

    // UTF-8 so URLs with accents, emoji, or non-Latin text survive encoding.
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

    var EXPORT_PX = 1000;
    var QUIET_MODULES = 4;
    var LOGO_MAX_BYTES = 5 * 1024 * 1024;

    var DEFAULTS = {
        ecc: 'L',
        pattern: 'square',
        fg: '#141414',
        bg: '#FFFFFF',
        transparent: false,
        finderFrame: 'default',
        finderCenter: 'default',
        finderFrameColor: '#141414',
        finderCenterColor: '#141414',
        frame: 'none',
        frameLabel: 'Scan me',
        frameBorder: '#141414',
        frameBg: '#FFFFFF',
        frameLabelColor: '#141414',
        frameRadius: 12,
        framePad: 2,
        logoDataUrl: null,
        logoSize: 22,
        logoBacking: true,
        logoShape: 'rounded',
        logoRadius: 18
    };

    var state = {};
    for (var k in DEFAULTS) state[k] = DEFAULTS[k];

    var urlInput = Tool.$('urlInput');
    var eccControl = Tool.$('eccControl');
    var qrFrame = Tool.$('qrFrame');
    var status = Tool.$('previewStatus');
    var downloadBtn = Tool.$('downloadBtn');
    var pngBtn = Tool.$('pngBtn');
    var copyBtn = Tool.$('copyBtn');
    var warningsBox = Tool.$('qrWarnings');
    var contrastWarn = Tool.$('contrastWarn');
    var logoWarn = Tool.$('logoWarn');

    function escXml(s) {
        return String(s).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmt(n) {
        return String(Math.round(n * 100) / 100);
    }

    function normalizeHex(raw) {
        if (!raw) return null;
        var s = String(raw).trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{3}$/.test(s)) {
            s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        }
        if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
        return '#' + s.toUpperCase();
    }

    function hexToRgb(hex) {
        var h = normalizeHex(hex);
        if (!h) return null;
        return {
            r: parseInt(h.slice(1, 3), 16),
            g: parseInt(h.slice(3, 5), 16),
            b: parseInt(h.slice(5, 7), 16)
        };
    }

    function luminance(rgb) {
        function ch(v) {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        }
        return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b);
    }

    function contrastRatio(a, b) {
        var ra = hexToRgb(a), rb = hexToRgb(b);
        if (!ra || !rb) return 0;
        var l1 = luminance(ra), l2 = luminance(rb);
        if (l1 < l2) { var t = l1; l1 = l2; l2 = t; }
        return (l1 + 0.05) / (l2 + 0.05);
    }

    function encode(text) {
        var qr = qrcode(0, state.ecc);
        qr.addData(text, 'Byte');
        qr.make();
        return qr;
    }

    function inFinder(r, c, n) {
        return (r < 7 && c < 7) ||
            (r < 7 && c >= n - 7) ||
            (r >= n - 7 && c < 7);
    }

    function moduleShape(pattern, x, y, cell, fill) {
        var c = ' fill="' + fill + '"';
        if (pattern === 'dots') {
            return '<circle cx="' + fmt(x + cell / 2) + '" cy="' + fmt(y + cell / 2) +
                '" r="' + fmt(cell * 0.42) + '"' + c + '/>';
        }
        if (pattern === 'diamond') {
            var cx = x + cell / 2, cy = y + cell / 2, r = cell * 0.46;
            return '<path d="M' + fmt(cx) + ',' + fmt(cy - r) +
                'L' + fmt(cx + r) + ',' + fmt(cy) +
                'L' + fmt(cx) + ',' + fmt(cy + r) +
                'L' + fmt(cx - r) + ',' + fmt(cy) + 'Z"' + c + '/>';
        }
        if (pattern === 'rounded') {
            return '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(cell) +
                '" height="' + fmt(cell) + '" rx="' + fmt(cell * 0.3) + '"' + c + '/>';
        }
        if (pattern === 'extra-rounded') {
            return '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(cell) +
                '" height="' + fmt(cell) + '" rx="' + fmt(cell * 0.48) + '"' + c + '/>';
        }
        if (pattern === 'bars') {
            var iy = y + cell * 0.13, ih = cell * 0.74;
            return '<rect x="' + fmt(x) + '" y="' + fmt(iy) + '" width="' + fmt(cell) +
                '" height="' + fmt(ih) + '" rx="' + fmt(cell * 0.3) + '"' + c + '/>';
        }
        return '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(cell) +
            '" height="' + fmt(cell) + '"' + c + '/>';
    }

    function finderSVG(ox, oy, cell, st, middleFill) {
        var out = '';
        var outer = st.finderFrameColor, center = st.finderCenterColor;
        var s7 = cell * 7, s5 = cell * 5, s3 = cell * 3;
        var shape = st.finderFrame === 'default' ? 'square' : st.finderFrame;
        if (shape === 'circle') {
            out += '<circle cx="' + fmt(ox + s7 / 2) + '" cy="' + fmt(oy + s7 / 2) +
                '" r="' + fmt(s7 / 2) + '" fill="' + outer + '"/>';
            if (middleFill) {
                out += '<circle cx="' + fmt(ox + s7 / 2) + '" cy="' + fmt(oy + s7 / 2) +
                    '" r="' + fmt(cell * 2.5) + '" fill="' + middleFill + '"/>';
            }
        } else if (shape === 'rounded') {
            out += '<rect x="' + fmt(ox) + '" y="' + fmt(oy) + '" width="' + fmt(s7) +
                '" height="' + fmt(s7) + '" rx="' + fmt(cell * 1.6) + '" fill="' + outer + '"/>';
            if (middleFill) {
                out += '<rect x="' + fmt(ox + cell) + '" y="' + fmt(oy + cell) + '" width="' +
                    fmt(s5) + '" height="' + fmt(s5) + '" rx="' + fmt(cell * 1) +
                    '" fill="' + middleFill + '"/>';
            }
        } else {
            out += '<rect x="' + fmt(ox) + '" y="' + fmt(oy) + '" width="' + fmt(s7) +
                '" height="' + fmt(s7) + '" fill="' + outer + '"/>';
            if (middleFill) {
                out += '<rect x="' + fmt(ox + cell) + '" y="' + fmt(oy + cell) + '" width="' +
                    fmt(s5) + '" height="' + fmt(s5) + '" fill="' + middleFill + '"/>';
            }
        }
        var cshape = st.finderCenter === 'default' ? 'square' : st.finderCenter;
        if (cshape === 'circle') {
            out += '<circle cx="' + fmt(ox + s7 / 2) + '" cy="' + fmt(oy + s7 / 2) +
                '" r="' + fmt(cell * 1.5) + '" fill="' + center + '"/>';
        } else {
            out += '<rect x="' + fmt(ox + cell * 2) + '" y="' + fmt(oy + cell * 2) +
                '" width="' + fmt(s3) + '" height="' + fmt(s3) + '" fill="' + center + '"/>';
        }
        return out;
    }

    // Single source of truth for preview and export. cell is the abstract
    // module size. Export picks cell so the code area is EXPORT_PX wide.
    function buildSVG(qr, st, cell, forExport) {
        var n = qr.getModuleCount();
        var quiet = QUIET_MODULES;
        var hasFrame = st.frame !== 'none';
        var padModules = hasFrame ? Math.max(1, st.framePad) : 0;
        if (st.frame === 'badge') padModules = Math.max(3, st.framePad);
        var qrUnits = n + quiet * 2;
        var qrPx = qrUnits * cell;
        var padPx = padModules * cell;
        var labelBand = st.frame === 'label' ? cell * 6 : 0;
        var bannerBand = st.frame === 'banner' ? cell * 6 : 0;
        var W = qrPx + padPx * 2;
        var H = W + labelBand + bannerBand;
        var qx = padPx;
        var qy = padPx + bannerBand;

        var s = '';
        s += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
        s += ' viewBox="0 0 ' + fmt(W) + ' ' + fmt(H) + '"';
        if (forExport) {
            s += ' width="' + Math.round(W) + '" height="' + Math.round(H) + '"';
        }
        s += ' role="img" aria-label="QR code">';
        s += '<title>QR code</title>';

        if (hasFrame) {
            var sw = (st.frame === 'badge' ? 0.9 : 0.35) * cell;
            var rx = (st.frameRadius / 40) * 5 * cell;
            rx = Math.min(rx, W / 2, H / 2);
            s += '<rect x="' + fmt(sw / 2) + '" y="' + fmt(sw / 2) + '" width="' +
                fmt(W - sw) + '" height="' + fmt(H - sw) + '" rx="' + fmt(rx) +
                '" fill="' + st.frameBg + '" stroke="' + st.frameBorder +
                '" stroke-width="' + fmt(sw) + '"/>';
            if (st.frame === 'banner') {
                var bandH = bannerBand;
                var bandRx = Math.max(0, rx - sw / 2);
                s += '<rect x="' + fmt(sw) + '" y="' + fmt(sw) + '" width="' +
                    fmt(W - sw * 2) + '" height="' + fmt(bandH) +
                    '" fill="' + st.frameBorder + '"/>';
                s += '<rect x="' + fmt(sw) + '" y="' + fmt(sw + bandH - 2 * cell * 0.15) +
                    '" width="' + fmt(W - sw * 2) + '" height="' + fmt(cell * 0.3) +
                    '" fill="' + st.frameBorder + '"/>';
                void bandRx;
            }
        }

        if (!st.transparent) {
            s += '<rect x="' + fmt(qx) + '" y="' + fmt(qy) + '" width="' + fmt(qrPx) +
                '" height="' + fmt(qrPx) + '" fill="' + st.bg + '"/>';
        }

        var r, c;
        for (r = 0; r < n; r++) {
            for (c = 0; c < n; c++) {
                if (!qr.isDark(r, c)) continue;
                if (inFinder(r, c, n)) continue;
                var x = qx + (quiet + c) * cell;
                var y = qy + (quiet + r) * cell;
                s += moduleShape(st.pattern, x, y, cell, st.fg);
            }
        }

        // The middle ring is always opaque ink, never a hole. In transparent
        // mode the outer shape is a solid block, so skipping the knockout
        // would fill the whole 7x7 eye and no scanner could find it. The
        // data background stays genuinely transparent, only the three small
        // separator rings keep an explicit light fill.
        var middleFill = (hasFrame && st.transparent) ? st.frameBg : st.bg;
        var origins = [[0, 0], [0, n - 7], [n - 7, 0]];
        for (var i = 0; i < origins.length; i++) {
            var orow = origins[i][0], ocol = origins[i][1];
            var ox = qx + (quiet + ocol) * cell;
            var oy = qy + (quiet + orow) * cell;
            s += finderSVG(ox, oy, cell, st, middleFill);
        }

        if (st.logoDataUrl) {
            var innerPx = n * cell;
            var logoW = innerPx * (st.logoSize / 100);
            var cx = qx + qrPx / 2;
            var cy = qy + qrPx / 2;
            if (st.logoBacking) {
                var side = logoW * 1.4;
                var bx = cx - side / 2, by = cy - side / 2;
                var brx = 0;
                if (st.logoShape === 'circle') brx = side / 2;
                else if (st.logoShape === 'rounded') brx = side * (st.logoRadius / 100) * 0.5;
                s += '<rect x="' + fmt(bx) + '" y="' + fmt(by) + '" width="' + fmt(side) +
                    '" height="' + fmt(side) + '" rx="' + fmt(brx) + '" fill="#FFFFFF"/>';
            }
            var lx = cx - logoW / 2, ly = cy - logoW / 2;
            s += '<image x="' + fmt(lx) + '" y="' + fmt(ly) + '" width="' + fmt(logoW) +
                '" height="' + fmt(logoW) + '" preserveAspectRatio="xMidYMid meet" href="' +
                st.logoDataUrl + '" xlink:href="' + st.logoDataUrl + '"/>';
        }

        var label = String(st.frameLabel || '').trim().slice(0, 48);
        if (st.frame === 'label' && label) {
            var fs = cell * 2.2;
            var ty = padPx + qrPx + labelBand * 0.64;
            s += '<text x="' + fmt(W / 2) + '" y="' + fmt(ty) + '" text-anchor="middle" ' +
                'font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" ' +
                'font-size="' + fmt(fs) + '" font-weight="700" letter-spacing="0.5" ' +
                'fill="' + st.frameLabelColor + '">' + escXml(label) + '</text>';
        }
        if (st.frame === 'banner' && label) {
            var bfs = cell * 2.2;
            var bty = padPx * 0.4 + bannerBand * 0.64;
            s += '<text x="' + fmt(W / 2) + '" y="' + fmt(bty) + '" text-anchor="middle" ' +
                'font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" ' +
                'font-size="' + fmt(bfs) + '" font-weight="700" letter-spacing="0.5" ' +
                'fill="' + st.frameBg + '">' + escXml(label) + '</text>';
        }

        s += '</svg>';
        return { svg: s, w: W, h: H };
    }

    function setStatus(text, isError) {
        status.textContent = text;
        status.style.color = isError ? '#E71D36' : 'var(--accent)';
    }

    function setEnabled(on) {
        downloadBtn.disabled = !on;
        copyBtn.disabled = !on;
        pngBtn.disabled = !on;
    }

    function collectWarnings(qr) {
        var list = [];
        var ratio = contrastRatio(state.fg, state.bg);
        if (!state.transparent && ratio < 3) {
            list.push('Low contrast (' + ratio.toFixed(2) + ':1). Dark modules on a pale ground scan best, so raise the gap before printing.');
        }
        if (state.transparent) {
            list.push('Transparent background: the finished code shows whatever sits behind it. Keep that surface pale and plain.');
        }
        var mid = !state.transparent ? state.bg : (state.frame !== 'none' ? state.frameBg : '#FFFFFF');
        var fr = contrastRatio(state.finderFrameColor, mid);
        if (fr < 2.5) {
            list.push('Finder outer ink is close to the ground (' + fr.toFixed(2) + ':1). Corner marks need separation to register.');
        }
        if (state.finderFrame === 'circle' || state.finderFrame === 'rounded') {
            list.push('Shaped finder marks trade compatibility for style. A strict scanner test failed them here, so keep Default when every scanner must read the code.');
        }
        if (state.logoDataUrl) {
            if (state.ecc !== 'H') {
                list.push('A logo covers data modules. Switch error correction to H for the best chance of scanning.');
            }
            if (state.logoSize > 25) {
                list.push('Logo size above 25 percent covers a lot of data. Drop to 22 percent or below for safer scans.');
            }
            if (qr && qr.getModuleCount() >= 45) {
                list.push('Dense code with a logo. Shorten the content when possible, the sparser the matrix the safer the logo.');
            }
        }
        if (state.pattern === 'diamond' || state.pattern === 'dots') {
            if (!state.transparent && ratio < 4) {
                list.push('Dotted and diamond modules leave gaps, so they want strong contrast. The current pair is marginal.');
            }
        }
        return list;
    }

    function render() {
        var text = urlInput.value.trim();
        warningsBox.innerHTML = '';

        if (!text) {
            qrFrame.classList.remove('is-transparent');
            qrFrame.innerHTML = '<p class="qr-error">Type something above to generate a code.</p>';
            setStatus('EMPTY', false);
            setEnabled(false);
            contrastWarn.hidden = true;
            return;
        }

        try {
            var qr = encode(text);
            var built = buildSVG(qr, state, 10, false);
            qrFrame.innerHTML = built.svg;
            qrFrame.classList.toggle('is-transparent', state.transparent && state.frame === 'none');

            var ratio = contrastRatio(state.fg, state.bg);
            if (!state.transparent && ratio < 3) {
                contrastWarn.textContent = 'Low contrast (' + ratio.toFixed(2) + ':1). Scanners may struggle. Darken the modules or lighten the ground.';
                contrastWarn.hidden = false;
            } else {
                contrastWarn.hidden = true;
            }

            var list = collectWarnings(qr);
            warningsBox.innerHTML = '';
            for (var i = 0; i < list.length; i++) {
                var p = document.createElement('p');
                p.className = 'qr-warn';
                p.textContent = list[i];
                warningsBox.appendChild(p);
            }

            setStatus('READY', false);
            setEnabled(true);
        } catch (err) {
            qrFrame.classList.remove('is-transparent');
            qrFrame.innerHTML = '<p class="qr-error">That is too much data for level ' +
                escXml(state.ecc) + '. Shorten the text, or drop to a lower correction level.</p>';
            setStatus('TOO LONG', true);
            setEnabled(false);
        }
    }

    function exportSVG() {
        var qr = encode(urlInput.value.trim());
        var n = qr.getModuleCount();
        var cell = EXPORT_PX / (n + QUIET_MODULES * 2);
        return buildSVG(qr, state, cell, true).svg;
    }

    function exportPNG() {
        var svgStr;
        try {
            svgStr = exportSVG();
        } catch (err) {
            Tool.toast('Nothing to export yet.');
            return;
        }
        var blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
            try {
                var scale = 2;
                var w = Math.max(1, Math.round(img.width * 0));
                void w;
                var tmp = document.createElement('div');
                tmp.innerHTML = svgStr;
                var node = tmp.querySelector('svg');
                var vb = (node.getAttribute('viewBox') || '').split(/\s+/);
                var vw = parseFloat(vb[2]) || EXPORT_PX;
                var vh = parseFloat(vb[3]) || EXPORT_PX;
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(vw * scale);
                canvas.height = Math.round(vh * scale);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                if (canvas.toBlob) {
                    canvas.toBlob(function (b) {
                        if (b) Tool.downloadBlob(b, 'beben-qr-2000px.png', 'PNG exported.');
                        else Tool.toast('PNG export failed in this browser.');
                    }, 'image/png');
                } else {
                    Tool.toast('PNG export failed in this browser.');
                }
            } catch (e) {
                URL.revokeObjectURL(url);
                Tool.toast('PNG export failed in this browser.');
            }
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            Tool.toast('PNG export failed in this browser.');
        };
        img.src = url;
    }

    function wireTileGrid(id, key) {
        var grid = Tool.$(id);
        if (!grid) return;
        var btns = grid.querySelectorAll('.tile');
        Array.prototype.forEach.call(btns, function (btn) {
            btn.addEventListener('click', function () {
                Array.prototype.forEach.call(btns, function (b) {
                    b.classList.remove('selected');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('selected');
                btn.setAttribute('aria-pressed', 'true');
                state[key] = btn.getAttribute('data-value');
                if (key === 'frame') syncFrameOptions();
                render();
            });
        });
    }

    function syncTileGrid(id, value) {
        var grid = Tool.$(id);
        if (!grid) return;
        var btns = grid.querySelectorAll('.tile');
        Array.prototype.forEach.call(btns, function (b) {
            var on = b.getAttribute('data-value') === value;
            b.classList.toggle('selected', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function wireColorPair(colorId, hexId, key) {
        var c = Tool.$(colorId), h = Tool.$(hexId);
        if (!c || !h) return;
        c.addEventListener('input', function () {
            state[key] = normalizeHex(c.value) || c.value.toUpperCase();
            h.value = state[key];
            render();
        });
        h.addEventListener('change', function () {
            var v = normalizeHex(h.value);
            if (!v) {
                h.value = state[key];
                Tool.toast('Enter a 6 digit hex color like #141414.');
                return;
            }
            state[key] = v;
            c.value = '#' + v.slice(1).toLowerCase();
            h.value = v;
            render();
        });
    }

    function setColorUI(colorId, hexId, value) {
        var c = Tool.$(colorId), h = Tool.$(hexId);
        if (c) c.value = '#' + value.slice(1).toLowerCase();
        if (h) h.value = value;
    }

    function setEcc(value) {
        state.ecc = value;
        var btns = eccControl.querySelectorAll('.seg-btn');
        Array.prototype.forEach.call(btns, function (b) {
            var on = b.getAttribute('data-value') === value;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function syncFrameOptions() {
        var show = state.frame !== 'none';
        Tool.$('frameOptions').hidden = !show;
    }

    function syncLogoUI() {
        var has = !!state.logoDataUrl;
        Tool.$('logoOptions').hidden = !has;
        Tool.$('logoRemoveBtn').disabled = !has;
        if (!has && logoWarn) logoWarn.hidden = true;
    }

    function readFileAsDataURL(file, cb) {
        var fr = new FileReader();
        fr.onload = function () { cb(null, String(fr.result || '')); };
        fr.onerror = function () { cb(new Error('read')); };
        fr.readAsDataURL(file);
    }

    function rasterizeSVG(dataUrl, cb) {
        var img = new Image();
        img.onload = function () {
            try {
                var side = 1024;
                var canvas = document.createElement('canvas');
                canvas.width = side;
                canvas.height = side;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, side, side);
                cb(null, canvas.toDataURL('image/png'));
            } catch (e) {
                cb(e);
            }
        };
        img.onerror = function () { cb(new Error('svg')); };
        img.src = dataUrl;
    }

    function handleLogoFile(file) {
        if (!file) return;
        var type = String(file.type || '').toLowerCase();
        var name = String(file.name || '').toLowerCase();
        var isImg = type === 'image/png' || type === 'image/jpeg' ||
            type === 'image/svg+xml' ||
            /\.png$/.test(name) || /\.jpe?g$/.test(name) || /\.svg$/.test(name);
        if (!isImg) {
            Tool.toast('Upload a PNG, JPEG, or SVG file.');
            return;
        }
        if (file.size > LOGO_MAX_BYTES) {
            Tool.toast('Logo is over 5 MB. Compress it first.');
            return;
        }
        readFileAsDataURL(file, function (err, dataUrl) {
            if (err || !dataUrl) {
                Tool.toast('Logo could not be read. Try another file.');
                return;
            }
            var done = function (dErr, finalUrl) {
                if (dErr || !finalUrl) {
                    Tool.toast('Logo could not be processed. Try a PNG or JPEG.');
                    return;
                }
                state.logoDataUrl = finalUrl;
                if (state.ecc !== 'H') {
                    setEcc('H');
                    Tool.toast('Logo added. Error correction is now H.');
                } else {
                    Tool.toast('Logo added.');
                }
                syncLogoUI();
                render();
            };
            if (type === 'image/svg+xml' || /\.svg$/.test(name)) {
                rasterizeSVG(dataUrl, done);
            } else {
                done(null, dataUrl);
            }
        });
    }

    // Wiring
    Tool.segmented(eccControl, function (value) {
        state.ecc = value;
        render();
    });

    urlInput.addEventListener('input', render);

    wireTileGrid('patternGrid', 'pattern');
    wireTileGrid('finderFrameGrid', 'finderFrame');
    wireTileGrid('finderCenterGrid', 'finderCenter');
    wireTileGrid('frameGrid', 'frame');

    wireColorPair('fgColor', 'fgHex', 'fg');
    wireColorPair('bgColor', 'bgHex', 'bg');
    wireColorPair('finderFrameColor', 'finderFrameHex', 'finderFrameColor');
    wireColorPair('finderCenterColor', 'finderCenterHex', 'finderCenterColor');
    wireColorPair('frameBorderColor', 'frameBorderHex', 'frameBorder');
    wireColorPair('frameBgColor', 'frameBgHex', 'frameBg');
    wireColorPair('frameLabelColor', 'frameLabelHex', 'frameLabelColor');

    Tool.$('swapColorsBtn').addEventListener('click', function () {
        var fg = state.fg, bg = state.bg;
        state.fg = bg;
        state.bg = fg;
        setColorUI('fgColor', 'fgHex', state.fg);
        setColorUI('bgColor', 'bgHex', state.bg);
        render();
    });

    Tool.$('transparentBg').addEventListener('change', function (e) {
        state.transparent = !!e.target.checked;
        render();
    });

    Tool.$('frameLabel').addEventListener('input', function (e) {
        state.frameLabel = e.target.value;
        render();
    });

    function wireRange(rangeId, valueId, fmtFn, apply) {
        var rg = Tool.$(rangeId), val = Tool.$(valueId);
        if (!rg) return;
        rg.addEventListener('input', function () {
            apply(parseFloat(rg.value));
            if (val) val.textContent = fmtFn(rg.value);
            render();
        });
    }

    wireRange('frameRadiusRange', 'frameRadiusValue', function (v) { return v; }, function (v) {
        state.frameRadius = v;
    });
    wireRange('framePadRange', 'framePadValue', function (v) { return v; }, function (v) {
        state.framePad = v;
    });
    wireRange('logoSizeRange', 'logoSizeValue', function (v) { return v + '%'; }, function (v) {
        state.logoSize = v;
    });
    wireRange('logoRadiusRange', 'logoRadiusValue', function (v) { return v; }, function (v) {
        state.logoRadius = v;
    });

    Tool.$('logoBacking').addEventListener('change', function (e) {
        state.logoBacking = !!e.target.checked;
        render();
    });

    Tool.segmented(Tool.$('logoShapeControl'), function (value) {
        state.logoShape = value;
        render();
    });

    var logoInput = Tool.$('logoInput');
    Tool.$('logoUploadBtn').addEventListener('click', function () {
        logoInput.click();
    });
    logoInput.addEventListener('change', function () {
        if (logoInput.files && logoInput.files[0]) handleLogoFile(logoInput.files[0]);
        logoInput.value = '';
    });
    Tool.$('logoRemoveBtn').addEventListener('click', function () {
        state.logoDataUrl = null;
        syncLogoUI();
        render();
    });

    Tool.$('resetDesignBtn').addEventListener('click', function () {
        if (state.logoDataUrl) {
            if (!window.confirm('Reset the design and remove the uploaded logo.')) return;
        }
        var text = urlInput.value;
        var ecc = state.ecc;
        for (var key in DEFAULTS) state[key] = DEFAULTS[key];
        state.ecc = ecc;
        urlInput.value = text;

        syncTileGrid('patternGrid', state.pattern);
        syncTileGrid('finderFrameGrid', state.finderFrame);
        syncTileGrid('finderCenterGrid', state.finderCenter);
        syncTileGrid('frameGrid', state.frame);
        setColorUI('fgColor', 'fgHex', state.fg);
        setColorUI('bgColor', 'bgHex', state.bg);
        setColorUI('finderFrameColor', 'finderFrameHex', state.finderFrameColor);
        setColorUI('finderCenterColor', 'finderCenterHex', state.finderCenterColor);
        setColorUI('frameBorderColor', 'frameBorderHex', state.frameBorder);
        setColorUI('frameBgColor', 'frameBgHex', state.frameBg);
        setColorUI('frameLabelColor', 'frameLabelHex', state.frameLabelColor);
        Tool.$('transparentBg').checked = false;
        Tool.$('frameLabel').value = state.frameLabel;
        Tool.$('frameRadiusRange').value = String(state.frameRadius);
        Tool.$('frameRadiusValue').textContent = String(state.frameRadius);
        Tool.$('framePadRange').value = String(state.framePad);
        Tool.$('framePadValue').textContent = String(state.framePad);
        Tool.$('logoSizeRange').value = String(state.logoSize);
        Tool.$('logoSizeValue').textContent = state.logoSize + '%';
        Tool.$('logoBacking').checked = true;
        Tool.$('logoRadiusRange').value = String(state.logoRadius);
        Tool.$('logoRadiusValue').textContent = String(state.logoRadius);
        var shapeBtns = Tool.$('logoShapeControl').querySelectorAll('.seg-btn');
        Array.prototype.forEach.call(shapeBtns, function (b) {
            var on = b.getAttribute('data-value') === 'rounded';
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        syncFrameOptions();
        syncLogoUI();
        render();
        Tool.toast('Design reset to defaults.');
    });

    downloadBtn.addEventListener('click', function () {
        try {
            Tool.download(exportSVG(), 'beben-qr-1000x1000.svg',
                'image/svg+xml;charset=utf-8', 'SVG exported at 1000 x 1000px.');
        } catch (err) {
            Tool.toast('Nothing to export yet.');
        }
    });

    copyBtn.addEventListener('click', function () {
        try {
            Tool.copy(exportSVG(), 'SVG code copied to clipboard.');
        } catch (err) {
            Tool.toast('Nothing to copy yet.');
        }
    });

    pngBtn.addEventListener('click', exportPNG);

    syncFrameOptions();
    syncLogoUI();
    render();
})();
