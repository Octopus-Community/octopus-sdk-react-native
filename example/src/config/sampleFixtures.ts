/**
 * Default content ids in the demo community the sample targets. Seeded demo content can
 * expire: if an id no longer resolves, override it through `example/.env`.
 * null means no default target exists for that entry yet.
 */
interface SampleFixtures {
  post: {
    text: string;
    reactionStack: string;
    image: string | null;
    poll: string | null;
    cta: string | null;
  };
  comment: { onPost: string; reported: string | null };
  user: { other: string };
  topic: { default: string; gated: string | null };
  deeplink: { post: string | null };
}

// Non-blank .env overrides win over the built-in defaults. The legacy DEMO_POST_ID
// overrides both post targets unless a dedicated reaction override is supplied.
// Babel inlines literal env reads: restart Metro with start:reset after editing
// .env (no native rebuild in development; release bundles must be rebuilt).
const postOverride = process.env.OCTOPUS_DEMO_POST_ID?.trim();

export const sampleFixtures: SampleFixtures = {
  post: {
    text: postOverride || 'SfEDTqxLavmbCEcEO6CBRp',
    reactionStack:
      process.env.OCTOPUS_QA_REACTION_POST_ID?.trim() ||
      postOverride ||
      'piWm_vjBa43SEOTexuz8ye',
    image: null,
    poll: null,
    cta: null,
  },
  comment: {
    onPost:
      process.env.OCTOPUS_QA_COMMENT_ID?.trim() || 'v_iqL4I1Scdfv3OfJeINO1',
    reported: null,
  },
  user: {
    other: process.env.OCTOPUS_QA_USER_ID?.trim() || 'FHjwxMQBGmSAD4KJxQk7uP',
  },
  topic: {
    default:
      process.env.OCTOPUS_QA_TOPIC_ID?.trim() || 'PMYFiz0sv6cKEcpMkq5qlT',
    gated: null,
  },
  deeplink: { post: null },
};
