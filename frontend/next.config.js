/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // reactStrictMode di dev = double render saat HMR.
  // Aktifkan hanya di production build supaya CI tetap cek warning.
  reactStrictMode: isProd,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // Tree-shake lucide-react (21 MB) dan react-leaflet juga di dev mode.
  // Lucide punya ~1500 icon — tanpa ini, dev compile harus proses semuanya
  // walau cuma 3-4 yang dipakai per file. HMR jadi jauh lebih cepat.
  experimental: {
    optimizePackageImports: ["lucide-react", "react-leaflet"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
