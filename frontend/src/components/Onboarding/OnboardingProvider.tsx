'use client';

import { useEffect, useState } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { usePathname } from 'next/navigation';
import { OnboardingProvider as OnboardingContextProvider } from '@/contexts/OnboardingContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { onboardingContent } from '@/content/content';

const tourSteps = [
  {
    selector: '[data-onboarding-step="create-task"]',
    content: (
      <div className="p-6 space-y-4">
        <h3 className="font-semibold text-xl mb-3">{onboardingContent.steps.createTask.title}</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          {onboardingContent.steps.createTask.description}
        </p>
      </div>
    ),
  },
  {
    selector: '[data-onboarding-step="create-project"]',
    content: (
      <div className="p-6 space-y-4">
        <h3 className="font-semibold text-xl mb-3">{onboardingContent.steps.createProject.title}</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          {onboardingContent.steps.createProject.description}
        </p>
      </div>
    ),
  },
  {
    selector: '[data-onboarding-step="schedule"]',
    content: (
      <div className="p-6 space-y-4">
        <h3 className="font-semibold text-xl mb-3">{onboardingContent.steps.schedule.title}</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          {onboardingContent.steps.schedule.description}
        </p>
      </div>
    ),
  },
];

function OnboardingTourController() {
  const { shouldShowTour, currentStep } = useOnboarding();
  const { setIsOpen, setCurrentStep, isOpen } = useTour();
  const pathname = usePathname();

  useEffect(() => {
    if (shouldShowTour && !isOpen) {
      let stepIndex = 0;
      
      if (pathname === '/tasks' && currentStep === null) {
        stepIndex = 0;
      } else if (pathname === '/projects' && currentStep === 'task_created') {
        stepIndex = 1;
      } else if (pathname === '/calendar' && currentStep === 'project_created') {
        stepIndex = 2;
      } else {
        return;
      }

      const timer = setTimeout(() => {
        const element = document.querySelector(tourSteps[stepIndex].selector);
        if (element) {
          setCurrentStep(stepIndex);
          setIsOpen(true);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [shouldShowTour, pathname, currentStep, setIsOpen, setCurrentStep, isOpen]);

  return null;
}

function OnboardingTourCloseHandler() {
  const { currentStep, updateStep, completeOnboarding } = useOnboarding();
  const { setIsOpen: _setIsOpen, isOpen } = useTour();
  const pathname = usePathname();
  const [wasOpen, setWasOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWasOpen(true);
    } else if (wasOpen && !isOpen) {
      // Il tour è stato chiuso dopo essere stato aperto, avanza allo step successivo
      setWasOpen(false);
      
      // Avanza allo step successivo basandosi sullo step corrente
      if (currentStep === null && pathname === '/tasks') {
        // Step 1 chiuso → avanza a step 2 (create project)
        // Il tour si aprirà automaticamente quando l'utente va su /projects
        updateStep('task_created');
      } else if (currentStep === 'task_created' && pathname === '/projects') {
        // Step 2 chiuso → avanza a step 3 (schedule)
        // Il tour si aprirà automaticamente quando l'utente va su /calendar
        updateStep('project_created');
      } else if (currentStep === 'project_created' && pathname === '/calendar') {
        // Step 3 chiuso → completa l'onboarding
        completeOnboarding();
      }
    }
  }, [isOpen, wasOpen, currentStep, pathname, updateStep, completeOnboarding]);

  return null;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingContextProvider>
      <TourProvider
        steps={tourSteps}
        afterOpen={(target) => {
          // Scroll to target element
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onClickClose={({ setIsOpen }) => {
          setIsOpen(false);
        }}
        styles={{
          popover: (base) => ({
            ...base,
            '--reactour-accent': 'hsl(var(--primary))',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }),
          maskArea: (base) => ({ ...base, rx: 8 }),
          badge: (base) => ({ ...base, left: 'auto', transform: 'none' }),
          controls: (base) => ({ ...base, marginTop: 20 }),
          close: (base) => ({ 
            ...base, 
            right: 8, 
            top: 8,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '14px',
            '&:hover': {
              backgroundColor: 'hsl(var(--muted))',
              color: 'hsl(var(--foreground))',
            },
          }),
        }}
        showCloseButton
        showNavigation={false}
        showBadge={false}
      >
        {children}
        <OnboardingTourController />
        <OnboardingTourCloseHandler />
      </TourProvider>
    </OnboardingContextProvider>
  );
}
