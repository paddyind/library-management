/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedForwardedHosts: ['localhost', '127.0.0.1']
    }
  }
}

module.exports = nextConfig
