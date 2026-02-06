
// Kişisel portfolyo için basePath'i kaldır
const basePath = "";

const nextConfig = {
  basePath: basePath,
  // assetPrefix'i undefined bırakalım ki Next.js otomatik ayarlasın
  assetPrefix: undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true, // Önemli: Bu URL'lerin sonunda / olmasını sağlar
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/admin/index.html',
      },
    ];
  },
};

export default nextConfig;
