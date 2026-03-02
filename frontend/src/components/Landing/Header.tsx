'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { landingContent as LandingContent } from '@/content/content';

interface HeaderProps {
  content: typeof LandingContent;
}

export function Header({ content }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            {content.nav.brand}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/changelog"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Changelog
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href="/calendar">
              Go to App
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
