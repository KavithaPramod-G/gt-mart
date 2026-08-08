/**
 * Load supabase/environments/{staging|production}.env
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const envRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'environments');

export function parseEnvFile(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

export function loadEnvironment(name) {
  const file = join(envRoot, `${name}.env`);
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}\nCopy ${name}.env.example → ${name}.env`);
  }
  return parseEnvFile(readFileSync(file, 'utf8'));
}

export function applyToProcessEnv(env) {
  for (const [key, value] of Object.entries(env)) {
    if (value) process.env[key] = value;
  }
}
