import type { ChangelogEntry } from '@/content/changelog';
import { ChangeItemRow } from './ChangeItemRow';

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
}

export function ChangelogEntryCard({ entry }: ChangelogEntryCardProps) {
  return (
    <article className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-12">
      {/* Date / version column */}
      <div className="md:pt-1">
        <p className="text-sm font-medium text-muted-foreground">
          {entry.date}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          v{entry.version}
        </p>
      </div>

      {/* Content column */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {entry.title}
          </h2>
          {entry.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.description}
            </p>
          )}
        </div>

        <ul className="space-y-2.5">
          {entry.items.map((item, index) => (
            <ChangeItemRow key={index} item={item} />
          ))}
        </ul>
      </div>
    </article>
  );
}
