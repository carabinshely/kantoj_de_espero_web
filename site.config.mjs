export const SITE_URL = process.env.SITE_URL || 'https://carabinshely.github.io';
export const SITE_BASE = process.env.SITE_BASE || '/kantoj_de_espero_web';
export const TEMPORARY_CANONICAL_BASE = `${SITE_URL.replace(/\/$/, '')}${SITE_BASE.endsWith('/') ? SITE_BASE : `${SITE_BASE}/`}`;
