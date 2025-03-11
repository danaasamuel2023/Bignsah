/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set output mode to prevent static optimization issues
  output: 'server',
  // Only needed if you're also exporting some pages as static
  experimental: {
    appDir: true
  }
};

module.exports = nextConfig;