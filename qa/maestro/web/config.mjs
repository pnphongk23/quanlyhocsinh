const DEFAULT_API_BASE = 'https://qlh-dev-api.tolaphamnhuphong.workers.dev/v1';
const DEFAULT_WEB_BASE = 'https://qlh-dev-web.pages.dev';
const allowStaging = process.env.QLH_ALLOW_STAGING === '1';

function resolveBase(name, value, fallback) {
  const base = (value || fallback).replace(/\/+$/, '');
  if (/staging/i.test(base) && !allowStaging) {
    throw new Error(`${name} points to staging. Staging is production; use the DEV default or set QLH_ALLOW_STAGING=1 only for an explicitly approved exception.`);
  }
  return base;
}

export const API_BASE = resolveBase('QLH_API_BASE', process.env.QLH_API_BASE, DEFAULT_API_BASE);
export const WEB_BASE = resolveBase('QLH_WEB_BASE', process.env.QLH_WEB_BASE, DEFAULT_WEB_BASE);
