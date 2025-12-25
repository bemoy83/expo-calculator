/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static export for GitHub Pages
  images: {
    unoptimized: true, // Required for static export
  },
  // Only apply basePath in production builds (for GitHub Pages)
  // In development, this will be undefined, so routes work at root
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/expo-calculator', // Matches your repository name
    assetPrefix: '/expo-calculator', // Should match basePath
  }),
};

module.exports = nextConfig;


