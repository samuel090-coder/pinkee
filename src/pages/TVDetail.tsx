import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Calendar, Play, ExternalLink, Loader2, ArrowLeft, Plus, Check, Tv, X, Maximize, RotateCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { MovieRow } from '@/components/movies/MovieRow';
import { IframePlayerShield } from '@/components/movies/IframePlayerShield';
import {
  getTVDetail, getTVCredits, getTVVideos,
  getSimilarTV, getTVWatchProviders,
  backdrop, posterLg, profile as profileImg,
} from '@/lib/tmdb';
import type { TMDbTVDetail, TMDbCast, TMDbVideo, TMDbWatchProviders, TMDbTVShow, MediaItem } from '@/types/tmdb';

const STREAM_SERVERS = [
  { name: 'Embed.su', url: (id: number, s: number, e: number) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
  { name: 'AutoEmbed', url: (id: number, s: number, e: number) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc.to', url: (id: number, s: number, e: number) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc.cc', url: (id: number, s: number, e: number) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', url: (id: number, s: number, e: number) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
];

const TVDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [show, setShow] = useState<TMDbTVDetail | null>(null);
  const [cast, setCast] = useState<TMDbCast[]>([]);
  const [trailer, setTrailer] = useState<TMDbVideo | null>(null);
  const [similar, setSimilar] = useState<TMDbTVShow[]>([]);
  const [providers, setProviders] = useState<TMDbWatchProviders | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeServer, setActiveServer] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [rotated, setRotated] = useState(false);
  const playerWrapRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = () => {
    const el = playerWrapRef.current;
    if (!el) return;
    const req = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).webkitEnterFullscreen;
    if (req) req.call(el);
  };

  useEffect(() => {
    if (rotated) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [rotated]);

  useEffect(() => {
    if (!id) return;
    const tvId = parseInt(id);
    setLoading(true);
    setShowPlayer(false);

    const wl: number[] = JSON.parse(localStorage.getItem('tv_watchlist') || '[]');
    setInWatchlist(wl.includes(tvId));

    const rv: number[] = JSON.parse(localStorage.getItem('recently_viewed_tv') || '[]');
    localStorage.setItem('recently_viewed_tv', JSON.stringify([tvId, ...rv.filter(x => x !== tvId)].slice(0, 20)));

    Promise.all([
      getTVDetail(tvId),
      getTVCredits(tvId),
      getTVVideos(tvId),
      getSimilarTV(tvId),
      getTVWatchProviders(tvId),
    ]).then(([s, c, v, sim, wp]) => {
      setShow(s);
      setCast(c.cast.slice(0, 12));
      setTrailer(v.results.find(x => x.type === 'Trailer' && x.site === 'YouTube') || v.results[0] || null);
      setSimilar(sim.results.slice(0, 10));
      setProviders(wp.results?.NG || wp.results?.US || null);
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const toggleWatchlist = () => {
    if (!id) return;
    const tvId = parseInt(id);
    const wl: number[] = JSON.parse(localStorage.getItem('tv_watchlist') || '[]');
    const next = inWatchlist ? wl.filter(x => x !== tvId) : [...wl, tvId];
    localStorage.setItem('tv_watchlist', JSON.stringify(next));
    setInWatchlist(!inWatchlist);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!show) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Show not found</p>
          <Link to="/tv-shows"><Button variant="outline">Back to TV Shows</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const tvId = parseInt(id!);
  const totalSeasons = show.number_of_seasons || 1;
  const currentSeasonData = show.seasons?.find(s => s.season_number === selectedSeason);
  const totalEpisodes = currentSeasonData?.episode_count || 24;

  return (
    <MainLayout>
      <div className="pb-20">
        {showPlayer && (
          <div className="w-full bg-black">
            <div className="container max-w-6xl mx-auto">
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-200 text-center">
                Free streams may show pop-up ads. For an ad-free experience, install <a href="https://ublockorigin.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">uBlock Origin</a> or use <a href="https://brave.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Brave Browser</a>.
              </div>
              <div ref={playerWrapRef} className="relative w-full aspect-video bg-black">
                <IframePlayerShield
                  src={STREAM_SERVERS[activeServer].url(tvId, selectedSeason, selectedEpisode)}
                  iframeKey={`${tvId}-${activeServer}-s${selectedSeason}e${selectedEpisode}`}
                />
              </div>

              {rotated && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                  <div
                    className="bg-black"
                    style={{
                      width: '100vh',
                      height: '100vw',
                      transform: 'rotate(90deg)',
                      transformOrigin: 'center center',
                    }}
                  >
                    <div className="relative w-full h-full">
                      <IframePlayerShield
                        src={STREAM_SERVERS[activeServer].url(tvId, selectedSeason, selectedEpisode)}
                        iframeKey={`${tvId}-${activeServer}-s${selectedSeason}e${selectedEpisode}-rot`}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="fixed top-3 right-3 z-[101] h-9 gap-1"
                    onClick={() => setRotated(false)}
                  >
                    <X className="w-4 h-4" /> Exit
                  </Button>
                </div>
              )}
              <div className="flex flex-col gap-2 px-2 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedSeason}
                    onChange={e => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                    className="bg-secondary text-foreground text-xs rounded px-2 py-1.5 border-none outline-none"
                  >
                    {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
                      <option key={s} value={s}>Season {s}</option>
                    ))}
                  </select>
                  <select
                    value={selectedEpisode}
                    onChange={e => setSelectedEpisode(Number(e.target.value))}
                    className="bg-secondary text-foreground text-xs rounded px-2 py-1.5 border-none outline-none"
                  >
                    {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map(ep => (
                      <option key={ep} value={ep}>Episode {ep}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground ml-auto">
                    S{selectedSeason} E{selectedEpisode}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" className="text-xs h-8 gap-1" onClick={enterFullscreen}>
                    <Maximize className="w-3.5 h-3.5" /> Fullscreen
                  </Button>
                  <Button size="sm" variant="secondary" className="text-xs h-8 gap-1" onClick={() => setRotated(r => !r)}>
                    <RotateCw className="w-3.5 h-3.5" /> Rotate
                  </Button>
                  <div className="flex items-center gap-1.5 overflow-x-auto ml-auto">
                    {STREAM_SERVERS.map((s, i) => (
                      <Button
                        key={s.name}
                        size="sm"
                        variant={activeServer === i ? 'default' : 'secondary'}
                        className="text-xs h-8 px-2.5 whitespace-nowrap"
                        onClick={() => setActiveServer(i)}
                      >
                        {s.name}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" className="text-white h-8" onClick={() => setShowPlayer(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  Tip: The <strong>bottom strip of the player is always tappable</strong> — use it to press play and unmute the speaker icon. Then your phone's volume keys will control sound. The middle of the video is shielded to block ad redirects.
                </div>
              </div>
            </div>
          </div>
        )}

        {!showPlayer && (
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9]">
            <img src={backdrop(show.backdrop_path)} alt={show.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
            <Link to="/tv-shows" className="absolute top-4 left-4 z-10">
              <Button variant="ghost" size="icon" className="bg-black/30 text-white hover:bg-black/50 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        )}

        <div className={`container max-w-6xl mx-auto px-4 ${!showPlayer ? '-mt-32' : 'mt-4'} relative z-10`}>
          <div className="flex flex-col sm:flex-row gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0 w-40 sm:w-56 mx-auto sm:mx-0">
              <img src={posterLg(show.poster_path)} alt={show.name} className="w-full rounded-xl shadow-2xl" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 space-y-3">
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground">{show.name}</h1>
              {show.tagline && <p className="text-muted-foreground italic">{show.tagline}</p>}

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {show.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-foreground font-semibold">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {show.vote_average.toFixed(1)}
                  </span>
                )}
                {show.first_air_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(show.first_air_date).getFullYear()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Tv className="w-4 h-4" />
                  {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {show.genres.map(g => (
                  <span key={g.id} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">{g.name}</span>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  className="rounded-full gap-2 bg-primary text-primary-foreground"
                  onClick={() => { setShowPlayer(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Watch Now
                </Button>
                {trailer && (
                  <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="rounded-full gap-2">
                      <Play className="w-4 h-4" />
                      Trailer
                    </Button>
                  </a>
                )}
                <Button variant="outline" className="rounded-full gap-2" onClick={toggleWatchlist}>
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {inWatchlist ? 'In Watchlist' : 'Watchlist'}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed pt-2">{show.overview}</p>
            </motion.div>
          </div>

          {cast.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-foreground mb-3">Cast</h2>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {cast.map(c => (
                  <div key={c.id} className="flex-shrink-0 w-24 text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mx-auto">
                      <img src={profileImg(c.profile_path)} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-medium text-foreground mt-1.5 line-clamp-1">{c.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {providers && (providers.flatrate || providers.rent || providers.buy) && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-foreground mb-3">Also Available On</h2>
              <div className="flex flex-wrap gap-3">
                {[...(providers.flatrate || []), ...(providers.rent || []), ...(providers.buy || [])].map(p => (
                  <div key={p.provider_id} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
                    <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} className="w-6 h-6 rounded" />
                    <span className="text-sm text-foreground">{p.provider_name}</span>
                  </div>
                ))}
              </div>
              {providers.link && (
                <a href={providers.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2">
                  View all options <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </section>
          )}
        </div>

        {similar.length > 0 && (
          <div className="mt-8">
            <MovieRow title="Similar Shows" items={similar as MediaItem[]} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TVDetail;
