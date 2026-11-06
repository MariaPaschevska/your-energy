import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const STORAGE_KEY = 'your-energy-daily-quote';
const BEFORE_MIDNIGHT = new Date(2026, 10, 6, 23, 59, 59).getTime();
const AFTER_MIDNIGHT = new Date(2026, 10, 7, 0, 0, 1).getTime();
const OLD_QUOTE = { author: 'Old author', quote: 'Old day quote' };
const NEW_QUOTE = { author: 'New author', quote: 'New day quote' };
const SOURCE = readFileSync(
  new URL('../src/components/daily-quote/daily-quote.ts', import.meta.url),
  'utf8'
);
const SCRIPT = ts.transpileModule(SOURCE, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

function setupQuote({ store = new Map(), writeBlocked = false } = {}) {
  let now = BEFORE_MIDNIGHT;
  const requests = [];
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
  }
  const exports = {};
  runInNewContext(SCRIPT, {
    exports,
    Date: FixedDate,
    require: () => ({
      getQuote: () =>
        new Promise((resolve, reject) => requests.push({ resolve, reject })),
    }),
    localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem(key, value) {
        if (writeBlocked) throw new Error('Storage is unavailable');
        store.set(key, value);
      },
    },
  });
  return {
    getDailyQuote: exports.getDailyQuote,
    requests,
    store,
    setNow(value) {
      now = value;
    },
  };
}

const nextTurn = () => new Promise(resolve => setImmediate(resolve));

test('a late old-day response keeps the newer cache from another tab', async () => {
  const store = new Map();
  const oldTab = setupQuote({ store });
  const newTab = setupQuote({ store });
  const oldRequest = oldTab.getDailyQuote();
  oldTab.setNow(AFTER_MIDNIGHT);
  newTab.setNow(AFTER_MIDNIGHT);
  const newRequest = newTab.getDailyQuote();
  newTab.requests[0].resolve(NEW_QUOTE);
  await newRequest;

  oldTab.requests[0].resolve(OLD_QUOTE);
  const displayed = await oldRequest;
  assert.equal(displayed.quote, NEW_QUOTE.quote);
  assert.equal(JSON.parse(store.get(STORAGE_KEY)).date, '2026-11-07');
  assert.equal(JSON.parse(store.get(STORAGE_KEY)).quote.quote, NEW_QUOTE.quote);

  const reload = setupQuote({ store });
  reload.setNow(AFTER_MIDNIGHT);
  assert.equal((await reload.getDailyQuote()).quote, NEW_QUOTE.quote);
  assert.equal(reload.requests.length, 0);
  assert.equal(oldTab.requests.length, 1);
});

test('a late old-day response shares the pending current-day request', async () => {
  const tab = setupQuote();
  const oldRequest = tab.getDailyQuote();
  tab.setNow(AFTER_MIDNIGHT);
  const newRequest = tab.getDailyQuote();
  tab.requests[0].resolve(OLD_QUOTE);
  await nextTurn();
  const cacheWhilePending = tab.store.get(STORAGE_KEY);
  tab.requests[1].resolve(NEW_QUOTE);

  const displayed = await Promise.all([oldRequest, newRequest]);
  assert.equal(cacheWhilePending, undefined);
  assert.ok(displayed.every(quote => quote.quote === NEW_QUOTE.quote));
  assert.equal(tab.requests.length, 2);
  assert.equal(JSON.parse(tab.store.get(STORAGE_KEY)).date, '2026-11-07');
});

test('a late response starts a current-day request when no cache exists', async () => {
  const tab = setupQuote();
  const pending = tab.getDailyQuote();
  tab.setNow(AFTER_MIDNIGHT);
  tab.requests[0].resolve(OLD_QUOTE);
  await nextTurn();
  const requestCount = tab.requests.length;
  const cacheWhilePending = tab.store.get(STORAGE_KEY);
  if (tab.requests[1]) tab.requests[1].resolve(NEW_QUOTE);
  const displayed = await pending;

  assert.equal(requestCount, 2);
  assert.equal(cacheWhilePending, undefined);
  assert.equal(displayed.quote, NEW_QUOTE.quote);
  assert.equal(JSON.parse(tab.store.get(STORAGE_KEY)).date, '2026-11-07');
});

test('same-day calls share one request and then reuse the saved quote', async () => {
  const tab = setupQuote();
  const first = tab.getDailyQuote();
  const second = tab.getDailyQuote();
  assert.equal(tab.requests.length, 1);
  tab.requests[0].resolve(OLD_QUOTE);
  await Promise.all([first, second]);

  assert.equal((await tab.getDailyQuote()).quote, OLD_QUOTE.quote);
  assert.equal(tab.requests.length, 1);
});

test('a failed current-day request allows retry after midnight', async () => {
  const tab = setupQuote();
  tab.setNow(AFTER_MIDNIGHT);
  const pending = tab.getDailyQuote();
  tab.requests[0].reject(new Error('Offline'));
  await assert.rejects(pending, /Offline/);

  const retry = tab.getDailyQuote();
  assert.equal(tab.requests.length, 2);
  tab.requests[1].resolve(NEW_QUOTE);
  assert.equal((await retry).quote, NEW_QUOTE.quote);
});

test('a valid quote is returned even when saving it fails', async () => {
  const tab = setupQuote({ writeBlocked: true });
  const pending = tab.getDailyQuote();
  tab.requests[0].resolve(OLD_QUOTE);

  assert.equal((await pending).quote, OLD_QUOTE.quote);
  assert.equal(tab.store.size, 0);
});
