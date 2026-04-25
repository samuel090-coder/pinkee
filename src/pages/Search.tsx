import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Calendar,
  TrendingUp,
  Loader2,
  Users,
  Film,
  Tv as TvIcon,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { searchMulti, getTitle, getYear, getMediaType, poster } from '@/lib/tmdb';
import type { MediaItem } from '@/types/tmdb';

type SortType = 'relevance' | 'date' | 'views' | 'rating';
type DurationFilter = 'any' | 'short' | 'medium' | 'long';

interface ChannelResult {
  id: string;
  username: string | null;
  display_name: string | null;
  channel_name: string | null;
  avatar_url: string | null;
  subscriber_count: number | null;
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { videos, loading } = useVideo();

  const [sortBy, setSortBy] = useState<SortType>('relevance');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('any');

  const [channelResults, setChannelResults] = useState<ChannelResult[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  const [tmdbResults, setTmdbResults] = useState<MediaItem[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setChannelResults([]);
      return;
    }

    const run = async () => {
      setChannelsLoading(true);
      try {
        const like = `%${q}%`;
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, channel_name, avatar_url, subscriber_count')
          .or(`username.ilike.${like},display_name.ilike.${like},channel_name.ilike.${like}`)
          .order('subscriber_count', { ascending: false })
          .limit(8);

        if (error) throw error;
        setChannelResults((data || []) as ChannelResult[]);
      } catch (e) {
        console.error('Error searching channels:', e);
        setChannelResults([]);
      } finally {
        setChannelsLoading(false);
      }
    };

    run();
  }, [query]);

  // TMDb movie/TV search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setTmdbResults([]);
      return;
    }
    setTmdbLoading(true);
    searchMulti(q)
      .then((res) => {
        const filtered = (res.results || []).filter(
          (r: any) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        setTmdbResults(filtered.slice(0, 18));
      })
      .catch((e) => {
        console.error('TMDb search error:', e);
        setTmdbResults([]);
      })
      .finally(() => setTmdbLoading(false));
  }, [query]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const queryLower = query.toLowerCase();

    let results = videos.filter(v => {
      const titleMatch = v.title.toLowerCase().includes(queryLower);
      const descMatch = v.description?.toLowerCase().includes(queryLower);
      const categoryMatch = v.category?.toLowerCase().includes(queryLower);
      return titleMatch || descMatch || categoryMatch;
    });

    // Apply duration filter
    if (durationFilter !== 'any') {
      results = results.filter(v => {
        const mins = (v.duration || 0) / 60;
        switch (durationFilter) {
          case 'short': return mins < 4;
          case 'medium': return mins >= 4 && mins <= 20;
          case 'long': return mins > 20;
          default: return true;
        }
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'views':
        results.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'rating':
        results.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
      default:
        // Relevance - title matches first
        results.sort((a, b) => {
          const aTitle = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
          const bTitle = b.title.toLowerCase().includes(queryLower) ? 1 : 0;
          return bTitle - aTitle;
        });
    }

    return results;
  }, [videos, query, sortBy, durationFilter]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Search results for "{query}"
            </h1>
            <p className="text-sm text-muted-foreground">
              {tmdbResults.length + searchResults.length} results found
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border w-48">
                <DropdownMenuLabel>Duration</DropdownMenuLabel>
                {[
                  { value: 'any', label: 'Any duration' },
                  { value: 'short', label: 'Under 4 minutes' },
                  { value: 'medium', label: '4-20 minutes' },
                  { value: 'long', label: 'Over 20 minutes' },
                ].map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setDurationFilter(opt.value as DurationFilter)}
                    className={durationFilter === opt.value ? 'bg-secondary' : ''}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort by
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {[
                  { value: 'relevance', label: 'Relevance', icon: SearchIcon },
                  { value: 'date', label: 'Upload date', icon: Calendar },
                  { value: 'views', label: 'View count', icon: TrendingUp },
                  { value: 'rating', label: 'Rating', icon: TrendingUp },
                ].map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value as SortType)}
                    className={sortBy === opt.value ? 'bg-secondary' : ''}
                  >
                    <opt.icon className="w-4 h-4 mr-2" />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Movies & TV from TMDb */}
        {(tmdbLoading || tmdbResults.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Film className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Movies & TV Shows
              </h2>
            </div>

            {tmdbLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tmdbResults.map((item) => {
                  const type = getMediaType(item);
                  const to = type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`;
                  const title = getTitle(item);
                  const year = getYear(item);
                  const rating = (item as any).vote_average || 0;
                  return (
                    <Link key={`${type}-${item.id}`} to={to} className="group">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted relative">
                        <img
                          src={poster(item.poster_path)}
                          alt={title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] uppercase font-semibold flex items-center gap-1">
                          {type === 'tv' ? <TvIcon className="w-2.5 h-2.5" /> : <Film className="w-2.5 h-2.5" />}
                          {type}
                        </div>
                        {rating > 0 && (
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                            {rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground mt-1.5 line-clamp-1">{title}</p>
                      {year && <p className="text-[10px] text-muted-foreground">{year}</p>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Channel results */}
        {(channelsLoading || channelResults.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Channels
              </h2>
            </div>

            {channelsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {channelResults.map((c) => {
                  const name = c.channel_name || c.display_name || c.username || 'Channel';
                  const handle = c.username ? `@${c.username}` : '';
                  return (
                    <Link key={c.id} to={`/channel/${c.id}`}>
                      <Card className="bg-card border-border hover:bg-secondary/50 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={c.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {handle}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {searchResults.length > 0 ? (
          <div className="space-y-4">
            {searchResults.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <VideoCardNew video={video} variant="search" />
              </motion.div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No results found</h2>
            <p className="text-muted-foreground">
              Try different keywords or remove search filters
            </p>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
};

export default Search;
