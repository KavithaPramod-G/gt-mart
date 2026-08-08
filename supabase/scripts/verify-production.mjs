/**
 * Verify Supabase staging or production via REST API.
 * Usage: node supabase/scripts/verify-production.mjs staging|production
 */
import { applyToProcessEnv, loadEnvironment } from './load-env.mjs';

const envName = process.argv[2] || 'staging';

try {
  applyToProcessEnv(loadEnvironment(envName));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const url =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`Missing URL or SUPABASE_SERVICE_ROLE_KEY in ${envName}.env`);
  process.exit(1);
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function check(path) {
  const res = await fetch(`${url}${path}`, { headers });
  return res.ok;
}

console.log(`\nVerify [${envName}] — ${url}\n`);

const checks = [
  ['categories', check('/rest/v1/categories?select=id&limit=1')],
  ['products', check('/rest/v1/products?select=id&limit=1')],
  ['orders', check('/rest/v1/orders?select=id&limit=1')],
  ['admin_users', check('/rest/v1/admin_users?select=id&limit=1')],
  ['product-images bucket', check('/storage/v1/bucket/product-images')],
  ['category-images bucket', check('/storage/v1/bucket/category-images')],
];

let failed = 0;
for (const [name, promise] of checks) {
  const ok = await promise;
  console.log(`  [${ok ? 'OK' : 'FAIL'}] ${name}`);
  if (!ok) failed += 1;
}

console.log(failed === 0 ? '\nAll checks passed.\n' : `\n${failed} failed.\n`);
process.exit(failed === 0 ? 0 : 1);
