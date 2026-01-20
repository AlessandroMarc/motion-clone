/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow importing files from outside the Next.js app directory (e.g. repo-level /shared)
    externalDir: true,
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const rewrites = [
      // PostHog reverse proxy for analytics
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ];

    // Only apply API proxy in development
    if (process.env.NODE_ENV === 'development') {
      rewrites.push({
        source: '/api/:path*',
        destination: 'http://localhost:3003/api/:path*',
      });
    }
    return rewrites;
  },
};

module.exports = nextConfig;
