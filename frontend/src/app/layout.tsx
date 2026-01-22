import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LayoutWrapper } from '@/components/LayoutWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexto - Intelligent Scheduling',
  description: 'Stop juggling calendars and to-do lists. Nexto automatically schedules your tasks around your life.',
};

export default function RootLayout({
  children,
}: any) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
