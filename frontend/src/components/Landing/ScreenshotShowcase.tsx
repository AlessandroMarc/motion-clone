'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarDays, LayoutGrid, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

const APP_SCREENSHOTS = [
  {
    src: '/screenshots/Scheduling Screen.png',
    alt: 'Nexto Calendar View - Smart scheduling interface',
    title: 'Smart Scheduling',
    description:
      'Your week at a glance with intelligently auto-scheduled tasks that adapt to your calendar',
    icon: CalendarDays,
  },
  {
    src: '/screenshots/Task Screen.png',
    alt: 'Nexto Task Board - Kanban view organized by project',
    title: 'Task Management',
    description:
      'Organize and visualize all your tasks by project with our intuitive Kanban board',
    icon: LayoutGrid,
  },
  {
    src: '/screenshots/Project Screen.png',
    alt: 'Nexto Project View - Project details and linked tasks',
    title: 'Project Overview',
    description:
      'Track progress, manage deadlines, and keep all project tasks in one place',
    icon: FolderKanban,
  },
];

export function ScreenshotShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScreenshot = APP_SCREENSHOTS[activeIndex];
  const ActiveIcon = activeScreenshot.icon;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Large Preview */}
      <div className="flex-1 w-full">
        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl">
          {/* Browser-like header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <div className="flex-1 mx-4">
              <div className="max-w-md mx-auto h-6 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                nexto.app
              </div>
            </div>
          </div>

          {/* Main Image */}
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={activeScreenshot.src}
              alt={activeScreenshot.alt}
              fill
              className="object-cover object-top transition-all duration-500"
              sizes="(max-width: 1024px) 100vw, 70vw"
              priority
            />
          </div>
        </div>

        {/* Active Screenshot Info - Desktop */}
        <div className="hidden lg:flex items-start gap-4 mt-6 p-4 rounded-xl bg-card border">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ActiveIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {activeScreenshot.title}
            </h3>
            <p className="text-muted-foreground">
              {activeScreenshot.description}
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnails Sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="flex lg:flex-col gap-4">
          {APP_SCREENSHOTS.map((screenshot, index) => {
            const Icon = screenshot.icon;
            const isActive = index === activeIndex;
            return (
              <button
                key={screenshot.src}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'group flex-1 lg:flex-none text-left transition-all duration-300 rounded-xl overflow-hidden border',
                  isActive
                    ? 'ring-2 ring-primary shadow-lg bg-card'
                    : 'hover:shadow-md hover:border-primary/50 bg-card/50'
                )}
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-video lg:aspect-16/10 overflow-hidden">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    className={cn(
                      'object-cover object-top transition-all duration-300',
                      !isActive && 'group-hover:scale-105'
                    )}
                    sizes="(max-width: 1024px) 33vw, 280px"
                  />
                  {/* Overlay for inactive */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-colors" />
                  )}
                </div>

                {/* Thumbnail Info */}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium transition-colors',
                        isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    >
                      {screenshot.title}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Screenshot Info - Mobile */}
        <div className="lg:hidden mt-6 p-4 rounded-xl bg-card border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {activeScreenshot.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeScreenshot.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
