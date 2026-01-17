import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Music, Search, Play, Pause, ShoppingCart, Download, Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface MusicTrack {
  id: string;
  creator_id: string;
  title: string;
  artist_name: string | null;
  audio_url: string;
  cover_url: string | null;
  duration: number | null;
  genre: string | null;
  bpm: number | null;
  price: number;
  license_type: string;
  downloads_count: number | null;
  created_at: string;
  creator_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const MusicMarketplace = () => {
  const { user, isCreator } = useAuth();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [ownedLicenses, setOwnedLicenses] = useState<Set<string>>(new Set());
  const [purchaseDialog, setPurchaseDialog] = useState<MusicTrack | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('music_tracks')
          .select('*')
          .eq('is_published', true)
          .order('downloads_count', { ascending: false });

        if (error) throw error;
        setTracks((data || []) as MusicTrack[]);
      } catch (e) {
        console.error('Error fetching tracks:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

  useEffect(() => {
    const fetchLicenses = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('music_licenses')
        .select('track_id')
        .eq('buyer_id', user.id);

      setOwnedLicenses(new Set((data || []).map(l => l.track_id)));
    };

    fetchLicenses();
  }, [user]);

  const filteredTracks = searchQuery.trim()
    ? tracks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tracks;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: number, licenseType: string) => {
    if (licenseType === 'free' || price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const playTrack = (track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef?.pause();
      setPlayingId(null);
    } else {
      audioRef?.pause();
      const audio = new Audio(track.audio_url);
      audio.play();
      audio.onended = () => setPlayingId(null);
      setAudioRef(audio);
      setPlayingId(track.id);
    }
  };

  const handlePurchase = async (track: MusicTrack) => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }

    try {
      // For free tracks, just create the license
      if (track.license_type === 'free' || track.price === 0) {
        const { error } = await supabase.from('music_licenses').insert({
          track_id: track.id,
          buyer_id: user.id,
          license_type: track.license_type,
          price_paid: 0,
        });

        if (error) throw error;

        // Update downloads count
        await supabase.from('music_tracks').update({
          downloads_count: (track.downloads_count || 0) + 1
        }).eq('id', track.id);

        setOwnedLicenses(prev => new Set([...prev, track.id]));
        toast({ title: 'License acquired!', description: 'You can now use this track in your shorts.' });
        setPurchaseDialog(null);
      } else {
        // TODO: Implement payment flow
        toast({ title: 'Payment required', description: 'Payment integration coming soon!' });
      }
    } catch (e: any) {
      console.error('Error purchasing:', e);
      toast({ title: 'Error', description: e?.message || 'Failed to acquire license', variant: 'destructive' });
    }
  };

  const getLicenseBadge = (type: string) => {
    switch (type) {
      case 'free': return <Badge variant="secondary">Free</Badge>;
      case 'standard': return <Badge className="bg-blue-500">Standard</Badge>;
      case 'premium': return <Badge className="bg-purple-500">Premium</Badge>;
      case 'exclusive': return <Badge className="bg-yellow-500 text-black">Exclusive</Badge>;
      default: return null;
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold text-foreground">Music Marketplace</h1>
            </div>
            {isCreator && (
              <Link to="/music/upload">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Sell Your Music
                </Button>
              </Link>
            )}
          </div>
          <p className="text-muted-foreground">License music for your shorts and videos</p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, artist, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTracks.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track) => {
              const isOwned = ownedLicenses.has(track.id);
              const isPlaying = playingId === track.id;

              return (
                <Card key={track.id} className="bg-card border-border overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    {track.cover_url ? (
                      <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-3 right-3 rounded-full w-12 h-12"
                      onClick={() => playTrack(track)}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist_name || 'Unknown Artist'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getLicenseBadge(track.license_type)}
                      {track.genre && <Badge variant="outline">{track.genre}</Badge>}
                      {track.bpm && <Badge variant="outline">{track.bpm} BPM</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(track.duration)} • {track.downloads_count || 0} downloads
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(track.price, track.license_type)}
                      </span>
                    </div>
                    {isOwned ? (
                      <Button variant="secondary" className="w-full" disabled>
                        <Download className="w-4 h-4 mr-2" />
                        Licensed
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => setPurchaseDialog(track)}>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {track.price === 0 ? 'Get Free License' : 'Purchase License'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Music className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No tracks found</h2>
            <p>Be the first to upload music!</p>
          </div>
        )}
      </div>

      <Dialog open={!!purchaseDialog} onOpenChange={() => setPurchaseDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>License "{purchaseDialog?.title}"</DialogTitle>
            <DialogDescription>
              {purchaseDialog?.license_type === 'free' 
                ? 'Get a free license to use this track in your shorts and videos.'
                : `Purchase a ${purchaseDialog?.license_type} license for ${formatPrice(purchaseDialog?.price || 0, purchaseDialog?.license_type || 'standard')}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Track</span>
              <span className="text-foreground">{purchaseDialog?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Artist</span>
              <span className="text-foreground">{purchaseDialog?.artist_name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">License Type</span>
              <span className="text-foreground capitalize">{purchaseDialog?.license_type}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{formatPrice(purchaseDialog?.price || 0, purchaseDialog?.license_type || 'free')}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPurchaseDialog(null)}>Cancel</Button>
            <Button onClick={() => purchaseDialog && handlePurchase(purchaseDialog)}>
              {purchaseDialog?.price === 0 ? 'Get License' : 'Complete Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default MusicMarketplace;
