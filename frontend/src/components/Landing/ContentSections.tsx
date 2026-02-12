'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Brain,
  Target,
  Calendar,
  RefreshCw,
  ArrowRight,
  Zap,
  Compass,
  Rocket,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { landingContent as LandingContent } from '@/content/content';
import { subscriptionService } from '@/services/subscriptionService';
import { toast } from 'sonner';

const iconMap = {
  Brain,
  Target,
  Calendar,
  RefreshCw,
  Compass,
  Rocket,
  Sparkles,
} as const;

interface SectionProps {
  content: typeof LandingContent;
}

// --- Selling Points Section ---

export function SellingPointsSection({ content }: SectionProps) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-16">
          {content.sellingPoints.items.map((point, index) => {
            const Icon = iconMap[point.icon as keyof typeof iconMap];
            const isEven = index % 2 === 0;
            return (
              <div
                key={point.id}
                className={cn(
                  'flex flex-col gap-8 items-center',
                  isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                )}
              >
                <div className="shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <div
                  className={cn(
                    'flex-1',
                    isEven ? 'md:text-left' : 'md:text-right',
                    'text-center'
                  )}
                >
                  <h3 className="text-2xl sm:text-3xl font-subheading text-foreground mb-4">
                    {point.title}
                  </h3>
                  <p className="font-body text-muted-foreground text-lg leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --- Features Section ---

export function FeaturesSection({ content }: SectionProps) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading text-foreground mb-4">
            {content.features.sectionTitle}
          </h2>
          <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto">
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
                    <h3 className="text-lg sm:text-xl font-label text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="font-body text-muted-foreground leading-relaxed">
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
  );
}

// --- Benefits Section ---

export function BenefitsSection({ content }: SectionProps) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-heading text-foreground text-center mb-16">
          {content.benefits.sectionTitle}
        </h2>
        <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
          {content.benefits.items.map(benefit => (
            <div key={benefit.id} className="text-center">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-title text-primary mb-2">
                {benefit.metric}
              </div>
              <p className="font-body text-muted-foreground text-lg">
                {benefit.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- How It Works Section ---

export function HowItWorksSection({ content }: SectionProps) {
  return (
    <section
      id="how-it-works"
      className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading text-foreground mb-4">
            {content.howItWorks.sectionTitle}
          </h2>
          <p className="font-body text-lg text-muted-foreground">
            {content.howItWorks.sectionSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {content.howItWorks.steps.map((step, index) => (
            <div key={step.number} className="relative">
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
  );
}

// --- Final CTA Section ---

export function FinalCtaSection({
  content,
  user,
}: {
  content: typeof LandingContent;
  user: { id: string } | null;
}) {
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
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25"
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
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
