/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
    NEXT_PUBLIC_MARKETPLACE_ADDRESS: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
    NEXT_PUBLIC_DATA_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_DATA_REGISTRY_ADDRESS,
    NEXT_PUBLIC_PRICE_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS,
  },

  // Webpack configuration for ethers.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig