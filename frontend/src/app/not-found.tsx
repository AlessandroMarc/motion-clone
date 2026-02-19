import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <FileQuestion className="h-12 w-12 text-primary" />
          </div>
        </div>

        <h1 className="font-display mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Page not found
        </h1>

        <p className="font-body mb-8 mx-auto max-w-md text-lg text-muted-foreground">
          The page you're looking for doesn't exist or has been moved to a new
          location.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="default" size="lg" asChild className="min-w-[140px]">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>

          <Button variant="ghost" size="lg" asChild className="min-w-[140px]">
            <Link href="/tasks">
              <Search className="mr-2 h-4 w-4" />
              Find tasks
            </Link>
          </Button>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
