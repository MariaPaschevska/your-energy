import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const SOURCE = readFileSync(
  new URL('../src/pages/favorites-page/favorites-page.ts', import.meta.url),
  'utf8'
);
const SCRIPT = ts.transpileModule(SOURCE, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

function setupFavorites() {
  let favoriteIds = ['A', 'B'];
  const requests = [];
  const listeners = {};
  const list = {
    hidden: false,
    children: [],
    set textContent(value) {
      if (value === '') this.children = [];
    },
    append(card) {
      this.children.push(card);
    },
    querySelectorAll() {
      return this.children;
    },
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
  };
  const empty = { hidden: true };
  const error = { hidden: true, textContent: '' };
  const template = {};
  const elements = {
    '[data-favorites-list]': list,
    '[data-favorites-empty]': empty,
    '[data-favorites-error]': error,
    '[data-exercise-template]': template,
  };
  const modules = {
    '../../services/exercises-api': {
      getExercisesByIds: ids =>
        new Promise((resolve, reject) => {
          requests.push({ ids: [...ids], resolve, reject });
        }),
    },
    '../../components/exercise-card/exercise-card': {
      createExerciseCard: (_, exercise) => {
        const card = {
          dataset: { exerciseId: exercise._id },
          remove() {
            list.children = list.children.filter(current => current !== card);
          },
        };
        return card;
      },
    },
    '../../services/favorites': {
      readFavoriteIds: () => [...favoriteIds],
      removeFavoriteId: id => {
        favoriteIds = favoriteIds.filter(current => current !== id);
      },
    },
  };

  runInNewContext(SCRIPT, {
    exports: {},
    require: name => modules[name],
    document: {
      querySelector: () => ({ querySelector: selector => elements[selector] }),
    },
    window: {
      addEventListener(name, listener) {
        listeners[name] = listener;
      },
    },
  });

  return {
    requests,
    empty,
    error,
    list,
    getIds: () => [...favoriteIds],
    getCards: () => list.children.map(card => card.dataset.exerciseId),
    updateFromModal(ids) {
      favoriteIds = ids;
      listeners['favorites-updated']();
    },
    removeCard(id) {
      const card = list.children.find(
        current => current.dataset.exerciseId === id
      );
      assert.ok(card, `Expected a visible card for ${id}`);
      listeners.click({
        target: { closest: () => ({ closest: () => card }) },
      });
    },
  };
}

async function resolveRequest(request) {
  request.resolve(request.ids.map(id => ({ _id: id })));
  await new Promise(resolve => setImmediate(resolve));
}

for (const outcome of ['success', 'error']) {
  test(`removing the last favorite ignores an older refresh ${outcome}`, async () => {
    const page = setupFavorites();
    await resolveRequest(page.requests[0]);
    page.updateFromModal(['B']);
    page.removeCard('B');

    if (outcome === 'success') {
      await resolveRequest(page.requests[1]);
    } else {
      page.requests[1].reject(new Error('Request failed'));
      await new Promise(resolve => setImmediate(resolve));
    }

    assert.deepEqual(page.getIds(), []);
    assert.deepEqual(page.getCards(), []);
    assert.equal(page.empty.hidden, false);
    assert.equal(page.list.hidden, true);
    assert.equal(page.error.hidden, true);
  });
}

test('removing a card keeps a favorite added during a pending refresh', async () => {
  const page = setupFavorites();
  await resolveRequest(page.requests[0]);
  page.updateFromModal(['A', 'B', 'C']);
  page.removeCard('B');

  if (page.requests[2]) await resolveRequest(page.requests[2]);
  await resolveRequest(page.requests[1]);

  assert.deepEqual(page.getIds(), ['A', 'C']);
  assert.deepEqual(page.getCards(), ['A', 'C']);
  assert.equal(page.empty.hidden, true);
  assert.equal(page.error.hidden, true);
});

test('removing a loaded card keeps the other cards when the network is offline', async () => {
  const page = setupFavorites();
  await resolveRequest(page.requests[0]);
  page.removeCard('B');

  for (const request of page.requests.slice(1)) {
    request.reject(new Error('Offline'));
  }
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(page.getIds(), ['A']);
  assert.deepEqual(page.getCards(), ['A']);
  assert.equal(page.empty.hidden, true);
  assert.equal(page.error.hidden, true);
});
