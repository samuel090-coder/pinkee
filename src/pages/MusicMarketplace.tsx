import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Loader2, Music, Search, Play, Pause, ShoppingCart, Download, Plus,
  Upload, Bell, CheckCircle, XCircle, Copy
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
}

const MusicMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [ownedLicenses, setOwnedLicenses] = useState<Set<string>>(new Set());
  const [pendingPurchases, setPendingPurchases] = useState<Set<string>>(new Set());
  const [purchaseDialog, setPurchaseDialog] = useState<MusicTrack | null>(null);
  
  // Purchase flow state
  const [purchaseStep, setPurchaseStep] = useState<'info' | 'payment' | 'screenshot'>('info');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

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
      
      // Fetch owned licenses
      const { data: licenses } = await supabase
        .from('music_licenses')
        .select('track_id')
        .eq('buyer_id', user.id);

      setOwnedLicenses(new Set((licenses || []).map(l => l.track_id)));

      // Fetch pending purchase requests
      const { data: pending } = await supabase
        .from('sound_purchase_requests')
        .select('track_id')
        .eq('buyer_id', user.id)
        .eq('status', 'pending');

      setPendingPurchases(new Set((pending || []).map(p => p.track_id)));
    };

    fetchLicenses();

    // Subscribe to purchase request updates
    if (user) {
      const channel = supabase
        .channel('purchase-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sound_purchase_requests',
            filter: `buyer_id=eq.${user.id}`
          },
          (payload) => {
            const updated = payload.new as any;
            if (updated.status === 'approved') {
              toast({ 
                title: 'Purchase Approved! 🎉', 
                description: 'Your sound license is now active. Start creating!' 
              });
              setOwnedLicenses(prev => new Set([...prev, updated.track_id]));
              setPendingPurchases(prev => {
                const next = new Set(prev);
                next.delete(updated.track_id);
                return next;
              });
            } else if (updated.status === 'rejected') {
              toast({ 
                title: 'Purchase Rejected', 
                description: 'Please contact the artist for more information.',
                variant: 'destructive'
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
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

  const openPurchaseDialog = (track: MusicTrack) => {
    setPurchaseDialog(track);
    setPurchaseStep('info');
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleScreenshotSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleFreePurchase = async (track: MusicTrack) => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }

    try {
      const { error } = await supabase.from('music_licenses').insert({
        track_id: track.id,
        buyer_id: user.id,
        license_type: track.license_type,
        price_paid: 0,
      });

      if (error) throw error;

      await supabase.from('music_tracks').update({
        downloads_count: (track.downloads_count || 0) + 1
      }).eq('id', track.id);

      setOwnedLicenses(prev => new Set([...prev, track.id]));
      toast({ title: 'License acquired!', description: 'You can now use this track in your shorts.' });
      setPurchaseDialog(null);
    } catch (e: any) {
      console.error('Error:', e);
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    }
  };

  const handlePremiumPurchase = async () => {
    if (!user || !purchaseDialog || !screenshotFile) return;

    setSubmittingPurchase(true);

    try {
      // Upload screenshot
      const screenshotPath = `purchase-screenshots/${Date.now()}-${screenshotFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(screenshotPath, screenshotFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(screenshotPath);

      // Create purchase request
      const { error: insertError } = await supabase.from('sound_purchase_requests').insert({
        track_id: purchaseDialog.id,
        buyer_id: user.id,
        seller_id: purchaseDialog.creator_id,
        amount: purchaseDialog.price,
        screenshot_url: urlData.publicUrl,
        status: 'pending'
      });

      if (insertError) throw insertError;

      // Notify seller
      await supabase.from('user_notifications').insert({
        user_id: purchaseDialog.creator_id,
        type: 'purchase_request',
        title: 'New Sound Purchase Request! 💰',
        body: `Someone wants to purchase "${purchaseDialog.title}" for $${purchaseDialog.price}. Review and approve to grant access.`,
        link: '/studio/music',
        image_url: purchaseDialog.cover_url
      });

      setPendingPurchases(prev => new Set([...prev, purchaseDialog.id]));
      toast({ 
        title: 'Purchase request sent!', 
        description: 'The artist will be notified. You\'ll receive a notification once approved.' 
      });
      setPurchaseDialog(null);
    } catch (e: any) {
      console.error('Error:', e);
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
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
            {user && (
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
              const isPending = pendingPurchases.has(track.id);
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
                      <Link to={`/sound/${track.id}`}>
                        <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">
                          {track.title}
                        </h3>
                      </Link>
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
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Licensed
                      </Button>
                    ) : isPending ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Pending Approval
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => openPurchaseDialog(track)}>
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

      {/* Purchase Dialog */}
      <Dialog open={!!purchaseDialog} onOpenChange={() => setPurchaseDialog(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>
              {purchaseStep === 'info' && `License "${purchaseDialog?.title}"`}
              {purchaseStep === 'payment' && 'Payment Details'}
              {purchaseStep === 'screenshot' && 'Upload Payment Proof'}
            </DialogTitle>
            <DialogDescription>
              {purchaseStep === 'info' && (
                purchaseDialog?.license_type === 'free' 
                  ? 'Get a free license to use this track in your shorts and videos.'
                  : `Purchase a ${purchaseDialog?.license_type} license for ${formatPrice(purchaseDialog?.price || 0, purchaseDialog?.license_type || 'standard')}`
              )}
              {purchaseStep === 'payment' && 'Send payment to the artist using the bank details below'}
              {purchaseStep === 'screenshot' && 'Upload a screenshot of your payment as proof'}
            </DialogDescription>
          </DialogHeader>

          {/* Step: Info */}
          {purchaseStep === 'info' && (
            <>
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
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(purchaseDialog?.price || 0, purchaseDialog?.license_type || 'free')}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setPurchaseDialog(null)}>Cancel</Button>
                {purchaseDialog?.price === 0 ? (
                  <Button onClick={() => purchaseDialog && handleFreePurchase(purchaseDialog)}>
                    Get License
                  </Button>
                ) : (
                  <Button onClick={() => setPurchaseStep('payment')}>
                    Continue to Payment
                  </Button>
                )}
              </DialogFooter>
            </>
          )}

          {/* Step: Payment */}
          {purchaseStep === 'payment' && purchaseDialog && (
            <>
              <div className="space-y-4 py-4">
                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-foreground">Artist Bank Details</h4>
                  
                  {purchaseDialog.bank_name ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Bank Name</span>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">{purchaseDialog.bank_name}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(purchaseDialog.bank_name!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Account Name</span>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">{purchaseDialog.account_name}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(purchaseDialog.account_name!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Account Number</span>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">{purchaseDialog.account_number}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(purchaseDialog.account_number!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Amount to Send</span>
                        <span className="text-lg font-bold text-primary">${purchaseDialog.price}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      The artist hasn't added bank details yet. Please contact them directly.
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg">
                  <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>After making payment, upload a screenshot as proof. The artist will be notified and will approve your license.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setPurchaseStep('info')}>Back</Button>
                {purchaseDialog.bank_name && (
                  <Button onClick={() => setPurchaseStep('screenshot')}>
                    I've Made Payment
                  </Button>
                )}
              </DialogFooter>
            </>
          )}

          {/* Step: Screenshot */}
          {purchaseStep === 'screenshot' && (
            <>
              <div className="space-y-4 py-4">
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleScreenshotSelect(e.target.files[0])}
                />

                {screenshotPreview ? (
                  <div className="space-y-3">
                    <img 
                      src={screenshotPreview} 
                      alt="Payment proof" 
                      className="w-full max-h-64 object-contain rounded-lg border border-border"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => screenshotInputRef.current?.click()}
                    >
                      Change Screenshot
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => screenshotInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-medium">Click to upload screenshot</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setPurchaseStep('payment')}>Back</Button>
                <Button 
                  onClick={handlePremiumPurchase}
                  disabled={!screenshotFile || submittingPurchase}
                >
                  {submittingPurchase ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Submit for Approval
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default MusicMarketplace;
