import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://synqall.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/calls/',
          '/templates/',
          '/settings/',
          '/analytics/',
          '/team/',
          '/referrals/',
          '/api/',
          '/_next/',
          '/static/',
          '/admin/',
          '/partners/dashboard/',
        ],
      },
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: 'LinkedInBot',
        allow: '/',
      },
      {
        userAgent: 'WhatsApp',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}