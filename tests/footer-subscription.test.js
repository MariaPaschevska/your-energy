import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const SOURCE = readFileSync(
  new URL('../src/components/footer/footer.ts', import.meta.url),
  'utf8'
);
const SCRIPT = ts.transpileModule(SOURCE, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

class ApiError extends Error {}

function setupSubscription() {
  const requests = [];
  const button = { disabled: false };
  const input = { value: 'reader@example.com' };
  const message = { textContent: '', style: {} };
  let submit;
  const form = {
    valid: true,
    reports: 0,
    checkValidity() {
      return this.valid;
    },
    reportValidity() {
      this.reports++;
    },
    reset() {
      input.value = '';
    },
    querySelector: () => button,
    addEventListener(_, listener) {
      submit = listener;
    },
  };
  const elements = {
    'footer-subscription-form': form,
    'footer-email': input,
    'footer-subscription-message': message,
  };
  const modules = {
    '../../services/api': { ApiError },
    '../../services/subscription-api': {
      subscribe: email =>
        new Promise((resolve, reject) => {
          requests.push({ email, resolve, reject });
        }),
    },
  };
  runInNewContext(SCRIPT, {
    exports: {},
    require: name => modules[name],
    document: { getElementById: id => elements[id] },
  });
  return {
    requests,
    button,
    input,
    message,
    form,
    submit: () => submit({ preventDefault() {} }),
  };
}

test('repeated submits send only one subscription request while pending', async () => {
  const page = setupSubscription();
  const pending = page.submit();
  const repeated = [page.submit(), page.submit()];
  const count = page.requests.length;
  for (const request of page.requests) {
    request.resolve({ message: 'Subscribed.' });
  }
  await Promise.all([pending, ...repeated]);

  assert.equal(count, 1);
  assert.equal(page.message.textContent, 'Subscribed.');
  assert.equal(page.input.value, '');
  assert.equal(page.button.disabled, false);
});

test('Send is disabled while pending and works again after success', async () => {
  const page = setupSubscription();
  const pending = page.submit();
  const disabledWhilePending = page.button.disabled;
  page.requests[0].resolve({});
  await pending;

  assert.equal(disabledWhilePending, true);
  assert.equal(page.button.disabled, false);
  assert.equal(page.message.textContent, 'Thank you! You are subscribed.');
  page.input.value = 'another@example.com';
  const next = page.submit();
  assert.equal(page.requests.length, 2);
  assert.equal(page.requests[1].email, 'another@example.com');
  page.requests[1].resolve({ message: 'Subscribed again.' });
  await next;
  assert.equal(page.button.disabled, false);
});

for (const [errorType, error] of [
  ['API error', new ApiError('Subscription already exists')],
  ['network error', new Error('Offline')],
]) {
  test(`Send unlocks after ${errorType} and allows retry`, async () => {
    const page = setupSubscription();
    const pending = page.submit();
    const disabledWhilePending = page.button.disabled;
    page.requests[0].reject(error);
    await pending;

    assert.equal(disabledWhilePending, true);
    assert.equal(page.button.disabled, false);
    assert.equal(page.input.value, 'reader@example.com');
    assert.equal(
      page.message.textContent,
      error instanceof ApiError
        ? 'Subscription already exists'
        : 'Something went wrong. Please try again.'
    );
    const retry = page.submit();
    assert.equal(page.requests.length, 2);
    page.requests[1].resolve({ message: 'Subscribed.' });
    await retry;
    assert.equal(page.button.disabled, false);
  });
}

test('invalid email does not send a request or lock Send', async () => {
  const page = setupSubscription();
  page.form.valid = false;
  await page.submit();

  assert.equal(page.requests.length, 0);
  assert.equal(page.form.reports, 1);
  assert.equal(page.button.disabled, false);
});
