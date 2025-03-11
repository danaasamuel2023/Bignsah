/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Add this to disable static generation for specific routes
    exportPathMap: async function (
      defaultPathMap,
      { dev, dir, outDir, distDir, buildId }
    ) {
      // Remove the verify-payment page from static generation
      const pathMap = { ...defaultPathMap };
      delete pathMap['/verify-payment'];
      return pathMap;
    }
  };
  
  module.exports = nextConfig;