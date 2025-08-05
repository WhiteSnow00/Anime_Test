import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Hoa Thơm Kiêu Hãnh',
  description: 'Web coi anime thay gdrive!',
  openGraph: {
    title: 'Hoa Thơm Kiêu Hãnh',
    description: 'Web coi anime thay gdrive!',
    siteName: 'Ayaya Webpage',
    images: [
      {
        url: '/images/thumb.jpg',
        width: 1536,
        height: 1099,
        alt: 'Web coi anime thay gdrive!',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hoa Thơm Kiêu Hãnh',
    description: 'Web coi anime thay gdrive!',
    images: ['/images/thumb.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;600;700;800&family=Open+Sans:wght@400;500;600;700;800&display=swap&subset=latin,vietnamese" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
