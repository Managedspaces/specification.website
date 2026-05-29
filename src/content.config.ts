import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const sourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  publisher: z.string().optional(),
});

const spec = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/spec' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    category: z.enum([
      'foundations',
      'seo',
      'accessibility',
      'security',
      'well-known',
      'agent-readiness',
      'performance',
      'privacy',
      'resilience',
      'i18n',
    ]),
    summary: z.string(),
    status: z
      .enum(['required', 'recommended', 'optional', 'avoid'])
      .default('recommended'),
    appliesTo: z.array(z.string()).default(['all']),
    relatedSlugs: z.array(z.string()).default([]),
    sources: z.array(sourceSchema).default([]),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    updated: z.string().optional(),
  }),
});

export const collections = { spec };
