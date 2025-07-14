import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Database Status - Anime Streaming',
  description: 'Database configuration and testing dashboard',
};

export default function DbStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
