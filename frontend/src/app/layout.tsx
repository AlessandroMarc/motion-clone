import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Motion Clone',
  description: 'A Next.js app for task management',
};

export default function RootLayout({
  children,
}: any) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto md:pt-0 pt-16">{children}</main>
          </div>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
