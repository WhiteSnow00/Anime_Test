import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL && process.env.NODE_ENV === 'production') {
    return 'https://anime-kana.vercel.app';
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://ayaya-kana.id.vn';
  }
  return 'http://localhost:9002';
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: 'Hoa Thơm Kiêu Hãnh',
  description: 'Web coi anime thay gdrive!',
  openGraph: {
    title: 'Hoa Thơm Kiêu Hãnh',
    description: 'Web coi anime thay gdrive!',
    url: `${getBaseUrl()}/`,
    siteName: 'Ayaya Webpage',
    images: [
      {
        url: `${getBaseUrl()}/images/thumb.jpg`,
        width: 1536,
        height: 1099,
        alt: 'Web coi anime thay gdrive!',
        type: 'image/jpeg',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hoa Thơm Kiêu Hãnh',
    description: 'Web coi anime thay gdrive!',
    images: [`${getBaseUrl()}/images/thumb.jpg`],
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
