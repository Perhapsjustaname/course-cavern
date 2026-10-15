import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Instructor applications carry up to five documents of 8 MB each. The
      // extra megabyte covers multipart boundaries and the text fields.
      bodySizeLimit: '41mb',
    },
  },
};

export default nextConfig;
