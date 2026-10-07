import type { PluginLandingDefinition } from '../../apps/landing/content-types';

export const landingPage: PluginLandingDefinition = {
  route: '/apps/job-scheduler',
  name: 'Job Scheduler',
  shortName: 'Job',
  description: 'Schedule recurring or one-off jobs for AppWeaver to run later.',
  features: [
    'Schedule one-off or recurring prompts from the same app hub.',
    'Use natural language like "Run X each Monday at 8am" and AppWeaver creates the job in your timezone.',
    'Automate checks, reminders, publishing, and maintenance without leaving your workspace.',
  ],
  hasInteractiveDemo: true,
  installScreenshot: 'landing/assets/job-scheduler.png',
  assetAliases: [
    {
      source: 'landing/assets/overview.png',
      publicPath: '/screenshots/job.png',
    },
  ],
  demoStories: [
    {
      id: 'job-ai-create',
      label: 'Schedule a job with AI',
      variants: [
        {
          view: 'desktop',
          src: 'landing/assets/job-ai.gif',
          alt: 'Job Scheduler creating a scheduled job with AI',
          durationMs: 22380,
        },
        {
          view: 'mobile',
          src: 'landing/assets/job-ai-mobile.gif',
          alt: 'Job Scheduler mobile flow creating a scheduled job with AI',
          durationMs: 32260,
        },
      ],
    },
  ],
  presentation: null,
  roadmapRepoId: 'job',
};
