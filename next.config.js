/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 is a native module: keep it out of the webpack bundle.
    serverComponentsExternalPackages: ['better-sqlite3'],
    // Starts the background sensor engine when the server boots.
    instrumentationHook: true,
  },
}

module.exports = nextConfig
