/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static export for GitHub Pages
  images: {
    unoptimized: true, // Required for static export
  },
  basePath: '/expo-calculator', // Matches your repository name
  assetPrefix: '/expo-calculator', // Should match basePath
};

module.exports = nextConfig;


