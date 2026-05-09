/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests to the backend in dev
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;