import { useMemo } from 'react';
import { Video } from '@/contexts/VideoContext';

/**
 * AI-inspired content recommendation algorithm.
 * Mixes content based on recency, engagement, and category diversity
 * to create a balanced, engaging feed.
 */

interface ScoredVideo extends Video {
  _score: number;
}

function getEngagementScore(video: Video): number {
  const views = video.views || 0;
  const likes = video.likes_count || 0;
  const comments = video.comments_count || 0;
  const reactions = video.reactions || 0;

  // Weighted engagement (likes matter more than views)
  return (views * 0.1) + (likes * 3) + (comments * 5) + (reactions * 2);
}

function getRecencyScore(video: Video): number {
  const now = Date.now();
  const publishedAt = video.published_at
    ? new Date(video.published_at).getTime()
    : new Date(video.created_at).getTime();
  const hoursAgo = (now - publishedAt) / (1000 * 60 * 60);

  // Exponential decay: newer content scores higher
  if (hoursAgo < 1) return 100;
  if (hoursAgo < 6) return 80;
  if (hoursAgo < 24) return 60;
  if (hoursAgo < 72) return 40;
  if (hoursAgo < 168) return 25; // 1 week
  return 10;
}

function getDiversityBoost(
  video: Video,
  recentCategories: string[],
  recentUploaders: string[]
): number {
  let boost = 0;
  const cat = (video.category || 'general').toLowerCase();
  const uploader = video.uploader_id || '';

  // Boost if category hasn't appeared recently
  if (!recentCategories.includes(cat)) boost += 15;
  // Boost if uploader hasn't appeared recently
  if (!recentUploaders.includes(uploader)) boost += 10;

  return boost;
}

/**
 * Sorts videos using a smart algorithm that balances:
 * - Recency (fresh content first)
 * - Engagement (popular content rises)
 * - Diversity (mix categories and uploaders)
 * - Random jitter (prevent staleness)
 */
export function useContentAlgorithm(
  videos: Video[],
  category: string = 'All'
): { longs: Video[]; shorts: Video[] } {
  return useMemo(() => {
    const published = videos.filter(v => v.is_published);

    // Filter by category
    const filtered = category === 'All'
      ? published
      : published.filter(v =>
          (v.category || '').toLowerCase() === category.toLowerCase()
        );

    const isShort = (v: Video) => {
      const dur = v.duration || 0;
      const cat = (v.category || '').toLowerCase();
      return cat === 'shorts' || (dur > 0 && dur <= 60);
    };

    const rawLongs = filtered.filter(v => !isShort(v));
    const rawShorts = filtered.filter(isShort);

    // Score and sort long videos
    const scoredLongs = scoreAndSort(rawLongs);
    const scoredShorts = scoreAndSort(rawShorts);

    return {
      longs: scoredLongs,
      shorts: scoredShorts,
    };
  }, [videos, category]);
}

function scoreAndSort(videos: Video[]): Video[] {
  if (videos.length === 0) return [];

  // Calculate base scores
  const scored: ScoredVideo[] = videos.map(v => ({
    ...v,
    _score: 0,
  }));

  // Normalize engagement scores
  const maxEngagement = Math.max(...scored.map(v => getEngagementScore(v)), 1);

  scored.forEach(v => {
    const engagementNorm = (getEngagementScore(v) / maxEngagement) * 40;
    const recency = getRecencyScore(v);
    // Small random jitter to prevent exact same ordering
    const jitter = Math.random() * 5;

    v._score = engagementNorm + recency + jitter;
  });

  // Sort by score descending
  scored.sort((a, b) => b._score - a._score);

  // Apply diversity re-ranking: prevent same category/uploader clustering
  const reranked: ScoredVideo[] = [];
  const remaining = [...scored];
  const recentCategories: string[] = [];
  const recentUploaders: string[] = [];
  const WINDOW = 3; // Look back 3 items for diversity

  while (remaining.length > 0) {
    // Score remaining with diversity boost
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < Math.min(remaining.length, 10); i++) {
      const boost = getDiversityBoost(remaining[i], recentCategories, recentUploaders);
      const totalScore = remaining[i]._score + boost;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    reranked.push(chosen);

    // Track recent categories/uploaders
    recentCategories.push((chosen.category || 'general').toLowerCase());
    recentUploaders.push(chosen.uploader_id || '');
    if (recentCategories.length > WINDOW) recentCategories.shift();
    if (recentUploaders.length > WINDOW) recentUploaders.shift();
  }

  return reranked;
}
