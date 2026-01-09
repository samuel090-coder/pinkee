import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationPrompt } from '@/hooks/useNotificationPrompt';

export const NotificationPrompt = () => {
  const { showPrompt, handleSubscribe, handleDismiss } = useNotificationPrompt();

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop overlay for emphasis */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={handleDismiss}
          />
          
          {/* Bold centered prompt */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:w-[420px] z-50"
          >
            <div className="relative bg-card rounded-2xl p-6 border-2 border-primary/50 shadow-2xl shadow-primary/20 overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
              
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative z-10 text-center">
                {/* Animated bell icon */}
                <motion.div 
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, -10, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <Bell className="w-8 h-8 text-primary" />
                </motion.div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold text-xl text-foreground">
                    Never Miss New Videos!
                  </h3>
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                
                <p className="text-muted-foreground mb-6">
                  Be the first to know when new content drops. Get instant push notifications for all new videos!
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Button 
                    size="lg" 
                    onClick={handleSubscribe}
                    className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Notifications
                  </Button>
                  <Button 
                    size="lg" 
                    variant="ghost"
                    onClick={handleDismiss}
                    className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
