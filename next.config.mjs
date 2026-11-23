/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/studio', destination: '/index.html' }];
  },
};

export default nextConfig;
