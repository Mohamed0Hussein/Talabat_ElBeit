import ar from './ar.json';
import en from './en.json';

type Tree = { [key: string]: string | Tree };

// Plural forms differ by language (English: one/other; Arabic: zero/one/two/few/many/other),
// so compare keys with the plural suffix removed.
const PLURAL = /_(zero|one|two|few|many|other)$/;

function keysOf(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`.replace(PLURAL, '')] : keysOf(v, `${prefix}${k}.`),
  );
}

it('has the same keys in English and Arabic', () => {
  const enKeys = [...new Set(keysOf(en as Tree))].sort();
  const arKeys = [...new Set(keysOf(ar as Tree))].sort();
  expect(arKeys).toEqual(enKeys);
});

it('has every Arabic plural form where English has a plural', () => {
  const enPlurals = keysOf(en as Tree).filter((k, i, all) => all.indexOf(k) !== i);
  const flat = JSON.stringify(ar);
  for (const key of new Set(enPlurals)) {
    const leaf = key.split('.').pop();
    for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) {
      expect(flat).toContain(`"${leaf}_${form}"`);
    }
  }
});

it('uses the same placeholders in both languages', () => {
  const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
  const walk = (a: Tree, b: Tree, path: string) => {
    for (const [k, v] of Object.entries(a)) {
      if (typeof v === 'string') {
        const base = k.replace(PLURAL, '');
        const match = typeof b[k] === 'string' ? b[k] : Object.entries(b).find(([bk]) => bk.replace(PLURAL, '') === base)?.[1];
        if (typeof match === 'string') {
          // Arabic plural forms like "one" may spell the number out, so only check the "other" form.
          if (!PLURAL.test(k) || k.endsWith('_other')) expect(`${path}${k}: ${placeholders(match)}`).toBe(`${path}${k}: ${placeholders(v)}`);
        }
      } else if (typeof b[k] === 'object') {
        walk(v, b[k] as Tree, `${path}${k}.`);
      }
    }
  };
  walk(en as Tree, ar as Tree, '');
});
