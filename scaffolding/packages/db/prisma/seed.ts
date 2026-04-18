import { PrismaClient, type TierName } from '@prisma/client';
import crypto from 'crypto';

const db = new PrismaClient();

// ==============================================================================
// Seed Data
// ==============================================================================

async function hashPassword(password: string): Promise<string> {
  // Simple SHA-256 for seed — use bcrypt in production auth
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seedUsers() {
  console.log('Seeding users...');
  const adminUser = await db.user.upsert({
    where: { email: 'admin@fvos.local' },
    update: {},
    create: {
      email: 'admin@fvos.local',
      name: 'Admin User',
      role: 'OWNER',
      passwordHash: await hashPassword('admin123!'),
      apiKey: `fvos_${crypto.randomBytes(24).toString('hex')}`,
    },
  });
  console.log(`  Created admin user: ${adminUser.email}`);
  return adminUser;
}

async function seedProviders() {
  console.log('Seeding AI providers...');

  const openai = await db.provider.upsert({
    where: { name: 'openai' },
    update: {},
    create: {
      name: 'openai',
      type: 'LLM',
      baseUrl: 'https://api.openai.com/v1',
      healthStatus: 'UNKNOWN',
      config: {
        rateLimitRpm: 10000,
        rateLimitTpd: 2000000,
        supportsStreaming: true,
      },
    },
  });

  const anthropic = await db.provider.upsert({
    where: { name: 'anthropic' },
    update: {},
    create: {
      name: 'anthropic',
      type: 'LLM',
      baseUrl: 'https://api.anthropic.com',
      healthStatus: 'UNKNOWN',
      config: {
        rateLimitRpm: 4000,
        rateLimitTpd: 400000,
        supportsStreaming: true,
      },
    },
  });

  const elevenlabs = await db.provider.upsert({
    where: { name: 'elevenlabs' },
    update: {},
    create: {
      name: 'elevenlabs',
      type: 'TTS',
      baseUrl: 'https://api.elevenlabs.io/v1',
      healthStatus: 'UNKNOWN',
      config: {
        supportsVoiceCloning: true,
        supportedLanguages: ['EN', 'ES'],
      },
    },
  });

  console.log(`  Created providers: openai, anthropic, elevenlabs`);

  // Seed AI Models
  const models = [
    // OpenAI models
    {
      providerId: openai.id,
      modelId: 'gpt-4o',
      taskTypes: ['SCRIPT_GENERATION', 'SCENE_GENERATION', 'IDEA_GENERATION', 'RECOMMENDATION'] as const,
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
      qualityScore: 92,
      latencyMs: 3500,
      maxTokens: 128000,
    },
    {
      providerId: openai.id,
      modelId: 'gpt-4o-mini',
      taskTypes: ['SCRIPT_GENERATION', 'TRANSLATION', 'ANALYTICS_SUMMARY', 'IDEA_GENERATION'] as const,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
      qualityScore: 78,
      latencyMs: 1500,
      maxTokens: 128000,
    },
    {
      providerId: openai.id,
      modelId: 'o3-mini',
      taskTypes: ['NICHE_RESEARCH', 'TREND_ANALYSIS', 'COMPETITOR_ANALYSIS'] as const,
      costPer1kInput: 0.0011,
      costPer1kOutput: 0.0044,
      qualityScore: 88,
      latencyMs: 5000,
      maxTokens: 200000,
    },
    // Anthropic models
    {
      providerId: anthropic.id,
      modelId: 'claude-sonnet-4-5',
      taskTypes: ['SCRIPT_GENERATION', 'SCENE_GENERATION', 'TRANSLATION', 'RECOMMENDATION'] as const,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
      qualityScore: 90,
      latencyMs: 3000,
      maxTokens: 200000,
    },
    {
      providerId: anthropic.id,
      modelId: 'claude-haiku-4-5',
      taskTypes: ['SCRIPT_GENERATION', 'TRANSLATION', 'ANALYTICS_SUMMARY'] as const,
      costPer1kInput: 0.00025,
      costPer1kOutput: 0.00125,
      qualityScore: 75,
      latencyMs: 1000,
      maxTokens: 200000,
    },
  ];

  for (const model of models) {
    await db.aIModel.upsert({
      where: { providerId_modelId: { providerId: model.providerId, modelId: model.modelId } },
      update: {},
      create: {
        providerId: model.providerId,
        modelId: model.modelId,
        taskTypes: model.taskTypes,
        costPer1kInput: model.costPer1kInput,
        costPer1kOutput: model.costPer1kOutput,
        qualityScore: model.qualityScore,
        latencyMs: model.latencyMs,
        maxTokens: model.maxTokens,
      },
    });
  }

  console.log(`  Created ${models.length} AI models`);
  return { openai, anthropic, elevenlabs };
}

async function seedTierProfiles() {
  console.log('Seeding tier profiles...');

  const tiers: Array<{ tierName: TierName; config: Record<string, unknown> }> = [
    {
      tierName: 'FREE',
      config: {
        monthlyBudgetUsd: 5,
        maxTaskCostUsd: 0.05,
        qualityTarget: 40,
        preferredModels: ['gpt-4o-mini', 'claude-haiku-4-5'],
        maxScriptWords: 500,
        maxVideosPerMonth: 4,
        maxResolution: '720p',
        autopilotAllowed: false,
        ttsProvider: 'aws-polly',
        features: {
          nicheResearch: false,
          competitorAnalysis: false,
          trendAnalysis: false,
          schedulePublish: false,
          multiLanguage: false,
        },
      },
    },
    {
      tierName: 'ECONOMICAL',
      config: {
        monthlyBudgetUsd: 25,
        maxTaskCostUsd: 0.15,
        qualityTarget: 55,
        preferredModels: ['gpt-4o-mini', 'claude-haiku-4-5'],
        maxScriptWords: 1000,
        maxVideosPerMonth: 12,
        maxResolution: '1080p',
        autopilotAllowed: false,
        ttsProvider: 'elevenlabs',
        features: {
          nicheResearch: true,
          competitorAnalysis: false,
          trendAnalysis: true,
          schedulePublish: true,
          multiLanguage: false,
        },
      },
    },
    {
      tierName: 'OPTIMIZED',
      config: {
        monthlyBudgetUsd: 75,
        maxTaskCostUsd: 0.5,
        qualityTarget: 70,
        preferredModels: ['gpt-4o', 'claude-sonnet-4-5'],
        maxScriptWords: 1500,
        maxVideosPerMonth: 30,
        maxResolution: '1080p',
        autopilotAllowed: true,
        ttsProvider: 'elevenlabs',
        features: {
          nicheResearch: true,
          competitorAnalysis: true,
          trendAnalysis: true,
          schedulePublish: true,
          multiLanguage: true,
        },
      },
    },
    {
      tierName: 'PREMIUM',
      config: {
        monthlyBudgetUsd: 200,
        maxTaskCostUsd: 2.0,
        qualityTarget: 85,
        preferredModels: ['gpt-4o', 'claude-sonnet-4-5'],
        maxScriptWords: 2000,
        maxVideosPerMonth: 90,
        maxResolution: '4K',
        autopilotAllowed: true,
        ttsProvider: 'elevenlabs',
        features: {
          nicheResearch: true,
          competitorAnalysis: true,
          trendAnalysis: true,
          schedulePublish: true,
          multiLanguage: true,
          customVoice: true,
          prioritySupport: true,
        },
      },
    },
    {
      tierName: 'ULTRA',
      config: {
        monthlyBudgetUsd: 1000,
        maxTaskCostUsd: 10.0,
        qualityTarget: 95,
        preferredModels: ['gpt-4o', 'claude-sonnet-4-5', 'o3-mini'],
        maxScriptWords: 3000,
        maxVideosPerMonth: -1, // unlimited
        maxResolution: '4K',
        autopilotAllowed: true,
        ttsProvider: 'elevenlabs',
        features: {
          nicheResearch: true,
          competitorAnalysis: true,
          trendAnalysis: true,
          schedulePublish: true,
          multiLanguage: true,
          customVoice: true,
          prioritySupport: true,
          whiteLabel: true,
          apiAccess: true,
          dedicatedSupport: true,
        },
      },
    },
  ];

  for (const tier of tiers) {
    await db.tierProfile.upsert({
      where: { tierName: tier.tierName },
      update: { configJson: tier.config },
      create: {
        tierName: tier.tierName,
        configJson: tier.config,
      },
    });
  }

  console.log(`  Created ${tiers.length} tier profiles`);
}

async function seedSampleBrandAndChannel(userId: string) {
  console.log('Seeding sample brand and channel...');

  const brand = await db.brand.upsert({
    where: { id: 'seed-brand-001' },
    update: {},
    create: {
      id: 'seed-brand-001',
      name: 'FacelessViral Demo Brand',
      ownerId: userId,
      niche: 'Personal Finance',
      toneDescription:
        'Authoritative but approachable. Speaks plainly about money without jargon. Uses relatable everyday examples. Motivational but realistic.',
      primaryLanguage: 'EN',
    },
  });

  const channel = await db.channel.upsert({
    where: { id: 'seed-channel-001' },
    update: {},
    create: {
      id: 'seed-channel-001',
      brandId: brand.id,
      userId,
      name: 'Wealth Simplified',
      platform: 'YOUTUBE',
      handle: '@wealthsimplified',
      status: 'SETUP',
      tier: 'ECONOMICAL',
      monthlyBudgetUsd: 25,
      autopilotEnabled: false,
    },
  });

  // Seed a content pillar
  await db.contentPillar.upsert({
    where: { id: 'seed-pillar-001' },
    update: {},
    create: {
      id: 'seed-pillar-001',
      channelId: channel.id,
      name: 'Budgeting Basics',
      description: 'Simple budgeting strategies for beginners',
      videoCount: 0,
      avgPerformanceScore: 0,
    },
  });

  console.log(`  Created brand: ${brand.name}`);
  console.log(`  Created channel: ${channel.name} (${channel.platform})`);
}

// ==============================================================================
// Main
// ==============================================================================

async function main() {
  console.log('Starting database seed...\n');

  const adminUser = await seedUsers();
  await seedProviders();
  await seedTierProfiles();
  await seedSampleBrandAndChannel(adminUser.id);

  console.log('\nSeed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
