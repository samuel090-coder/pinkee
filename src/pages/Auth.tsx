import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Play, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const displayNameSchema = z.string().min(2).max(50);

const LAST_USER_KEY = 'pinkee:lastUser';

interface CachedUser {
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const Auth = () => {
  const [mode, setMode] = useState<'welcome' | 'login' | 'signup' | 'forgot'>('login');
  const [cached, setCached] = useState<CachedUser | null>(null);
  const [emailLookup, setEmailLookup] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const { toast } = useToast();
  const { signIn, signUp, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate(returnTo, { replace: true });
  }, [user, authLoading, navigate, returnTo]);

  // Boot: check cached user
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_USER_KEY);
      if (raw) {
        const parsed: CachedUser = JSON.parse(raw);
        setCached(parsed);
        setEmail(parsed.email);
        setMode('welcome');
      }
    } catch {}
  }, []);

  const lookupEmail = async (val: string) => {
    if (!val || !emailSchema.safeParse(val).success) return;
    setLookingUp(true);
    try {
      const { data } = await supabase.rpc('get_public_profile_by_email', { _email: val });
      if (data && data.length > 0) {
        const c: CachedUser = {
          email: val,
          display_name: data[0].display_name,
          username: data[0].username,
          avatar_url: data[0].avatar_url,
        };
        setCached(c);
        setEmail(val);
        setMode('welcome');
      }
    } finally {
      setLookingUp(false);
    }
  };

  const handleLogin = async () => {
    const eOk = emailSchema.safeParse(email).success;
    const pOk = passwordSchema.safeParse(password).success;
    if (!eOk || !pOk) {
      setErrors({ email: eOk ? undefined : 'Invalid email', password: pOk ? undefined : 'Min 6 characters' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Login failed', description: error.message });
      return;
    }
    // Cache for next time
    try {
      const { data: prof } = await supabase.from('profiles').select('display_name, username, avatar_url').eq('user_id', (await supabase.auth.getUser()).data.user?.id).maybeSingle();
      localStorage.setItem(LAST_USER_KEY, JSON.stringify({
        email,
        display_name: prof?.display_name ?? cached?.display_name ?? null,
        username: prof?.username ?? cached?.username ?? null,
        avatar_url: prof?.avatar_url ?? cached?.avatar_url ?? null,
      }));
    } catch {}
    toast({ title: 'Welcome back!' });
    navigate('/');
  };

  const handleSignup = async () => {
    if (!emailSchema.safeParse(email).success || !passwordSchema.safeParse(password).success || !displayNameSchema.safeParse(displayName).success) {
      toast({ variant: 'destructive', title: 'Check your inputs' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
    } else {
      toast({ title: 'Account created!' });
      navigate('/');
    }
  };

  const handleForgot = async () => {
    if (!emailSchema.safeParse(email).success) {
      toast({ variant: 'destructive', title: 'Enter a valid email' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not send', description: error.message });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
      setMode('login');
    }
  };

  const useDifferentAccount = () => {
    localStorage.removeItem(LAST_USER_KEY);
    setCached(null);
    setEmail('');
    setPassword('');
    setMode('login');
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <Button variant="ghost" onClick={() => navigate('/')} className="absolute top-6 left-6 z-10">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center pink-glow mb-3">
            <Play className="w-6 h-6 text-primary-foreground" fill="currentColor" />
          </div>
        </div>

        <div className="shiny-card rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {/* WELCOME BACK */}
            {mode === 'welcome' && cached && (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5 text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-primary/30">
                  {cached.avatar_url ? <img src={cached.avatar_url} alt="" className="w-full h-full object-cover" /> : (cached.display_name?.[0] ?? cached.email[0]?.toUpperCase())}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">{cached.display_name || 'Welcome back'}</h2>
                  {cached.username && <p className="text-sm text-muted-foreground">@{cached.username}</p>}
                </div>
                <div className="space-y-2 text-left">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-9 pr-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleLogin} disabled={loading} className="w-full py-6 rounded-xl bg-primary text-primary-foreground font-semibold pink-glow">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                </Button>
                <div className="flex justify-between text-sm">
                  <button onClick={() => setMode('forgot')} className="text-primary hover:underline">Forgot password?</button>
                  <button onClick={useDifferentAccount} className="text-muted-foreground hover:text-foreground">Not you?</button>
                </div>
              </motion.div>
            )}

            {/* LOGIN */}
            {mode === 'login' && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h2 className="text-2xl font-display font-bold text-center">Sign in</h2>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={(e) => lookupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9"
                    />
                    {lookingUp && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-9"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <Button onClick={handleLogin} disabled={loading} className="w-full py-6 rounded-xl bg-primary text-primary-foreground font-semibold pink-glow">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
                </Button>
                <div className="flex justify-between text-sm">
                  <button onClick={() => setMode('forgot')} className="text-primary hover:underline">Forgot password?</button>
                  <button onClick={() => setMode('signup')} className="text-muted-foreground hover:text-foreground">Create account</button>
                </div>
              </motion.div>
            )}

            {/* SIGNUP */}
            {mode === 'signup' && (
              <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h2 className="text-2xl font-display font-bold text-center">Create your account</h2>
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
                  </div>
                </div>
                <Button onClick={handleSignup} disabled={loading} className="w-full py-6 rounded-xl bg-primary text-primary-foreground font-semibold pink-glow">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create account'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Have an account?{' '}
                  <button onClick={() => setMode('login')} className="text-primary hover:underline">Sign in</button>
                </p>
              </motion.div>
            )}

            {/* FORGOT */}
            {mode === 'forgot' && (
              <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h2 className="text-2xl font-display font-bold text-center">Reset password</h2>
                <p className="text-sm text-muted-foreground text-center">Enter your email and we'll send you a reset link.</p>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                  </div>
                </div>
                <Button onClick={handleForgot} disabled={loading} className="w-full py-6 rounded-xl bg-primary text-primary-foreground font-semibold pink-glow">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
                </Button>
                <p className="text-center text-sm">
                  <button onClick={() => setMode(cached ? 'welcome' : 'login')} className="text-primary hover:underline">Back to sign in</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
