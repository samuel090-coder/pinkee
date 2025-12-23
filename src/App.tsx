import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VideoProvider } from "@/contexts/VideoContext";
import Index from "./pages/Index";
import Subscribe from "./pages/Subscribe";
import Admin from "./pages/Admin";
import PosterProfile from "./pages/PosterProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <VideoProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/poster/:id" element={<PosterProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </VideoProvider>
  </QueryClientProvider>
);

export default App;
