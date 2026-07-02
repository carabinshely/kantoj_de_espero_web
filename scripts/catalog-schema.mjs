export const SONG_KEYS = [
  'id', 'slug', 'title', 'title_en', 'title_eo', 'language', 'lyrics_eo',
  'hook_en', 'hook_eo_draft', 'description_en', 'description_eo_draft',
  'public_genres', 'public_moods', 'public_topics', 'playlist_slugs',
  'license_available', 'featured', 'site_status', 'streaming_links',
  'similar_song_ids', 'lyric_publication_policy'
];

export const PLAYLIST_KEYS = [
  'id', 'slug_en', 'slug_eo', 'title_en', 'title_eo', 'purpose', 'seo_intent',
  'intro_en', 'intro_eo_draft', 'cta_en', 'cta_eo_draft', 'seo_title_en',
  'seo_title_eo', 'meta_description_en', 'meta_description_eo_draft',
  'spotify_initial', 'song_ids', 'site_status', 'streaming_links'
];

export const FORBIDDEN_KEYS = [
  'source_file', 'tags_raw_private_reviewed', 'description_seed', 'public_tags_seed',
  'genres_seed', 'moods_seed', 'topics_seed', 'editorial_status', 'editorial_notes'
];

export const STREAMING_PLATFORMS = ['spotify', 'youtube_music', 'apple_music', 'deezer', 'amazon_music', 'hyperfollow'];
