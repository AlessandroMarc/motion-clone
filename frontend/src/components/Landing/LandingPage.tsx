'use client';

import { useAuth } from '@/contexts/AuthContext';
import { landingContent } from '@/content/content';
import { ScreenshotShowcase } from './ScreenshotShowcase';
import { HeroSection } from './HeroSection';
import {
  SellingPointsSection,
  FeaturesSection,
  BenefitsSection,
  HowItWorksSection,
  FinalCtaSection,
} from './ContentSections';

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
    <div className="landing-page min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection
        content={content}
        user={user}
        loading={loading}
        onGetStarted={handleGetStarted}
      />

      {/* Key Selling Points Section */}
      <SellingPointsSection content={content} />

      {/* App Screenshots Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              See It In Action
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A clean, intuitive interface designed to help you focus on what matters
            </p>
          </div>
          <ScreenshotShowcase />
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection content={content} />

      {/* Benefits / Stats Section */}
      <BenefitsSection content={content} />

      {/* How It Works Section */}
      <HowItWorksSection content={content} />

      {/* Final CTA Section */}
      <FinalCtaSection
        content={content}
        user={user}
        loading={loading}
        onGetStarted={handleGetStarted}
      />

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
