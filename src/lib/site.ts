import catalog from '@/data/public-catalog.json';
import facts from '@/data/site-facts.json';
import type { Lang, PublicPlaylist, PublicSong, SiteFacts, StreamingLinks } from './types';

export const songs = catalog.songs as PublicSong[];
export const playlists = catalog.playlists as PublicPlaylist[];
export const siteFacts: SiteFacts = facts;

export const languages: Record<Lang, { label: string; home: string; songs: string; playlists: string; about: string; licensing: string }> = {
  en: { label: 'English', home: '/en/', songs: '/en/songs/', playlists: '/en/playlists/', about: '/en/about/', licensing: '/en/licensing/' },
  eo: { label: 'Esperanto', home: '/eo/', songs: '/eo/kantoj/', playlists: '/eo/ludlistoj/', about: '/eo/pri-ni/', licensing: '/eo/licencado/' }
};

export function localizedSong(song: PublicSong, lang: Lang) {
  return {
    title: lang === 'eo' ? song.title_eo : song.title_en,
    hook: lang === 'eo' ? song.hook_eo_draft : song.hook_en,
    description: lang === 'eo' ? song.description_eo_draft : song.description_en,
    path: songPath(song, lang)
  };
}

export function localizedPlaylist(playlist: PublicPlaylist, lang: Lang) {
  return {
    title: lang === 'eo' ? playlist.title_eo : playlist.title_en,
    intro: lang === 'eo' ? playlist.intro_eo_draft : playlist.intro_en,
    cta: lang === 'eo' ? playlist.cta_eo_draft : playlist.cta_en,
    seoTitle: lang === 'eo' ? playlist.seo_title_eo : playlist.seo_title_en,
    metaDescription: lang === 'eo' ? playlist.meta_description_eo_draft : playlist.meta_description_en,
    path: playlistPath(playlist, lang)
  };
}

export function songPath(song: PublicSong, lang: Lang) {
  return lang === 'eo' ? `/eo/kantoj/${song.slug}/` : `/en/songs/${song.slug}/`;
}

export function playlistPath(playlist: PublicPlaylist, lang: Lang) {
  return lang === 'eo' ? `/eo/ludlistoj/${playlist.slug_eo}/` : `/en/playlists/${playlist.slug_en}/`;
}

export function alternateForPath(kind: 'home' | 'songs' | 'playlists' | 'about' | 'licensing' | 'song' | 'playlist', lang: Lang, item?: PublicSong | PublicPlaylist) {
  const other: Lang = lang === 'en' ? 'eo' : 'en';
  if (kind === 'song' && item) return songPath(item as PublicSong, other);
  if (kind === 'playlist' && item) return playlistPath(item as PublicPlaylist, other);
  if (kind === 'home') return languages[other].home;
  if (kind === 'songs') return languages[other].songs;
  if (kind === 'playlists') return languages[other].playlists;
  if (kind === 'about') return languages[other].about;
  return languages[other].licensing;
}

export function songsForPlaylist(playlist: PublicPlaylist) {
  const byId = new Map(songs.map((song) => [song.id, song]));
  return playlist.song_ids.map((id) => byId.get(id)).filter(Boolean) as PublicSong[];
}

export function playlistsForSong(song: PublicSong) {
  const ids = new Set(song.playlist_slugs);
  return playlists.filter((playlist) => ids.has(playlist.id));
}

export function realLinks(links: StreamingLinks) {
  return Object.entries(links).filter(([, url]) => typeof url === 'string' && url.startsWith('http')) as [keyof StreamingLinks, string][];
}

export function platformLabel(platform: string) {
  return ({ spotify: 'Spotify', youtube_music: 'YouTube Music', apple_music: 'Apple Music', deezer: 'Deezer', amazon_music: 'Amazon Music', hyperfollow: 'All platforms' } as Record<string, string>)[platform] ?? platform;
}
