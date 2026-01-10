import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  Filter,
  SlidersHorizontal,
  Clock,
  Calendar,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useVideo } from '@/contexts/VideoContext';

type SortType = 'relevance' | 'date' | 'views' | 'rating';
type DurationFilter = 'any' | 'short' | 'medium' | 'long';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { videos, loading } = useVideo();

  const [sortBy, setSortBy] = useState<SortType>('relevance');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('any');

  // Filter and sort videos based on search query
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
              {searchResults.length} results found
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
        ) : (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No results found</h2>
            <p className="text-muted-foreground">
              Try different keywords or remove search filters
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
