import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LIFEDESK_MATERIAL_ICONS,
  LIFEDESK_MATERIAL_ICON_SET,
  extractStaticMaterialIconsFromSource,
} from './iconManifest';

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('subsetted self-hosted Material Symbols WOFF2 asset exists and is compact', () => {
  const fontPath = path.resolve(process.cwd(), 'public/fonts/material-symbols-outlined.woff2');
  assert.equal(fs.existsSync(fontPath), true, 'Expected public/fonts/material-symbols-outlined.woff2 to exist');
  const buf = fs.readFileSync(fontPath);
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'wOF2', 'Expected valid WOFF2 header');
  assert.ok(buf.length > 1000 && buf.length < 100_000, `Expected compact subsetted WOFF2 (<100KB), got ${buf.length} bytes`);
});

test('LIFEDESK_MATERIAL_ICONS is sorted and unique', () => {
  const sorted = [...LIFEDESK_MATERIAL_ICONS].sort();
  assert.deepEqual([...LIFEDESK_MATERIAL_ICONS], sorted);
  assert.equal(LIFEDESK_MATERIAL_ICON_SET.size, LIFEDESK_MATERIAL_ICONS.length);
});

test('every static Material Symbols icon referenced in src/ is included in LIFEDESK_MATERIAL_ICON_SET', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const files = collectTsFiles(srcDir);
  const missing: { file: string; icon: string }[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const icons = extractStaticMaterialIconsFromSource(content);
    for (const icon of icons) {
      if (!LIFEDESK_MATERIAL_ICON_SET.has(icon)) {
        missing.push({ file: path.relative(process.cwd(), file), icon });
      }
    }
  }

  assert.deepEqual(missing, [], `Found icons missing from subsetted font manifest: ${JSON.stringify(missing)}`);
});
