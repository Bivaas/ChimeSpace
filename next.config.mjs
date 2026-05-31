/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@excalidraw/excalidraw'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  headers: async () => {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
        "worker-src 'self' blob:",
        "img-src 'self' https://lh3.googleusercontent.com https://res.cloudinary.com data: blob:",
        "connect-src 'self' https://unpkg.com https://api.cloudinary.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://unpkg.com https://fonts.gstatic.com https://excalidraw.com https://esm.sh",
        "img-src 'self' https://lh3.googleusercontent.com https://res.cloudinary.com data: blob:",
        "connect-src 'self' https://unpkg.com https://api.cloudinary.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
].join('; '),
      },
    ];

    return [
      {
        // Apply to all route
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

