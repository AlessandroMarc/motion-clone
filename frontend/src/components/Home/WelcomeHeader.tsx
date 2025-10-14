'use client';

import { Sparkles } from 'lucide-react';

interface WelcomeHeaderProps {
  apiMessage: string;
}

export function WelcomeHeader({ apiMessage }: WelcomeHeaderProps) {
  return (
    <div className="text-center mb-12">
      <div className="flex items-center justify-center mb-4">
        <Sparkles className="h-12 w-12 text-primary mr-3" />
        <h1 className="text-5xl font-bold text-foreground">
          Welcome to Motion Clone
        </h1>
      </div>
      <p className="text-xl text-muted-foreground mb-6">
        Your personal task management solution
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>API Connected: {apiMessage}</span>
      </div>
    </div>
  );
}
