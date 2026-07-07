export const GA4_MEASUREMENT_ID = 'G-K6Q30HHBH4';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'kantoj_analytics_consent';

export const ANALYTICS_EVENTS = ['listen_click', 'playlist_cta_click'] as const;
export const ANALYTICS_PARAMS = ['platform', 'entity_type', 'entity_id', 'lang', 'page_path'] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsParamName = (typeof ANALYTICS_PARAMS)[number];
