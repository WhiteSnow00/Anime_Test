import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
  },
  webpack: (config, { isServer }) => {
    // Fix for MongoDB in Next.js - exclude problematic modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        net: false,
        dns: false,
        fs: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
        buffer: require.resolve('buffer'),
        events: require.resolve('events'),
      };
    }
    
    // Exclude MongoDB server-side modules from client bundle
    config.externals = config.externals || [];
    config.externals.push({
      'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      'aws4': 'commonjs aws4',
      'mongodb-connection-string-url': 'commonjs mongodb-connection-string-url',
    });
    
    return config;
  },
};

export default nextConfig;
