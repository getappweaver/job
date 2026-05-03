import type {
  StoryChatState,
  StoryDefinition,
} from '@src/system/story-definition';
import { draftReviewPrompt } from '@src/web/widgets';

import { renderListWeb } from './commands/list/renderers/web';
import type { Job } from './types';

type JobStoryState = {
  chat: StoryChatState;
  jobs: Job[];
};

const emptyJobs = [] satisfies Job[];

const scheduledJob = {
  id: 301,
  name: 'Morning priority brief',
  execution_type: 'cron',
  schedule: '0 9 * * 1-5',
  schedule_description: 'Every weekday at 09:00',
  prompt:
    'Review open todos, identify the three highest priority items, and send a concise morning brief.',
  enabled: 1,
  created_at: 1714005000000,
  last_run_at: null,
  next_run_at: 1714381200000,
  backend: 'opencode',
  provider: 'local',
  model: 'default',
  mode: 'agent',
  workspace_target: 'bot',
  budget_sats: null,
  instructions:
    'Keep the brief actionable and include only items that can be started today.',
  run_at: null,
  max_runs: null,
  session_id: null,
} satisfies Job;

const aiPromptText =
  'Every weekday morning at 9, review my open todos and send me the top three priorities for the day.';

const aiDraftReviewText = `AI drafted this scheduled job:

type         : cron
schedule     : 0 9 * * 1-5
maxRuns      : -
name         : Morning priority brief
prompt       : Review open todos, identify the three highest priority items, and send a concise morning brief.
description  : Every weekday at 09:00
backend      : opencode
provider     : local
model        : default
mode         : agent
budget_sats  : -
instructions : Keep the brief actionable and include only items that can be started today.

Draft ID: demo-job-draft-1
a=accept, r=revise, d=decline, s=skip, q=quit`;

function buildJobListStoryCommandOutput(params: {
  prefix: string;
  alias: string;
  jobs: Job[];
}): NonNullable<StoryDefinition<JobStoryState>['commandOutput']> {
  return {
    text: null,
    web: renderListWeb({
      command: params.alias,
      prefix: params.prefix,
      jobs: params.jobs,
    }),
    clientView: null,
  };
}

function buildAiScheduleStory(params: {
  prefix: string;
  alias: string;
}): StoryDefinition<JobStoryState> {
  const story: StoryDefinition<JobStoryState> = {
    id: 'job-schedule-ai',
    title: 'Schedule a recurring agent job',
    description:
      'Use the Jobs widget AI prompt to draft and confirm a recurring agent workflow.',
    showcase: {
      title: 'Agents can work on a schedule',
      description:
        'Turn a natural-language request into a reviewed, recurring job that will run later without leaving the app.',
      timing: {
        initialDelayMs: 900,
        stepDelayMs: 2100,
        storyDelayMs: 2800,
      },
    },
    kind: 'ai',
    initialState: {
      chat: { messages: [] },
      jobs: emptyJobs,
    },
    sandbox: {
      job: {
        jobs: emptyJobs,
      },
      __outputs: {
        [`${params.alias}:list`]: [
          buildJobListStoryCommandOutput({
            prefix: params.prefix,
            alias: params.alias,
            jobs: emptyJobs,
          }).web,
          buildJobListStoryCommandOutput({
            prefix: params.prefix,
            alias: params.alias,
            jobs: [scheduledJob],
          }).web,
        ],
      },
      __prompts: {
        [`${params.alias}:ai`]: {
          type: 'web-prompt',
          value: draftReviewPrompt({
            command: params.alias,
            subcommand: 'ai',
            body: aiDraftReviewText,
          }),
        },
      },
      __transitions: [
        {
          on: { command: params.alias, subcommand: 'ai' },
          answer: 'a',
          advanceOutput: { command: params.alias, subcommand: 'list' },
        },
      ],
    },
    steps: [
      {
        type: 'seed_sandbox',
        state: {
          job: {
            jobs: emptyJobs,
          },
        },
      },
      {
        type: 'instruction',
        text: 'Open the Jobs widget from the header to create a scheduled workflow.',
        showcase: {
          title: 'Scheduled work starts as a focused app flow',
          description:
            'The Jobs plugin exposes a widget for creating, reviewing, and managing recurring agent tasks.',
        },
      },
      {
        type: 'focus_target',
        target: {
          type: 'header_widget',
          command: params.alias,
          subcommand: 'list',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'widget_opened',
          command: params.alias,
          subcommand: 'list',
        },
      },
      {
        type: 'instruction',
        text: 'Click Fill to describe the job in natural language.',
      },
      {
        type: 'fill_form',
        targetId: 'job-ai-prompt-text',
        showcase: {
          title: 'Describe the schedule and the work together',
          description:
            'The plugin turns timing, recurrence, and runtime instructions into a structured job draft.',
        },
        values: {
          arguments: { prompt: aiPromptText },
          options: {},
        },
      },
      {
        type: 'instruction',
        text: 'Click Run AI to generate the job draft.',
        showcase: {
          title: 'AI drafts, it does not silently mutate',
          description:
            'The generated job is reviewed before it is added to the scheduler.',
          delayMs: 1500,
        },
      },
      {
        type: 'focus_target',
        target: {
          type: 'web_node',
          targetId: 'job-ai-prompt-submit',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'target_clicked',
          targetId: 'job-ai-prompt-submit',
        },
      },
      {
        type: 'instruction',
        text: 'Click Accept on the draft review to schedule the job.',
        showcase: {
          title: 'Review scheduled automation before it goes live',
          description:
            'Confirm the cron schedule, prompt, execution context, and budget before the job is stored.',
        },
      },
      {
        type: 'focus_target',
        target: {
          type: 'web_node',
          targetId: 'draft-review-accept',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'target_clicked',
          targetId: 'draft-review-accept',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'command_completed',
          command: params.alias,
          subcommand: 'ai',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'command_completed',
          command: params.alias,
          subcommand: 'list',
        },
      },
      {
        type: 'complete',
        cleanup: {
          closeWidgets: [
            {
              command: params.alias,
              subcommand: 'list',
            },
          ],
        },
      },
    ],
  };

  story.commandOutput = buildJobListStoryCommandOutput({
    prefix: params.prefix,
    alias: params.alias,
    jobs: [scheduledJob],
  });

  return story;
}

export function jobStories(
  prefix: string,
  alias: string,
): StoryDefinition<unknown>[] {
  return [buildAiScheduleStory({ prefix, alias })];
}
