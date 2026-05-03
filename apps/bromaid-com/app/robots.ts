import type { MetadataRoute } from 'next';

import { siteUrl } from './_lib/site';

export const dynamic = 'force-static';

const aiCrawlers = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'GoogleOther',
  'Applebot',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'cohere-ai',
  'Amazonbot',
  'YouBot',
  'Diffbot',
  'DuckAssistBot',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Bytespider',
  'PetalBot',
  'MistralAI-User',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      ...aiCrawlers.map((ua) => ({
        userAgent: ua,
        allow: '/',
        disallow: ['/api/'],
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
