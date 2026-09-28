/** Minimal zero-dependency test runner. */
type T = { name: string; fn: () => void };
const tests: T[] = [];
export const test = (name: string, fn: () => void) => tests.push({ name, fn });
export function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}\n    ${(e as Error).message}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed) process.exit(1);
}
