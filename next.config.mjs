/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/studio', destination: '/studio.html' }];
  },
};

export default nextConfig;
