export const SITE_URL = process.env.SITE_URL || 'https://kantojdeespero.com';
export const SITE_BASE = process.env.SITE_BASE || '/';
export const TEMPORARY_CANONICAL_BASE = `${SITE_URL.replace(/\/$/, '')}${SITE_BASE.endsWith('/') ? SITE_BASE : `${SITE_BASE}/`}`;
