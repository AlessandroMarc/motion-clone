'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import { usePathname } from 'next/navigation';
import { onboardingContent } from '@/content/content';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function OnboardingWelcomeBanner() {
  const { isOnboardingActive, status, skipOnboarding } = useOnboarding();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  // Mostra solo se siamo in calendar, onboarding attivo, step è null (primo accesso)
  if (
    !isOnboardingActive ||
    pathname !== '/calendar' ||
    status?.step !== null ||
    dismissed
  ) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleSkip = async () => {
    await skipOnboarding();
    setDismissed(true);
  };

  return (
    <div className="mb-6 p-6 bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            {onboardingContent.welcome.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {onboardingContent.welcome.description}
          </p>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/tasks">
                {onboardingContent.welcome.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip onboarding
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
