(function () {
    'use strict';

    var MAX_EDGE = 2000;

    var HINTS = {
        atkinson: 'Atkinson is the classic Macintosh look: high contrast, lots of white, detail sacrificed for punch.',
        floyd: 'Floyd-Steinberg pushes the full error into its neighbours, so it holds the most detail of the four.',
        bayer: 'Bayer is an ordered matrix, not error diffusion. It gives that regular crosshatch you see in old print.',
        threshold: 'No dithering at all: every pixel is simply light or dark. Useful for logos and flat art.'
    };

    var dropzone = Tool.$('dropzone');
    var fileInput = Tool.$('fileInput');
    var canvas = Tool.$('outputCanvas');
    var canvasEmpty = Tool.$('canvasEmpty');
    var status = Tool.$('ditherStatus');
    var exportBtn = Tool.$('exportBtn');
    var clearBtn = Tool.$('clearBtn');

    var source = null;      // the loaded, size-capped source canvas
    var sourceName = 'image';
    var algo = 'atkinson';
    var scale = 3;
    var contrast = 0;
    var brightness = 0;
    var invert = false;

    // ── DITHER KERNELS ────────────────────────────────────────────
    // [dx, dy, weight] with a shared divisor.
    var KERNELS = {
        floyd: { div: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
        atkinson: { div: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] }
    };

    var BAYER = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    // ── PIPELINE ──────────────────────────────────────────────────
    function toGrey(data, w, h) {
        // Luma, then brightness and contrast, held as floats so the
        // diffused error below does not get quantised twice.
        var grey = new Float32Array(w * h);
        var c = contrast / 100;
        var factor = (1.015 * (c + 1)) / (1.015 - c);
        var b = brightness * 2.55;

        for (var i = 0, p = 0; i < grey.length; i++, p += 4) {
            var v = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];

            // Composite transparency onto white so PNG cutouts do not
            // come out as solid black blocks.
            var a = data[p + 3] / 255;
            v = v * a + 255 * (1 - a);

            v = factor * (v - 128) + 128 + b;
            grey[i] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        return grey;
    }

    function dither(grey, w, h) {
        var out = new Uint8Array(w * h);

        if (algo === 'threshold' || algo === 'bayer') {
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var i = y * w + x;
                    var limit = algo === 'bayer'
                        ? (BAYER[y & 3][x & 3] + 0.5) * (255 / 16)
                        : 128;
                    out[i] = grey[i] >= limit ? 255 : 0;
                }
            }
            return out;
        }

        var kernel = KERNELS[algo];
        for (var yy = 0; yy < h; yy++) {
            for (var xx = 0; xx < w; xx++) {
                var idx = yy * w + xx;
                var old = grey[idx];
                var next = old < 128 ? 0 : 255;
                out[idx] = next;

                var err = (old - next) / kernel.div;
                for (var k = 0; k < kernel.taps.length; k++) {
                    var tap = kernel.taps[k];
                    var nx = xx + tap[0], ny = yy + tap[1];
                    if (nx < 0 || nx >= w || ny >= h) continue;
                    grey[ny * w + nx] += err * tap[2];
                }
            }
        }
        return out;
    }

    function render() {
        if (!source) return;

        var sw = source.width, sh = source.height;
        var w = Math.max(1, Math.floor(sw / scale));
        var h = Math.max(1, Math.floor(sh / scale));

        // Downsample to the working grid first, so "pixel size" really is
        // the size of one dithered dot.
        var work = document.createElement('canvas');
        work.width = w;
        work.height = h;
        var wctx = work.getContext('2d');
        wctx.drawImage(source, 0, 0, w, h);

        var image = wctx.getImageData(0, 0, w, h);
        var bits = dither(toGrey(image.data, w, h), w, h);

        var data = image.data;
        for (var i = 0, p = 0; i < bits.length; i++, p += 4) {
            var v = invert ? 255 - bits[i] : bits[i];
            data[p] = data[p + 1] = data[p + 2] = v;
            data[p + 3] = 255;
        }
        wctx.putImageData(image, 0, 0);

        // Blow the grid back up to the source size with no smoothing.
        canvas.width = w * scale;
        canvas.height = h * scale;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.drawImage(work, 0, 0, canvas.width, canvas.height);

        canvas.hidden = false;
        canvasEmpty.hidden = true;
        status.textContent = canvas.width + ' x ' + canvas.height;
        exportBtn.disabled = false;
        clearBtn.disabled = false;
    }

    // ── LOADING ───────────────────────────────────────────────────
    function loadFile(file) {
        if (!file || !/^image\//.test(file.type)) {
            Tool.toast('That is not an image file.');
            return;
        }

        sourceName = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
        status.textContent = 'READING';

        var url = URL.createObjectURL(file);
        var img = new Image();

        img.onload = function () {
            var w = img.naturalWidth, h = img.naturalHeight;
            var ratio = Math.min(1, MAX_EDGE / Math.max(w, h));

            source = document.createElement('canvas');
            source.width = Math.max(1, Math.round(w * ratio));
            source.height = Math.max(1, Math.round(h * ratio));
            source.getContext('2d').drawImage(img, 0, 0, source.width, source.height);
            URL.revokeObjectURL(url);

            dropzone.classList.add('has-file');
            dropzone.innerHTML = '<p><strong>' + escapeHtml(file.name) + '</strong>'
                + '<span class="file-meta">' + w + ' x ' + h + ' px'
                + (ratio < 1 ? ', scaled to ' + source.width + ' x ' + source.height : '')
                + '. Click to swap.</span></p>';

            render();
        };

        img.onerror = function () {
            URL.revokeObjectURL(url);
            status.textContent = 'FAILED';
            Tool.toast('That image could not be decoded.');
        };

        img.src = url;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function reset() {
        source = null;
        canvas.hidden = true;
        canvasEmpty.hidden = false;
        status.textContent = 'NO IMAGE';
        exportBtn.disabled = true;
        clearBtn.disabled = true;
        dropzone.classList.remove('has-file');
        dropzone.innerHTML = '<p><strong>Drop an image here</strong><br>'
            + 'or click to browse. You can paste one too.</p>';
        fileInput.value = '';
    }

    // ── WIRING ────────────────────────────────────────────────────
    dropzone.addEventListener('click', function () { fileInput.click(); });

    dropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    ['dragenter', 'dragover'].forEach(function (type) {
        dropzone.addEventListener(type, function (e) {
            e.preventDefault();
            dropzone.classList.add('is-over');
        });
    });

    ['dragleave', 'drop'].forEach(function (type) {
        dropzone.addEventListener(type, function (e) {
            e.preventDefault();
            dropzone.classList.remove('is-over');
        });
    });

    dropzone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', function () {
        if (fileInput.files.length) loadFile(fileInput.files[0]);
    });

    window.addEventListener('paste', function (e) {
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image/') === 0) {
                loadFile(items[i].getAsFile());
                return;
            }
        }
    });

    Tool.segmented(Tool.$('algoControl'), function (value) {
        algo = value;
        Tool.$('algoHint').textContent = HINTS[value];
        render();
    });

    Tool.segmented(Tool.$('invertControl'), function (value) {
        invert = value === 'on';
        render();
    });

    function bindRange(id, valueId, suffix, apply) {
        var el = Tool.$(id);
        el.addEventListener('input', function () {
            var v = +el.value;
            Tool.$(valueId).textContent = v + suffix;
            apply(v);
            render();
        });
    }

    bindRange('scaleRange', 'scaleValue', 'x', function (v) { scale = v; });
    bindRange('contrastRange', 'contrastValue', '', function (v) { contrast = v; });
    bindRange('brightRange', 'brightValue', '', function (v) { brightness = v; });

    exportBtn.addEventListener('click', function () {
        if (!source) return;
        canvas.toBlob(function (blob) {
            if (!blob) return Tool.toast('Export failed, try a smaller image.');
            Tool.downloadBlob(blob, sourceName + '-dithered.png',
                'PNG exported at ' + canvas.width + ' x ' + canvas.height + '.');
        }, 'image/png');
    });

    clearBtn.addEventListener('click', reset);
})();
