## Netflix-Style Platform Upgrade Plan

### Phase A: Foundation & API Setup
1. **Store TMDb API key** as environment variable (it's publishable, safe for client-side)
2. **Create TMDb API service** (`src/lib/tmdb.ts`) - centralized fetch with caching, types, and all endpoints (trending, popular, top-rated, upcoming, search, details, credits, videos, similar)
3. **Create TMDb types** (`src/types/tmdb.ts`) - Movie, TVShow, Cast, Genre, Video interfaces

### Phase B: Core Pages & Components
4. **Movies Home** (`/movies`) - Netflix-style hero banner with trending movie, carousels for: Trending, Popular, Top Rated, Upcoming, Nollywood, K-Drama
5. **Movie Details** (`/movie/:id`) - Poster, backdrop, rating, overview, cast, trailer (YouTube embed), similar titles, "Where to Watch" links
6. **TV Shows** (`/tv`) - Same carousel layout for TV series
7. **Search** - Enhanced with TMDb autocomplete, filters (genre/year/language)
8. **Movie Card Component** - Responsive card with hover effects, skeleton loader, optimized images

### Phase C: User Features
9. **Watchlist** - Save movies to database (logged in) or localStorage (guest)
10. **Recently Viewed** - Track and display last viewed movies
11. **Personalized Recommendations** - Based on genres of watched/liked content

### Phase D: UI/UX Polish
12. **Netflix-style navigation** - Add Movies/TV Shows tabs to nav
13. **Skeleton loaders** for all movie grids
14. **Smooth animations** with framer-motion
15. **Responsive design** optimized for mobile (360px viewport)

### Phase E: SEO & Monetization
16. **Dynamic meta tags** for movie pages
17. **Ad placements** integrated with existing ad system
18. **Affiliate links** in "Where to Watch" section

### What stays the same
- Existing video upload, shorts, music marketplace features remain
- User auth, profiles, subscriptions unchanged
- TMDb content lives alongside user-generated content

Shall I proceed?