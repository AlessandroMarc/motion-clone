'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCalendarDemo } from './AnimatedCalendarDemo';
import type { landingContent as LandingContent } from '@/content/content';

interface HeroSectionProps {
  content: typeof LandingContent;
  user: { id: string } | null;
  loading: boolean;
  onGetStarted: () => void;
}

export function HeroSection({
  content,
  user,
  loading,
  onGetStarted,
}: HeroSectionProps) {
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
        {/* Badge */}
        <div className="animate-in mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          {content.hero.badge}
        </div>

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
          className="animate-in flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: '0.3s' }}
        >
          {user ? (
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <Link href="/calendar">
                {content.nav.dashboard}
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onGetStarted}
              disabled={loading}
              className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              {content.hero.primaryCta}
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base font-medium"
          >
            <a href="#how-it-works">{content.hero.secondaryCta}</a>
          </Button>
        </div>

        {/* Animated Calendar Demo */}
        <div className="animate-in mt-16" style={{ animationDelay: '0.5s' }}>
          <AnimatedCalendarDemo />
        </div>
      </div>
    </section>
  );
}
