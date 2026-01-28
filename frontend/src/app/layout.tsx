import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LayoutWrapper } from '@/components/LayoutWrapper';
import { OnboardingProvider } from '@/components/Onboarding/OnboardingProvider';
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
              <LayoutWrapper>{children}</LayoutWrapper>
              <Toaster position="top-right" richColors />
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
