'use client';

import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
