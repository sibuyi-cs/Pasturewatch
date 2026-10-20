export type FeedMode = 'demo' | 'live'

const FEED_KEY = 'pasturewatch.feed'

export function loadFeedMode(): FeedMode {
  return localStorage.getItem(FEED_KEY) === 'live' ? 'live' : 'demo'
}

export function saveFeedMode(mode: FeedMode) {
  localStorage.setItem(FEED_KEY, mode)
}
