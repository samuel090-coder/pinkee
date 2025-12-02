import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { VideoGrid } from '@/components/VideoGrid';
import { useVideo } from '@/contexts/VideoContext';

const Index = () => {
  const { videos } = useVideo();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary-foreground">
                Premium content available
              </span>
            </motion.div>

            <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl mb-6">
              <span className="text-foreground">Discover </span>
              <span className="text-gradient-pink neon-text">Amazing</span>
              <br />
              <span className="text-foreground">Videos</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Stream high-quality content instantly. No signup required for free videos. 
              Upgrade to premium for exclusive content.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <a 
                href="#videos"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold pink-glow hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Start Watching
              </a>
              <a 
                href="/subscribe"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-border bg-card/50 backdrop-blur-sm text-foreground font-semibold hover:bg-secondary transition-colors"
              >
                Go Premium
              </a>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16"
          >
            {[
              { value: '100+', label: 'Videos' },
              { value: '50K+', label: 'Views' },
              { value: '4.9', label: 'Rating' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-display font-bold text-3xl md:text-4xl text-gradient-pink">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-2">
              Trending Now
            </h2>
            <p className="text-muted-foreground">
              Watch our most popular videos
            </p>
          </motion.div>

          <VideoGrid videos={videos} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PlayStream. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
