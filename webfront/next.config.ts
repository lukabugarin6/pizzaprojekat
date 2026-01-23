const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/media/uploads/:path*',
        destination: `${process.env.API_URL}/uploads/:path*`,
      },
    ];
  },
  output: 'standalone',
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
