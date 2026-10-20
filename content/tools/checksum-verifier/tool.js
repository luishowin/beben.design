(function () {
    'use strict';

    var LENGTHS = {
        40: 'SHA-1',
        64: 'SHA-256',
        96: 'SHA-384',
        128: 'SHA-512'
    };

    var dropzone = Tool.$('sumDrop');
    var fileInput = Tool.$('sumFile');
    var fileInfo = Tool.$('sumFileInfo');
    var algoControl = Tool.$('sumAlgo');
    var hashEl = Tool.$('sumHash');
    var hashStatus = Tool.$('hashStatus');
    var expected = Tool.$('expectedHash');
    var statusEl = Tool.$('sumStatus');
    var copyBtn = Tool.$('copyHash');
    var clearBtn = Tool.$('sumClear');

    var file = null;
    var algorithm = 'SHA-256';
    var hash = '';
    var token = 0;
    var detectTimer = null;

    // ── HELPERS ───────────────────────────────────────────────────
    function formatBytes(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
        return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    function formatDate(ms) {
        try {
            return new Date(ms).toLocaleString();
        } catch (e) {
            return String(ms);
        }
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function toHex(buffer) {
        var bytes = new Uint8Array(buffer);
        var out = '';
        for (var i = 0; i < bytes.length; i++) {
            out += ('0' + bytes[i].toString(16)).slice(-2);
        }
        return out;
    }

    // A published checksum can arrive as a bare hash, "sha256: ...", or a
    // whole sha256sum line with a filename. The longest hex run is the hash.
    function extractHash(text) {
        var matches = String(text || '').match(/[a-fA-F0-9]{32,128}/g);
        if (!matches) return null;

        var best = '';
        for (var i = 0; i < matches.length; i++) {
            if (matches[i].length > best.length) best = matches[i];
        }
        return best.toLowerCase();
    }

    function algorithmForLength(length) {
        return LENGTHS[length] || null;
    }

    function setAlgorithm(name) {
        algorithm = name;
        var buttons = algoControl.querySelectorAll('.seg-btn');
        Array.prototype.forEach.call(buttons, function (btn) {
            var active = btn.getAttribute('data-value') === name;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function setStatus(message, state) {
        statusEl.textContent = message;
        statusEl.className = 'sum-status' + (state ? ' is-' + state : '');
    }

    function setHash(value) {
        hash = value || '';
        hashEl.textContent = hash || 'Drop a file to compute its hash.';
        hashEl.classList.toggle('has-hash', !!hash);
        copyBtn.disabled = !hash;
        hashStatus.textContent = hash ? algorithm : (file ? 'HASHING' : 'NO FILE');
    }

    // ── HASHING ───────────────────────────────────────────────────
    function hashFile() {
        if (!file) return;

        if (!window.crypto || !window.crypto.subtle) {
            setHash('');
            hashStatus.textContent = 'UNAVAILABLE';
            setStatus('This browser does not expose the Web Crypto API here. Open the page over https or localhost.', 'mismatch');
            return;
        }

        var myToken = ++token;
        setHash('');
        hashStatus.textContent = 'HASHING';
        copyBtn.disabled = true;
        setStatus('Hashing ' + file.name + ' with ' + algorithm + '.', 'busy');

        file.arrayBuffer().then(function (buffer) {
            return window.crypto.subtle.digest(algorithm, buffer);
        }).then(function (digest) {
            if (myToken !== token) return;
            setHash(toHex(digest));
            compare();
        }).catch(function () {
            if (myToken !== token) return;
            setHash('');
            hashStatus.textContent = 'FAILED';
            setStatus('That file could not be read. Very large files need enough free memory.', 'mismatch');
        });
    }

    // ── COMPARISON ────────────────────────────────────────────────
    function compare() {
        if (!file) {
            setStatus('Drop a file to begin.', 'idle');
            return;
        }
        if (!hash) {
            setStatus('Waiting for the hash to finish.', 'busy');
            return;
        }

        var raw = expected.value.trim();
        if (!raw) {
            setStatus('Hash computed. Paste the published value to compare.', 'idle');
            return;
        }

        var wanted = extractHash(raw);
        if (!wanted) {
            setStatus('No checksum found in that text.', 'mismatch');
            return;
        }

        if (wanted.length === 32) {
            setStatus('That is a 32-character MD5 value. This tool supports SHA-1, SHA-256, SHA-384, and SHA-512.', 'mismatch');
            return;
        }

        var wantedAlgorithm = algorithmForLength(wanted.length);
        if (!wantedAlgorithm) {
            setStatus('That checksum is ' + wanted.length + ' characters. Supported lengths are 40, 64, 96, and 128.', 'mismatch');
            return;
        }

        if (wantedAlgorithm !== algorithm) {
            setStatus('That value is ' + wantedAlgorithm + '. Switch the algorithm above to compare it.', 'mismatch');
            return;
        }

        if (wanted === hash) {
            setStatus('Match. The file matches the published checksum.', 'match');
            return;
        }

        var at = -1;
        for (var i = 0; i < hash.length; i++) {
            if (wanted[i] !== hash[i]) { at = i; break; }
        }
        setStatus('Mismatch. The file does not match the published checksum.' +
            (at >= 0 ? ' First difference at character ' + (at + 1) + '.' : ''), 'mismatch');
    }

    function detectAlgorithm() {
        var wanted = extractHash(expected.value);
        if (!wanted || wanted.length === 32) {
            compare();
            return;
        }

        var next = algorithmForLength(wanted.length);
        if (!next) {
            compare();
            return;
        }

        if (next !== algorithm) {
            setAlgorithm(next);
            if (file) {
                hashFile();
                return;
            }
        }
        compare();
    }

    // ── LOADING ───────────────────────────────────────────────────
    function loadFile(next) {
        if (!next) return;

        file = next;
        hash = '';
        expected.value = '';
        dropzone.classList.add('has-file');
        dropzone.innerHTML = '<p><strong>' + escapeHtml(next.name) + '</strong>' +
            '<span class="file-meta">' + formatBytes(next.size) +
            '. Click to swap.</span></p>';

        fileInfo.innerHTML = '';
        [
            ['Type', next.type || 'Unknown'],
            ['Size', formatBytes(next.size)],
            ['Modified', formatDate(next.lastModified)]
        ].forEach(function (row) {
            var el = document.createElement('div');
            el.className = 'sum-file-row';
            var key = document.createElement('span');
            key.className = 'sum-file-key';
            key.textContent = row[0];
            var value = document.createElement('span');
            value.className = 'sum-file-val';
            value.textContent = row[1];
            el.appendChild(key);
            el.appendChild(value);
            fileInfo.appendChild(el);
        });

        setAlgorithm('SHA-256');
        hashFile();
    }

    function reset() {
        token++;
        file = null;
        hash = '';
        expected.value = '';
        fileInput.value = '';
        dropzone.classList.remove('has-file');
        dropzone.innerHTML = '<p><strong>Drop a file here</strong><br>' +
            'or click to browse. Any file type.</p>';
        fileInfo.innerHTML = '<p class="hint">No file loaded yet.</p>';
        setAlgorithm('SHA-256');
        setHash('');
        hashStatus.textContent = 'NO FILE';
        setStatus('Drop a file to begin.', 'idle');
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

    Tool.segmented(algoControl, function (value) {
        setAlgorithm(value);
        if (file) hashFile();
    });

    expected.addEventListener('input', function () {
        clearTimeout(detectTimer);
        detectTimer = setTimeout(detectAlgorithm, 250);
    });

    copyBtn.addEventListener('click', function () {
        if (hash) Tool.copy(hash, 'Hash copied.');
    });

    clearBtn.addEventListener('click', reset);

    setHash('');
    setStatus('Drop a file to begin.', 'idle');
})();
