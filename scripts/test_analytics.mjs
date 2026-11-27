// Run: node scripts/test_analytics.mjs. No dependencies or network access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync('docs/assets/JS/index.js', 'utf8');
const source = script.slice(script.indexOf('/* Optional GA4 analytics.'));
const KEY = 'beben-analytics-consent-v1';
const ID = 'G-RN3XPCCE2S';
const days = n => n * 24 * 60 * 60 * 1000;

function fixture({ choice, at = Date.now(), hostname = 'bebendesign.com', blocked = false } = {}) {
    const storage = new Map(choice === undefined ? [] : [[KEY, JSON.stringify({ value: choice, at })]]);
    const cookies = new Map([['_ga', 'a'], ['_ga_RN3XPCCE2S', 'b'], ['unrelated', 'c']]);
    const scripts = [];
    const windowEvents = {};
    let reloads = 0;
    let panel;
    let settings;
    const document = {
        referrer: 'https://example.org/from/?email=private#secret',
        activeElement: null,
        head: { appendChild(el) { scripts.push(el); } },
        body: { appendChild(el) { panel = el; } },
        querySelector() { return { appendChild(el) { settings = el; } }; },
        createElement(tag) { return new Element(tag); },
    };
    class Element {
        constructor(tag) {
            this.tagName = tag;
            this.events = {};
            this.attributes = {};
            this.hidden = false;
        }
        setAttribute(key, value) { this.attributes[key] = value; }
        addEventListener(key, fn) { this.events[key] = fn; }
        focus() { document.activeElement = this; }
        click() { this.events.click?.({}); }
        set innerHTML(value) {
            this.html = value;
            this.buttons = ['denied', 'granted', 'close'].map(value => {
                const el = new Element('button');
                el.dataset = { analytics: value };
                el.hidden = value === 'close';
                return el;
            });
            this.status = new Element('p');
        }
        querySelector(selector) {
            if (selector === 'button') return this.buttons[0];
            if (selector.includes('status')) return this.status;
            return this.buttons.find(b => selector.includes(b.dataset.analytics));
        }
        querySelectorAll() { return this.buttons; }
    }
    Object.defineProperty(document, 'cookie', {
        get: () => [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        set: value => { if (value.includes('Max-Age=0')) cookies.delete(value.split('=')[0]); },
    });
    const window = { addEventListener(key, fn) { windowEvents[key] = fn; } };
    const localStorage = {
        getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key) || null; },
        setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); },
    };
    const location = {
        hostname,
        href: `https://${hostname}/contact/?email=private#secret`,
        reload() { reloads++; },
    };
    vm.runInNewContext(source, { window, document, localStorage, location, URL, Date });
    return {
        window, panel, settings, scripts, storage, cookies, document,
        get reloads() { return reloads; },
        click(value) { panel.buttons.find(b => b.dataset.analytics === value).click(); },
        storageEvent(key) { windowEvents.storage({ key }); },
    };
}

const first = fixture();
assert.equal(first.scripts.length, 0, 'no Google script before consent');
assert.equal(first.window.dataLayer, undefined, 'no cookieless pings queued before consent');
assert.equal(first.panel.hidden, false);
first.click('denied');
assert.equal(first.panel.hidden, true);
assert.equal(first.scripts.length, 0);
assert.equal(JSON.parse(first.storage.get(KEY)).value, 'denied');
first.settings.focus();
first.settings.click();
assert.equal(first.panel.hidden, false);
assert.equal(first.document.activeElement, first.panel.buttons[0]);
first.click('granted');
assert.equal(first.document.activeElement, first.settings, 'focus returns to preferences control');
assert.equal(first.scripts.length, 1);
assert.equal(first.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + ID);
const commands = first.window.dataLayer.map(args => Array.from(args));
assert.equal(commands.filter(args => args[0] === 'config').length, 1);
assert.equal(commands.filter(args => args[0] === 'event' && args[1] === 'page_view').length, 1);
const config = commands.find(args => args[0] === 'config')[2];
assert.equal(config.send_page_view, false);
assert.equal(config.allow_google_signals, false);
assert.equal(config.allow_ad_personalization_signals, false);
assert.equal(config.page_location, 'https://bebendesign.com/contact/');
assert.equal(config.page_referrer, 'https://example.org/from/');
assert.equal(commands[0][2].ad_storage, 'denied');
first.click('granted');
assert.equal(first.scripts.length, 1, 'repeated acceptance does not duplicate tracking');
first.cookies.set('_ga', 'new');
first.cookies.set('_ga_RN3XPCCE2S', 'new');
first.click('denied');
assert.equal(first.window['ga-disable-' + ID], true);
assert.equal(first.reloads, 1, 'withdrawal reloads to remove active Google code');
assert.deepEqual([...first.cookies.keys()], ['unrelated']);

assert.equal(fixture({ choice: 'granted' }).scripts.length, 1);
assert.equal(fixture({ choice: 'granted', hostname: 'www.bebendesign.com' }).scripts.length, 1);
assert.equal(fixture({ choice: 'denied' }).scripts.length, 0);
for (const options of [
    { choice: 'granted', at: Date.now() - days(181) },
    { choice: 'granted', at: Date.now() + days(1) },
    { choice: 'invalid' },
    { blocked: true },
]) {
    const f = fixture(options);
    assert.equal(f.scripts.length, 0);
    assert.equal(f.panel.hidden, false);
}
for (const hostname of ['localhost', '127.0.0.1', 'beben.design', 'example.com']) {
    const f = fixture({ hostname, choice: 'granted' });
    assert.equal(f.scripts.length, 0, 'non-production hosts never load Google');
}
const crossTab = fixture({ choice: 'granted' });
crossTab.storageEvent(KEY);
assert.equal(crossTab.window['ga-disable-' + ID], true);
assert.equal(crossTab.reloads, 1);
console.log('Analytics consent tests passed: opt-in, rejection, persistence, expiry, withdrawal, cross-tab changes, URL sanitisation, host restrictions and no duplicate page views.');
