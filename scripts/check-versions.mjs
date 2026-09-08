import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const version = json('package.json').version;
const cargo = read('src-tauri/Cargo.toml').match(/\[package\]([\s\S]*?)(?=\n\[)/)?.[1];
const cargoLock = read('src-tauri/Cargo.lock').match(/\[\[package\]\]\s+name = "e-dit"\s+version = "([^"]+)"/)?.[1];
const versions = {
  'package-lock.json': json('package-lock.json').version,
  'package-lock.json root package': json('package-lock.json').packages[''].version,
  'src-tauri/tauri.conf.json': json('src-tauri/tauri.conf.json').version,
  'src-tauri/Cargo.toml': cargo?.match(/^version = "([^"]+)"/m)?.[1],
  'src-tauri/Cargo.lock': cargoLock,
  'android/app/build.gradle': read('android/app/build.gradle').match(/versionName "([^"]+)"/)?.[1],
};

for (const [file, actual] of Object.entries(versions)) {
  assert.equal(actual, version, `${file}: expected version ${version}, found ${actual}`);
}
console.log(`All application manifests use version ${version}.`);
