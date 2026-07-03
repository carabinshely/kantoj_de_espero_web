import { siteFacts } from './site';
import type { Lang } from './types';

export function siteUrl(path = '/') {
  const base = import.meta.env.BASE_URL || '/';
  const origin = (import.meta.env.SITE || 'https://carabinshely.github.io').replace(/\/$/, '');
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(`${cleanBase}${cleanPath}`, `${origin}/`).toString();
}

export function languageAlternates(currentPath: string, otherPath: string) {
  return [
    { lang: currentPath.startsWith('/eo/') ? 'eo' : 'en', href: siteUrl(currentPath) },
    { lang: otherPath.startsWith('/eo/') ? 'eo' : 'en', href: siteUrl(otherPath) },
    { lang: 'x-default', href: siteUrl('/') }
  ];
}

export function musicGroupJsonLd(path = '/') {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: siteFacts.artistName,
    url: siteUrl(path),
    genre: ['Esperanto pop-rock', 'pop-rock'],
    description: `${siteFacts.artistName} is a modern Esperanto music project.`
  };
}

export function recordingJsonLd(song: { title: string; description_en: string; public_genres: string[] }, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: { '@type': 'MusicGroup', name: siteFacts.artistName },
    genre: song.public_genres,
    description: song.description_en,
    url: siteUrl(path)
  };
}

export function playlistJsonLd(title: string, description: string, path: string, itemUrls: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    url: siteUrl(path),
    itemListElement: itemUrls.map((url, index) => ({ '@type': 'ListItem', position: index + 1, url: siteUrl(url) }))
  };
}

export function pageHref(path = '/') {
  const base = import.meta.env.BASE_URL || '/';
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`.replace(/\/+/g, '/');
}
