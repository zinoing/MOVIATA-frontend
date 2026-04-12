/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: false,
  i18n: {
    locales: ['en', 'ko', 'ja'],
    defaultLocale: 'en',
  },
};

module.exports = nextConfig;