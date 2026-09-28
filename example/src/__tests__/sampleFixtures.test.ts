const fixtureEnvNames = [
  'OCTOPUS_DEMO_POST_ID',
  'OCTOPUS_QA_REACTION_POST_ID',
  'OCTOPUS_QA_COMMENT_ID',
  'OCTOPUS_QA_USER_ID',
  'OCTOPUS_QA_TOPIC_ID',
];

function loadFixtures(overrides: Record<string, string> = {}) {
  const previous = { ...process.env };
  try {
    for (const name of fixtureEnvNames) delete process.env[name];
    Object.assign(process.env, overrides);
    let fixtures!: typeof import('../config/sampleFixtures').sampleFixtures;
    jest.isolateModules(() => {
      fixtures = require('../config/sampleFixtures').sampleFixtures;
    });
    return fixtures;
  } finally {
    process.env = previous;
  }
}

it('uses built-in defaults for missing or blank overrides and keeps missing fixtures absent', () => {
  const fixtures = loadFixtures({ OCTOPUS_DEMO_POST_ID: '  ' });
  expect(fixtures.post.text).toBe('SfEDTqxLavmbCEcEO6CBRp');
  expect(fixtures.post.reactionStack).toBe('piWm_vjBa43SEOTexuz8ye');
  expect(fixtures.comment.onPost).toBe('v_iqL4I1Scdfv3OfJeINO1');
  expect(fixtures.user.other).toBe('FHjwxMQBGmSAD4KJxQk7uP');
  expect(fixtures.topic.default).toBe('PMYFiz0sv6cKEcpMkq5qlT');
  expect([
    fixtures.post.image,
    fixtures.post.poll,
    fixtures.post.cta,
    fixtures.comment.reported,
    fixtures.topic.gated,
    fixtures.deeplink.post,
  ]).toEqual(Array(6).fill(null));
});

it('preserves the legacy post override for both post consumers', () => {
  const fixtures = loadFixtures({ OCTOPUS_DEMO_POST_ID: ' other-post ' });
  expect(fixtures.post.text).toBe('other-post');
  expect(fixtures.post.reactionStack).toBe('other-post');
});

it('gives dedicated overrides priority, trimming ids before SDK calls', () => {
  const fixtures = loadFixtures({
    OCTOPUS_DEMO_POST_ID: 'other-post',
    OCTOPUS_QA_REACTION_POST_ID: ' reaction-post ',
    OCTOPUS_QA_COMMENT_ID: ' other-comment ',
    OCTOPUS_QA_USER_ID: ' other-user ',
    OCTOPUS_QA_TOPIC_ID: ' other-topic ',
  });
  expect(fixtures.post.text).toBe('other-post');
  expect(fixtures.post.reactionStack).toBe('reaction-post');
  expect(fixtures.comment.onPost).toBe('other-comment');
  expect(fixtures.user.other).toBe('other-user');
  expect(fixtures.topic.default).toBe('other-topic');
});
