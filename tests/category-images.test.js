import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const SOURCE = readFileSync(
  new URL(
    '../src/components/category-card/category-images.ts',
    import.meta.url
  ),
  'utf8'
);
const SCRIPT = ts.transpileModule(SOURCE, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

function setupImages(observerSupported = true) {
  let callback;
  const watched = new Set();
  const exports = {};
  class ImageObserver {
    constructor(onEntries) {
      callback = onEntries;
    }
    observe(image) {
      watched.add(image);
    }
    unobserve(image) {
      watched.delete(image);
    }
    disconnect() {
      watched.clear();
    }
  }
  runInNewContext(SCRIPT, {
    exports,
    IntersectionObserver: observerSupported ? ImageObserver : undefined,
  });
  assert.equal(typeof exports.createCategoryImageLoader, 'function');
  return {
    loader: exports.createCategoryImageLoader(),
    watched,
    enter(image, isIntersecting = true) {
      callback([{ target: image, isIntersecting }]);
    },
  };
}

test('offscreen categories keep their placeholder until they approach the viewport', () => {
  const { loader, enter } = setupImages();
  const image = { src: 'placeholder' };
  loader.observe(image, 'https://example.com/category.jpg');
  assert.equal(image.src, 'placeholder');
  enter(image, false);
  assert.equal(image.src, 'placeholder');
  enter(image);
  assert.equal(image.src, 'https://example.com/category.jpg');
});

test('each category image starts only once and stops being observed', () => {
  const { loader, enter, watched } = setupImages();
  const sources = [];
  const image = {
    set src(source) {
      sources.push(source);
    },
  };
  loader.observe(image, 'https://example.com/category.jpg');
  enter(image);
  enter(image);
  assert.deepEqual(sources, ['https://example.com/category.jpg']);
  assert.equal(watched.size, 0);
});

test('clearing a category page ignores queued entries for removed cards', () => {
  const { loader, enter, watched } = setupImages();
  const oldImage = { src: 'placeholder' };
  loader.observe(oldImage, 'https://example.com/old.jpg');
  loader.clear();
  enter(oldImage);
  assert.equal(oldImage.src, 'placeholder');
  assert.equal(watched.size, 0);

  const newImage = { src: 'placeholder' };
  loader.observe(newImage, 'https://example.com/new.jpg');
  enter(newImage);
  assert.equal(newImage.src, 'https://example.com/new.jpg');
});

test('observing a visible card does not start unrelated offscreen images', () => {
  const { loader, enter } = setupImages();
  const first = { src: 'placeholder' };
  const second = { src: 'placeholder' };
  loader.observe(first, 'https://example.com/first.jpg');
  loader.observe(second, 'https://example.com/second.jpg');
  enter(first);
  assert.equal(first.src, 'https://example.com/first.jpg');
  assert.equal(second.src, 'placeholder');
});

test('browsers without IntersectionObserver still receive category images', () => {
  const { loader } = setupImages(false);
  const image = { src: 'placeholder' };
  loader.observe(image, 'https://example.com/category.jpg');
  assert.equal(image.src, 'https://example.com/category.jpg');
  loader.clear();
});
