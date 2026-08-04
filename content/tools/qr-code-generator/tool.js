(function () {
    'use strict';

    // The library defaults to a byte encoder that truncates every char to
    // its low 8 bits, which mangles anything outside Latin-1. UTF-8 is the
    // only sane choice for URLs with accents, emoji, or non-Latin text.
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

    var EXPORT_PX = 1000;
    var QUIET_MODULES = 4;

    var level = 'L';

    var urlInput = Tool.$('urlInput');
    var qrFrame = Tool.$('qrFrame');
    var status = Tool.$('previewStatus');
    var downloadBtn = Tool.$('downloadBtn');
    var copyBtn = Tool.$('copyBtn');

    function encode(text) {
        var qr = qrcode(0, level);
        qr.addData(text, 'Byte');
        qr.make();
        return qr;
    }

    function setStatus(text, isError) {
        status.textContent = text;
        status.style.color = isError ? '#E71D36' : 'var(--accent)';
    }

    function setEnabled(on) {
        downloadBtn.disabled = !on;
        copyBtn.disabled = !on;
    }

    function render() {
        var text = urlInput.value.trim();

        if (!text) {
            qrFrame.innerHTML = '<p class="qr-error">Type something above to generate a code.</p>';
            setStatus('EMPTY', false);
            setEnabled(false);
            return;
        }

        try {
            var qr = encode(text);
            qrFrame.innerHTML = qr.createSvgTag(6, 2);

            // Make the preview scale with the frame rather than its cell
            // size. The library writes width="154px", and a viewBox with
            // units in it is invalid, so take the number only.
            var svg = qrFrame.querySelector('svg');
            if (svg) {
                var w = parseFloat(svg.getAttribute('width'));
                if (w) svg.setAttribute('viewBox', '0 0 ' + w + ' ' + w);
                svg.removeAttribute('width');
                svg.removeAttribute('height');
            }

            setStatus('READY', false);
            setEnabled(true);
        } catch (err) {
            qrFrame.innerHTML = '<p class="qr-error">That is too much data for level ' +
                level + '. Shorten the text, or drop to a lower correction level.</p>';
            setStatus('TOO LONG', true);
            setEnabled(false);
        }
    }

    // Export at a fixed 1000px square regardless of how many modules the
    // content needs, so every download drops into a layout the same way.
    function exportSVG() {
        var qr = encode(urlInput.value.trim());
        var total = qr.getModuleCount() + QUIET_MODULES * 2;
        return qr.createSvgTag(EXPORT_PX / total, QUIET_MODULES);
    }

    Tool.segmented(Tool.$('eccControl'), function (value) {
        level = value;
        render();
    });

    urlInput.addEventListener('input', render);

    downloadBtn.addEventListener('click', function () {
        Tool.download(exportSVG(), 'beben-qr-1000x1000.svg',
            'image/svg+xml;charset=utf-8', 'SVG exported at 1000 x 1000px.');
    });

    copyBtn.addEventListener('click', function () {
        Tool.copy(exportSVG(), 'SVG code copied to clipboard.');
    });

    render();
})();
