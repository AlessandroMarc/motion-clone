'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { landingContent as LandingContent } from '@/content/content';

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
          <Button
            asChild
            size="lg"
            className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25"
          >
            <Link href="/calendar">
              {user ? content.nav.dashboard : 'Go to App'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {content.finalCta.note}
          </p>
        </div>
      </div>
    </section>
  );
}
