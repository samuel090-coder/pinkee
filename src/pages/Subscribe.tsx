import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, CreditCard, Shield, Sparkles, Crown, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useVideo } from '@/contexts/VideoContext';
import { toast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';

const Subscribe = () => {
  const { adminSettings, loading } = useVideo();
  const { formatMoney } = useCurrency();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast({
      title: 'Copied!',
      description: `${field} copied to clipboard`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const features = [
    'Access all premium videos',
    'Ad-free viewing experience',
    'Early access to new content',
    'Download videos for offline',
    'Exclusive behind-the-scenes',
    'Priority support',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Back Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to videos
          </Link>

          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center pink-glow"
              >
                <Crown className="w-10 h-10 text-primary" />
              </motion.div>
              
              <h1 className="font-display font-bold text-4xl md:text-5xl mb-4">
                <span className="text-gradient-pink">Upgrade</span> to Premium
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Unlock unlimited access to all our premium content and exclusive features
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Features Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="shiny-card rounded-2xl p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-display font-semibold text-xl">Premium Benefits</h2>
                </div>

                <ul className="space-y-4">
                  {features.map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-4xl text-gradient-pink">{formatMoney(5000, { maximumFractionDigits: 0 })}</span>
                    <span className="text-muted-foreground">/ month</span>
                  </div>
                </div>
              </motion.div>

              {/* Payment Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="shiny-card rounded-2xl p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-display font-semibold text-xl">Payment Details</h2>
                </div>

                {adminSettings ? (
                  <div className="space-y-4">
                    {/* Bank Name */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{adminSettings.bank_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(adminSettings.bank_name, 'Bank name')}
                        >
                          {copied === 'Bank name' ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Account Name */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{adminSettings.bank_account_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(adminSettings.bank_account_name, 'Account name')}
                        >
                          {copied === 'Account name' ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-2xl tracking-wider">
                          {adminSettings.bank_account_number}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(adminSettings.bank_account_number, 'Account number')}
                        >
                          {copied === 'Account number' ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Payment details loading...</p>
                )}

                <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Secure Payment</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        After making payment, send proof of payment to our support team. 
                        Your account will be activated within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-6 bg-primary pink-glow hover:bg-primary/90">
                  I've Made Payment
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;
