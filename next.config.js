/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Allow Vercel to use Node.js server for API routes
  // No static export - we need SSR for NextAuth
}

module.exports = nextConfig