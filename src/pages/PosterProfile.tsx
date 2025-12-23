import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Mail, MessageCircle, Send, MapPin, 
  Heart, User, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PosterProfile as PosterProfileType } from '@/contexts/VideoContext';

const PosterProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PosterProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('poster_profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Profile Not Found</h1>
        <p className="text-muted-foreground mb-4">This profile doesn't exist or has been removed.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Profile Card */}
          <div className="shiny-card rounded-2xl p-8 text-center">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="relative w-32 h-32 mx-auto mb-6"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-full h-full object-cover rounded-full ring-4 ring-primary/20"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <User className="w-16 h-16 text-primary" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center pink-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
            </motion.div>

            {/* Name */}
            <h1 className="font-display font-bold text-3xl mb-2">{profile.name}</h1>

            {/* Address */}
            {profile.address && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span>{profile.address}</span>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-foreground/80 max-w-md mx-auto mb-6 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Hobbies */}
            {profile.hobbies && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Interests & Hobbies
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {profile.hobbies.split(',').map((hobby, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                    >
                      {hobby.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Connect with me</h3>
              
              <div className="flex flex-wrap justify-center gap-3">
                {profile.email && (
                  <a href={`mailto:${profile.email}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                      <Mail className="w-4 h-4" />
                      Email
                    </Button>
                  </a>
                )}

                {profile.whatsapp && (
                  <a 
                    href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  </a>
                )}

                {profile.telegram && (
                  <a 
                    href={`https://t.me/${profile.telegram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all">
                      <Send className="w-4 h-4" />
                      Telegram
                    </Button>
                  </a>
                )}
              </div>

              {!profile.email && !profile.whatsapp && !profile.telegram && (
                <p className="text-sm text-muted-foreground">No contact info available</p>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PosterProfile;
