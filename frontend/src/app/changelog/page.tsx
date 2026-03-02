import type { Metadata } from 'next';
import { ChangelogPage } from '@/components/Changelog';

export const metadata: Metadata = {
  title: 'Changelog – Nexto',
  description: 'New updates and improvements to Nexto, most recent first.',
};

export default function Changelog() {
  return <ChangelogPage />;
}
