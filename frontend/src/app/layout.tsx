import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LayoutWrapper } from '@/components/LayoutWrapper';
import { OnboardingProvider } from '@/components/Onboarding/OnboardingProvider';
import { MotionProvider } from '@/components/MotionProvider';
import { NavigationProgress } from '@/components/shared/NavigationProgress';
import './globals.css';
import * as Sentry from '@sentry/nextjs';

export const metadata: Metadata = {
  title: 'Nexto - Intelligent Scheduling',
  description:
    'Stop juggling calendars and to-do lists. Nexto automatically schedules your tasks around your life.',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  Sentry.logger.info('User triggered test log', { log_source: 'sentry_test' });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-body">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <OnboardingProvider>
              <MotionProvider>
                <NavigationProgress />
                <LayoutWrapper>{children}</LayoutWrapper>
              </MotionProvider>
              <Toaster
                position="bottom-right"
                richColors
                closeButton
                duration={3000}
                toastOptions={{
                  className:
                    'rounded-lg border shadow-lg backdrop-blur-sm',
                }}
              />
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
