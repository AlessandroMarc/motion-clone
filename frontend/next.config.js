/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Only apply proxy in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3003/api/:path*',
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
