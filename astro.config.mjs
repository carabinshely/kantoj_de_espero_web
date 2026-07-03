import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_BASE, SITE_URL } from './site.config.mjs';

const site = SITE_URL;
const base = SITE_BASE;

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: {
    format: 'directory'
  }
});
