const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/media/uploads/:path*',
        destination: `${process.env.API_URL}/uploads/:path*`,
      },
      {
        source: '/api_backend/:path*',
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
