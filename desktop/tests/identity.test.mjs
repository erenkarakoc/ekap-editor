import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { userDataPath } from '../dist/identity.js';

function profileFixture(t, names) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icmal-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of names) {
    fs.mkdirSync(path.join(root, name));
    fs.writeFileSync(path.join(root, name, 'local-engine.json'), '{"workspaceRoot":"existing"}');
  }
  return root;
}

test('new installation uses icmal without creating or moving files', (t) => {
  const root = profileFixture(t, []);
  assert.equal(userDataPath(root, true), path.join(root, 'icmal'));
  assert.deepEqual(fs.readdirSync(root), []);
});
for (const name of ['EKAP Editör', 'ekap-editor-desktop']) {
  test(`existing ${name} profile remains in place with all contents`, (t) => {
    const root = profileFixture(t, [name]);
    const profile = path.join(root, name);
    const before = fs.readFileSync(path.join(profile, 'local-engine.json'));
    assert.equal(userDataPath(root, true), profile);
    assert.deepEqual(fs.readFileSync(path.join(profile, 'local-engine.json')), before);
    assert.deepEqual(fs.readdirSync(root), [name]);
  });
}
test('an existing icmal profile takes precedence without merging profiles', (t) => {
  const root = profileFixture(t, ['icmal', 'EKAP Editör']);
  assert.equal(userDataPath(root, true), path.join(root, 'icmal'));
  assert.equal(fs.readdirSync(root).length, 2);
});
test('development and packaged installations preserve their respective legacy preference', (t) => {
  const root = profileFixture(t, ['EKAP Editör', 'ekap-editor-desktop']);
  assert.equal(userDataPath(root, false), path.join(root, 'ekap-editor-desktop'));
  assert.equal(userDataPath(root, true), path.join(root, 'EKAP Editör'));
});
