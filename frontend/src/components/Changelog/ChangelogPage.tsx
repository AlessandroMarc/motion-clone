import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { changelogEntries } from '@/content/changelog';
import { ChangelogEntryCard } from './ChangelogEntryCard';

export function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                N
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">Nexto</span>
          </div>
        </div>
      </header>

      {/* Page header */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <h1 className="text-4xl font-bold text-foreground">Changelog</h1>
        <p className="mt-2 text-muted-foreground">
          New updates and improvements to Nexto, most recent first.
        </p>
      </section>

      {/* Entries */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 space-y-12">
        {changelogEntries.map((entry, index) => (
          <div key={entry.version}>
            <ChangelogEntryCard entry={entry} />
            {index < changelogEntries.length - 1 && (
              <Separator className="mt-12" />
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
