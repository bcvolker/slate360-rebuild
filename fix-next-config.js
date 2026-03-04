const fs = require('fs');

let content = fs.readFileSync('next.config.ts', 'utf-8');

const replacement = `const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Limits the number of workers to reduce memory consumption
    memoryBasedWorkersCount: true,
  },
  webpack: (config) => {`;

content = content.replace('const nextConfig: NextConfig = {\n  webpack: (config) => {', replacement);

fs.writeFileSync('next.config.ts', content);
