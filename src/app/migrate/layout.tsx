import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Database Migration - Anime Streaming',
  description: 'Migrate from PostgreSQL to MongoDB',
};

export default function MigrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
