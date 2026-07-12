export type Lang = 'en' | 'eo';
export type StreamingPlatform = 'spotify' | 'youtube_music' | 'apple_music' | 'deezer' | 'amazon_music' | 'hyperfollow';
export type ListeningProvider = 'spotify' | 'apple_music';
export type ListeningEntityType = 'song' | 'playlist';

export type StreamingLinks = Record<StreamingPlatform, string | null>;

export interface PublicSong {
  id: string;
  slug: string;
  title: string;
  title_en: string;
  title_eo: string;
  language: string;
  lyrics_eo: string;
  hook_en: string;
  hook_eo_draft: string;
  description_en: string;
  description_eo_draft: string;
  public_genres: string[];
  public_moods: string[];
  public_topics: string[];
  playlist_slugs: string[];
  license_available: boolean;
  featured: boolean;
  site_status: 'mvp';
  streaming_links: StreamingLinks;
  similar_song_ids: string[];
  lyric_publication_policy: string;
}

export interface PublicPlaylist {
  id: string;
  slug_en: string;
  slug_eo: string;
  title_en: string;
  title_eo: string;
  purpose: string;
  seo_intent: string[];
  intro_en: string;
  intro_eo_draft: string;
  cta_en: string;
  cta_eo_draft: string;
  seo_title_en: string;
  seo_title_eo: string;
  meta_description_en: string;
  meta_description_eo_draft: string;
  spotify_initial: boolean;
  song_ids: string[];
  site_status: 'mvp';
  streaming_links: StreamingLinks;
}

export interface SiteFacts {
  artistName: string;
  tagline: string;
  temporaryCanonicalBase: string;
  finalDomainReady: boolean;
  disclosurePreferenceReady: boolean;
  publicBioReady: boolean;
  contactMethod: string | null;
  support: {
    enabled: boolean;
    url: string | null;
  };
  esperantoCopyApproved: boolean;
  startHerePlaylistUrl: string | null;
  launchNotes: string[];
}
