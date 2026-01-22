const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
  output: 'standalone',
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
