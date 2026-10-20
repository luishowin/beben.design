(function () {
    'use strict';

    var MAX_FILE = 2 * 1024 * 1024;
    var MAX_CELLS = 4000000;
    var MAX_ROWS = 6000;
    var MAX_WORD_CELLS = 60000;
    var WORD_BUDGET = 120000;

    var inputA = Tool.$('diffA');
    var inputB = Tool.$('diffB');
    var countA = Tool.$('countA');
    var countB = Tool.$('countB');
    var fileA = Tool.$('fileA');
    var fileB = Tool.$('fileB');
    var ignoreWhitespace = Tool.$('ignoreWhitespace');
    var ignoreCase = Tool.$('ignoreCase');
    var status = Tool.$('diffStatus');
    var statAdded = Tool.$('statAdded');
    var statRemoved = Tool.$('statRemoved');
    var statUnchanged = Tool.$('statUnchanged');
    var statRows = Tool.$('statRows');
    var diffEmpty = Tool.$('diffEmpty');
    var diffScroll = Tool.$('diffScroll');
    var diffBody = Tool.$('diffBody');
    var diffFrame = Tool.$('diffFrame');

    var currentA = [];
    var currentB = [];
    var lastOps = [];
    var renderTimer = null;
    var limitNote = null;

    // ── LINES ─────────────────────────────────────────────────────
    function splitLines(text) {
        var normalized = String(text).replace(/\r\n?/g, '\n');
        if (!normalized) return [];
        var lines = normalized.split('\n');
        if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
        return lines;
    }

    function keyFor(line) {
        var value = line;
        if (ignoreWhitespace.checked) value = value.replace(/\s+/g, ' ').trim();
        if (ignoreCase.checked) value = value.toLowerCase();
        return value;
    }

    function updateCounts() {
        var a = splitLines(inputA.value);
        var b = splitLines(inputB.value);
        countA.textContent = a.length + (a.length === 1 ? ' line' : ' lines') +
            ', ' + Array.from(inputA.value).length + ' chars';
        countB.textContent = b.length + (b.length === 1 ? ' line' : ' lines') +
            ', ' + Array.from(inputB.value).length + ' chars';
    }

    // ── LINE DIFF ─────────────────────────────────────────────────
    function computeOps(aLines, bLines) {
        var a = aLines.map(keyFor);
        var b = bLines.map(keyFor);
        var start = 0;

        while (start < a.length && start < b.length && a[start] === b[start]) start++;

        var endA = a.length;
        var endB = b.length;
        while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
            endA--;
            endB--;
        }

        var n = endA - start;
        var m = endB - start;

        if (n * m > MAX_CELLS) {
            var tooLarge = new Error('too large');
            tooLarge.code = 'TOO_LARGE';
            throw tooLarge;
        }

        var width = m + 1;
        var dp = new Uint32Array((n + 1) * width);

        for (var i = n - 1; i >= 0; i--) {
            var row = i * width;
            var next = row + width;
            for (var j = m - 1; j >= 0; j--) {
                if (a[start + i] === b[start + j]) {
                    dp[row + j] = dp[next + j + 1] + 1;
                } else {
                    dp[row + j] = Math.max(dp[next + j], dp[row + j + 1]);
                }
            }
        }

        var ops = [];
        for (i = 0; i < start; i++) ops.push({ type: 'equal', ai: i, bi: i });

        i = 0;
        j = 0;
        while (i < n && j < m) {
            if (a[start + i] === b[start + j]) {
                ops.push({ type: 'equal', ai: start + i, bi: start + j });
                i++;
                j++;
            } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
                ops.push({ type: 'del', ai: start + i });
                i++;
            } else {
                ops.push({ type: 'ins', bi: start + j });
                j++;
            }
        }

        while (i < n) {
            ops.push({ type: 'del', ai: start + i });
            i++;
        }
        while (j < m) {
            ops.push({ type: 'ins', bi: start + j });
            j++;
        }

        var suffix = a.length - endA;
        for (var t = 0; t < suffix; t++) {
            ops.push({ type: 'equal', ai: endA + t, bi: endB + t });
        }

        return ops;
    }

    function statsFromOps(ops) {
        var stats = { added: 0, removed: 0, unchanged: 0 };
        ops.forEach(function (op) {
            if (op.type === 'equal') stats.unchanged++;
            else if (op.type === 'del') stats.removed++;
            else stats.added++;
        });
        return stats;
    }

    function rowsFromOps(ops) {
        var rows = [];
        var i = 0;

        while (i < ops.length) {
            if (ops[i].type === 'equal') {
                rows.push({ left: ops[i].ai, right: ops[i].bi, type: 'equal' });
                i++;
                continue;
            }

            var dels = [];
            var inss = [];
            while (i < ops.length && ops[i].type !== 'equal') {
                if (ops[i].type === 'del') dels.push(ops[i].ai);
                else inss.push(ops[i].bi);
                i++;
            }

            var count = Math.max(dels.length, inss.length);
            for (var j = 0; j < count; j++) {
                var hasLeft = j < dels.length;
                var hasRight = j < inss.length;
                rows.push({
                    left: hasLeft ? dels[j] : null,
                    right: hasRight ? inss[j] : null,
                    type: hasLeft && hasRight ? 'change' : (hasLeft ? 'del' : 'add')
                });
            }
        }

        return rows;
    }

    // ── WORD DIFF ─────────────────────────────────────────────────
    function tokenize(line) {
        // Words, whitespace, and punctuation are separate tokens, so a
        // changed comma highlights the comma rather than the whole word.
        return line.match(/\s+|[0-9A-Za-z_\u00C0-\u024F]+|[^\s0-9A-Za-z_\u00C0-\u024F]+/g) || [];
    }

    function wordDiff(left, right) {
        var a = tokenize(left);
        var b = tokenize(right);
        var start = 0;

        while (start < a.length && start < b.length && a[start] === b[start]) start++;

        var endA = a.length;
        var endB = b.length;
        while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
            endA--;
            endB--;
        }

        var n = endA - start;
        var m = endB - start;
        if (n * m > MAX_WORD_CELLS) return null;

        var width = m + 1;
        var dp = new Uint32Array((n + 1) * width);

        for (var i = n - 1; i >= 0; i--) {
            var row = i * width;
            var next = row + width;
            for (var j = m - 1; j >= 0; j--) {
                if (a[start + i] === b[start + j]) {
                    dp[row + j] = dp[next + j + 1] + 1;
                } else {
                    dp[row + j] = Math.max(dp[next + j], dp[row + j + 1]);
                }
            }
        }

        var leftParts = [];
        var rightParts = [];

        for (i = 0; i < start; i++) {
            leftParts.push({ text: a[i], type: '' });
            rightParts.push({ text: b[i], type: '' });
        }

        i = 0;
        j = 0;
        while (i < n && j < m) {
            if (a[start + i] === b[start + j]) {
                leftParts.push({ text: a[start + i], type: '' });
                rightParts.push({ text: b[start + j], type: '' });
                i++;
                j++;
            } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
                leftParts.push({ text: a[start + i], type: 'del' });
                i++;
            } else {
                rightParts.push({ text: b[start + j], type: 'ins' });
                j++;
            }
        }

        while (i < n) {
            leftParts.push({ text: a[start + i], type: 'del' });
            i++;
        }
        while (j < m) {
            rightParts.push({ text: b[start + j], type: 'ins' });
            j++;
        }

        var suffix = a.length - endA;
        for (var t = 0; t < suffix; t++) {
            leftParts.push({ text: a[endA + t], type: '' });
            rightParts.push({ text: b[endB + t], type: '' });
        }

        return { left: leftParts, right: rightParts };
    }

    function appendParts(cell, parts) {
        cell.textContent = '';
        parts.forEach(function (part) {
            if (!part.type) {
                cell.appendChild(document.createTextNode(part.text));
                return;
            }
            var span = document.createElement('span');
            span.className = part.type === 'del' ? 'word-del' : 'word-ins';
            span.textContent = part.text;
            cell.appendChild(span);
        });
    }

    // ── RENDER ────────────────────────────────────────────────────
    function showEmpty(message) {
        diffEmpty.textContent = message;
        diffEmpty.hidden = false;
        diffScroll.hidden = true;
        diffBody.innerHTML = '';
        removeLimitNote();
    }

    function removeLimitNote() {
        if (limitNote && limitNote.parentNode) limitNote.parentNode.removeChild(limitNote);
        limitNote = null;
    }

    function render() {
        updateCounts();
        removeLimitNote();

        var aLines = splitLines(inputA.value);
        var bLines = splitLines(inputB.value);
        currentA = aLines;
        currentB = bLines;

        statAdded.textContent = '0';
        statRemoved.textContent = '0';
        statUnchanged.textContent = '0';
        statRows.textContent = '0';

        if (!aLines.length && !bLines.length) {
            lastOps = [];
            status.textContent = 'READY';
            showEmpty('Paste text into either side. Added, removed, and changed lines appear here side by side.');
            return;
        }

        var ops;
        try {
            ops = computeOps(aLines, bLines);
        } catch (e) {
            lastOps = [];
            status.textContent = 'TOO LARGE';
            showEmpty('These two sides are too different to compare line by line in the browser. Try comparing smaller sections.');
            return;
        }

        lastOps = ops;
        var stats = statsFromOps(ops);
        statAdded.textContent = stats.added.toLocaleString();
        statRemoved.textContent = stats.removed.toLocaleString();
        statUnchanged.textContent = stats.unchanged.toLocaleString();

        if (!stats.added && !stats.removed) {
            status.textContent = 'IDENTICAL';
            showEmpty('The two sides are identical. No lines were added, removed, or changed.');
            return;
        }

        var rows = rowsFromOps(ops);
        statRows.textContent = rows.length.toLocaleString();

        var changedRows = 0;
        for (var r = 0; r < rows.length; r++) {
            if (rows[r].type !== 'equal') changedRows++;
        }
        status.textContent = changedRows.toLocaleString() +
            (changedRows === 1 ? ' LINE CHANGED' : ' LINES CHANGED');

        renderRows(rows, aLines, bLines);
    }

    function renderRows(rows, aLines, bLines) {
        var body = document.createDocumentFragment();
        var limit = Math.min(rows.length, MAX_ROWS);
        var wordBudget = WORD_BUDGET;

        for (var r = 0; r < limit; r++) {
            var row = rows[r];
            var tr = document.createElement('tr');
            tr.className = 'diff-row diff-row--' + row.type;

            var leftText = row.left === null ? '' : (aLines[row.left] || '');
            var rightText = row.right === null ? '' : (bLines[row.right] || '');

            var leftNum = document.createElement('td');
            leftNum.className = 'diff-num';
            leftNum.textContent = row.left === null ? '' : String(row.left + 1);
            tr.appendChild(leftNum);

            var leftCell = document.createElement('td');
            leftCell.className = 'diff-code';

            var rightNum = document.createElement('td');
            rightNum.className = 'diff-num';
            rightNum.textContent = row.right === null ? '' : String(row.right + 1);

            var rightCell = document.createElement('td');
            rightCell.className = 'diff-code';

            if (row.type === 'equal') {
                leftCell.textContent = leftText;
                rightCell.textContent = rightText;
            } else if (row.type === 'del') {
                leftCell.className += ' is-del';
                leftCell.textContent = leftText;
                rightCell.className += ' is-empty';
            } else if (row.type === 'add') {
                leftCell.className += ' is-empty';
                rightCell.className += ' is-add';
                rightCell.textContent = rightText;
            } else {
                leftCell.className += ' is-del';
                rightCell.className += ' is-add';

                var parts = null;
                if (wordBudget > 0 && leftText.length + rightText.length < 4000) {
                    parts = wordDiff(leftText, rightText);
                    if (parts) wordBudget -= leftText.length + rightText.length;
                }

                if (parts) {
                    appendParts(leftCell, parts.left);
                    appendParts(rightCell, parts.right);
                } else {
                    leftCell.textContent = leftText;
                    rightCell.textContent = rightText;
                }
            }

            tr.appendChild(leftCell);
            tr.appendChild(rightNum);
            tr.appendChild(rightCell);
            body.appendChild(tr);
        }

        diffBody.innerHTML = '';
        diffBody.appendChild(body);
        diffEmpty.hidden = true;
        diffScroll.hidden = false;

        if (rows.length > MAX_ROWS) {
            limitNote = document.createElement('p');
            limitNote.className = 'diff-limit';
            limitNote.textContent = 'Showing the first ' + MAX_ROWS.toLocaleString() +
                ' of ' + rows.length.toLocaleString() + ' rows. Compare in sections to see the rest.';
            diffFrame.appendChild(limitNote);
        }
    }

    // ── ACTIONS ───────────────────────────────────────────────────
    function scheduleRender(delay) {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, delay === undefined ? 180 : delay);
    }

    function swapSides() {
        var a = inputA.value;
        inputA.value = inputB.value;
        inputB.value = a;
        render();
        Tool.toast('Sides swapped.');
    }

    function copyChanges() {
        clearTimeout(renderTimer);
        render();

        if (!lastOps.length) {
            Tool.toast('No changes to copy yet.');
            return;
        }

        var out = [];
        lastOps.forEach(function (op) {
            if (op.type === 'del') out.push('- ' + (currentA[op.ai] || ''));
            else if (op.type === 'ins') out.push('+ ' + (currentB[op.bi] || ''));
        });

        if (!out.length) {
            Tool.toast('The two sides are identical.');
            return;
        }

        Tool.copy(out.join('\n'), 'Changes copied.');
    }

    function clearAll() {
        inputA.value = '';
        inputB.value = '';
        fileA.value = '';
        fileB.value = '';
        render();
    }

    function loadFile(input, target) {
        if (!input.files.length) return;
        var file = input.files[0];

        if (file.size > MAX_FILE) {
            Tool.toast('That file is larger than 2 MB.');
            input.value = '';
            return;
        }

        file.text().then(function (text) {
            target.value = text;
            input.value = '';
            updateCounts();
            render();
        }).catch(function () {
            input.value = '';
            Tool.toast('That file could not be read as text.');
        });
    }

    // ── WIRING ────────────────────────────────────────────────────
    inputA.addEventListener('input', function () {
        updateCounts();
        scheduleRender();
    });

    inputB.addEventListener('input', function () {
        updateCounts();
        scheduleRender();
    });

    ignoreWhitespace.addEventListener('change', render);
    ignoreCase.addEventListener('change', render);

    Tool.$('loadA').addEventListener('click', function () { fileA.click(); });
    Tool.$('loadB').addEventListener('click', function () { fileB.click(); });

    fileA.addEventListener('change', function () { loadFile(fileA, inputA); });
    fileB.addEventListener('change', function () { loadFile(fileB, inputB); });

    Tool.$('swapBtn').addEventListener('click', swapSides);
    Tool.$('copyChanges').addEventListener('click', copyChanges);
    Tool.$('diffClear').addEventListener('click', clearAll);

    updateCounts();
    render();
})();
