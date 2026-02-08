import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VideoProvider } from "@/contexts/VideoContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import ExploreCategory from "./pages/ExploreCategory";
import Shorts from "./pages/Shorts";
import Analytics from "./pages/Analytics";
import Subscribe from "./pages/Subscribe";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import PosterProfile from "./pages/PosterProfile";
import Watch from "./pages/Watch";
import Upload from "./pages/Upload";
import Channel from "./pages/Channel";
import Channels from "./pages/Channels";
import Studio from "./pages/Studio";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import WatchLater from "./pages/WatchLater";
import LikedVideos from "./pages/LikedVideos";
import Subscriptions from "./pages/Subscriptions";
import Report from "./pages/Report";
import Help from "./pages/Help";
import MusicMarketplace from "./pages/MusicMarketplace";
import MusicUpload from "./pages/MusicUpload";
import ArtistDashboard from "./pages/ArtistDashboard";
import SoundDetail from "./pages/SoundDetail";
import Monetization from "./pages/Monetization";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <VideoProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <NotificationPrompt />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />

                <Route path="/explore" element={<Explore />} />
                <Route path="/shorts" element={<Shorts />} />
                <Route path="/trending" element={<ExploreCategory title="Trending" sort="views" />} />
                <Route path="/music" element={<ExploreCategory title="Music" category="Music" />} />
                <Route path="/gaming" element={<ExploreCategory title="Gaming" category="Gaming" />} />
                <Route path="/news" element={<ExploreCategory title="News" category="News & Politics" />} />
                <Route path="/sports" element={<ExploreCategory title="Sports" category="Sports" />} />
                <Route path="/learning" element={<ExploreCategory title="Learning" category="Education" />} />
                <Route path="/podcasts" element={<ExploreCategory title="Podcasts" category="Podcasts" />} />

                <Route path="/subscribe" element={<Subscribe />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/history" element={<History />} />

                <Route path="/playlists" element={<Playlists />} />
                <Route path="/playlists/:id" element={<PlaylistDetail />} />
                <Route path="/watch-later" element={<WatchLater />} />
                <Route path="/liked" element={<LikedVideos />} />

                <Route path="/admin" element={<Admin />} />
                <Route path="/poster/:id" element={<PosterProfile />} />
                <Route path="/watch/:id" element={<Watch />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/channel/:id" element={<Channel />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/search" element={<Search />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/report" element={<Report />} />
                <Route path="/help" element={<Help />} />

                {/* Music Marketplace */}
                <Route path="/music-marketplace" element={<MusicMarketplace />} />
                <Route path="/music/upload" element={<MusicUpload />} />
                <Route path="/studio/music" element={<ArtistDashboard />} />
                <Route path="/studio/monetization" element={<Monetization />} />
                <Route path="/sound/:id" element={<SoundDetail />} />
                <Route path="/wallet" element={<Wallet />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </VideoProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
