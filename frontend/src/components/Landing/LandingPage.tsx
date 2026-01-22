'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { landingContent } from '@/content/landing';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Target,
  Calendar,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCalendarDemo } from './AnimatedCalendarDemo';

const iconMap = {
  Brain,
  Target,
  Calendar,
  RefreshCw,
} as const;

export function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const content = landingContent;

  const handleGetStarted = async () => {
    if (user) return;
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
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
          <h1 className="animate-in text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]" style={{ animationDelay: '0.1s' }}>
            {content.hero.headline.split(' ').map((word, i) => (
              <span
                key={i}
                className={cn(
                  i === content.hero.headline.split(' ').length - 1 && 'text-primary'
                )}
              >
                {word}{' '}
              </span>
            ))}
          </h1>

          {/* Subheadline */}
          <p className="animate-in text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animationDelay: '0.2s' }}>
            {content.hero.subheadline}
          </p>

          {/* CTAs */}
          <div className="animate-in flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.3s' }}>
            {user ? (
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Link href="/calendar">
                  {content.nav.dashboard}
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleGetStarted}
                disabled={loading}
                className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                {content.hero.primaryCta}
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-medium">
              <a href="#how-it-works">
                {content.hero.secondaryCta}
              </a>
            </Button>
          </div>

          {/* Animated Calendar Demo */}
          <div className="animate-in mt-16" style={{ animationDelay: '0.5s' }}>
            <AnimatedCalendarDemo />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {content.features.sectionTitle}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {content.features.sectionSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {content.features.items.map((feature, index) => {
              const Icon = iconMap[feature.icon as keyof typeof iconMap];
              return (
                <div
                  key={feature.id}
                  className={cn(
                    'group relative bg-card border rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1',
                    `stagger-${index + 1}`
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits / Stats Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-16">
            {content.benefits.sectionTitle}
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {content.benefits.items.map((benefit) => (
              <div key={benefit.id} className="text-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-2">
                  {benefit.metric}
                </div>
                <p className="text-muted-foreground text-lg">
                  {benefit.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {content.howItWorks.sectionTitle}
            </h2>
            <p className="text-lg text-muted-foreground">
              {content.howItWorks.sectionSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {content.howItWorks.steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < content.howItWorks.steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-xl font-bold mb-6 relative z-10">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-8">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {content.finalCta.headline}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
            {content.finalCta.subheadline}
          </p>
          <div className="flex flex-col items-center gap-4">
            {user ? (
              <Button asChild size="lg" className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25">
                <Link href="/calendar">
                  {content.nav.dashboard}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleGetStarted}
                disabled={loading}
                className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25"
              >
                {content.finalCta.primaryCta}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              {content.finalCta.note}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{content.footer.copyright}</p>
          <p>{content.footer.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
