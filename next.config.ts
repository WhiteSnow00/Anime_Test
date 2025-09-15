import type {NextConfig} from 'next';
import withLinaria from 'next-with-linaria';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200],
    formats: ['image/webp', 'image/avif'],
    unoptimized: false,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    loader: 'default',
  },
  // Linaria configuration
  linaria: {
    displayName: process.env.NODE_ENV !== 'production',
    sourceMap: process.env.NODE_ENV !== 'production',
    classNameSlug: '[title]_[hash]',
    babelOptions: {
      presets: ['next/babel'],
    },
  },
};

// Apply Linaria wrapper to existing config
export default withLinaria(nextConfig);
