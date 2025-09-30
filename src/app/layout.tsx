import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const getBaseUrl = () => {
  // For Vercel deployments, use the Vercel app URL directly
  if (process.env.VERCEL) {
    return 'https://anime-kana.vercel.app';
  }
  // Custom production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://ayaya-kana.id.vn';
  }
  // Local development
  return 'https://93d61f85463e.ngrok-free.app';
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
        width: 1200,
        height: 630,
        alt: 'Hoa Thơm Kiêu Hãnh - Web coi anime thay gdrive!',
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
    creator: '@ayaya_webpage',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthProvider } from '@/contexts/auth-context';
import TopNav from '@/components/top-nav';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <head>
        <meta property="og:image" content={`${getBaseUrl()}/images/thumb.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:logo" content={`${getBaseUrl()}/images/kaoruhana.jpg`} />
        <meta name="twitter:image" content={`${getBaseUrl()}/images/thumb.jpg`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;600;700;800&display=swap&subset=latin,vietnamese" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <AuthProvider>
          <TopNav />
          <div className="pt-0">{children}</div>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
