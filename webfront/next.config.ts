const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${process.env.MEDIA_ORIGIN}/:path*`,
      },
    ];
  },
  output: 'standalone',
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
