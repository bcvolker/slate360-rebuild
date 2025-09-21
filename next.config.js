/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Allow all public images without optimization
  },
};

module.exports = nextConfig;
