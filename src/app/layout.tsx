import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Xem Anime Online',
  description: 'Web coi anime thay gdrive!',
  openGraph: {
    title: 'Xem Anime Online',
    description: 'Web coi anime thay gdrive!',
    url: 'http://ayaya-kana.id.vn/',
    siteName: 'Ayaya Webpage',
    images: [
      {
        url: 'public\images\thumb.jpg',
        width: 1200,
        height: 630,
        alt: 'Web coi anime thay gdrive!',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xem Anime Online',
    description: 'Web coi anime thay gdrive!',
    images: ['public\images\thumb.jpg'],
  },
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap&subset=latin,vietnamese" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
