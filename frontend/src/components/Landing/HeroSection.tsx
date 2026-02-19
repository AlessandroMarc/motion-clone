'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCalendarDemo } from './AnimatedCalendarDemo';
import type { landingContent as LandingContent } from '@/content/content';
import { subscriptionService } from '@/services/subscriptionService';
import { toast } from 'sonner';

interface HeroSectionProps {
  content: typeof LandingContent;
  user: { id: string } | null;
}

export function HeroSection({ content, user }: HeroSectionProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || isSubmitting) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await subscriptionService.subscribe(trimmedEmail);
      setIsSubscribed(true);
      toast.success('Thanks for subscribing!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Subscription failed:', err);

      if (
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('duplicate key')
      ) {
        setIsSubscribed(true);
        toast.success("We're taking care of you already!");
      } else {
        toast.error('Failed to subscribe. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse-subtle"
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="max-w-5xl mx-auto text-center">
        {/* Headline */}
        <h1
          className="animate-in text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-title tracking-tight text-foreground mb-6 leading-[1.1]"
          style={{ animationDelay: '0.1s' }}
        >
          {content.hero.headline.split(' ').map((word, i) => (
            <span
              key={i}
              className={cn(
                i === content.hero.headline.split(' ').length - 1 &&
                  'text-primary'
              )}
            >
              {word}{' '}
            </span>
          ))}
        </h1>

        {/* Subheadline */}
        <p
          className="animate-in text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ animationDelay: '0.2s' }}
        >
          {content.hero.subheadline}
        </p>

        {/* CTAs */}
        <div
          className="animate-in flex flex-col items-center justify-center gap-6"
          style={{ animationDelay: '0.3s' }}
        >
          {user ? (
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all rounded-full"
            >
              <Link href="/calendar">
                {content.nav.dashboard}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          ) : isSubscribed ? (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-2 text-primary font-semibold text-xl">
                <CheckCircle2 className="w-6 h-6" />
                You&apos;re on the list!
              </div>
              <p className="text-muted-foreground max-w-sm">
                Join our Slack community to share feedback, report bugs, and
                shape the product with us.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-4 h-16 px-12 text-lg font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all gap-3"
              >
                <a
                  href="https://join.slack.com/share/enQtMTA0OTMyMTIyMTgwMzctNmUxZjhlYzA0N2ZiZmRiZDVjMDNjMWE4ZjQ3MTkzNzBmZjg5YTkzYzY2ZDA3MmVjMTZhYWVmYzM5MzBhN2YzNw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.124a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.523v-2.52h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                  </svg>
                  Join Beta Testers on Slack
                </a>
              </Button>
              <Button
                variant="link"
                onClick={() => setIsSubscribed(false)}
                className="text-muted-foreground hover:text-primary mt-2"
              >
                Change email
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-lg mx-auto">
              <form
                onSubmit={handleSubscribe}
                className="relative flex flex-col sm:flex-row items-stretch gap-3 p-2 rounded-3xl bg-card border shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 transition-all"
              >
                <Input
                  type="email"
                  placeholder="Enter your email to get early access"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-14 px-6 bg-transparent border-none focus-visible:ring-0 text-lg flex-1 rounded-2xl"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="h-14 px-8 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 min-w-[160px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Join
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nexto is launching soon. Secure your spot now.
                </p>
                <span className="hidden sm:block text-muted-foreground/30">
                  |
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Animated Calendar Demo */}
        <div className="animate-in mt-20" style={{ animationDelay: '0.5s' }}>
          <AnimatedCalendarDemo />
        </div>
      </div>
    </section>
  );
}
