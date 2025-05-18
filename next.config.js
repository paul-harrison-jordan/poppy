/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        child_process: false,
        http2: false,
        zlib: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 