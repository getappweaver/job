import type { Database } from 'bun:sqlite';
import { z } from 'zod';

import { ResourceViewV1 } from '@src/capabilities/resource-view.v1';
import { SearchV1 } from '@src/capabilities/search.v1';
import { defineCapabilityProvider } from '@src/capabilities/types';
import type { WebNodeRoot } from '@src/web/ui-schema';

import { renderListWeb } from './commands/list/renderers/web';
import { getJob, listJobs } from './db';

type ProviderProps = {
  getDb: () => Database;
  alias: string;
  pluginName: string;
};

const CursorSchema = z.object({
  query: z.string(),
  offset: z.number().int().min(0).max(1000000),
});

type SearchJobRow = {
  id: number;
  name: string;
  schedule: string;
  schedule_description: string;
  prompt: string;
  enabled: number;
  execution_type: string;
  instructions: string | null;
  task_type: string;
  tool_alias: string | null;
  tool_name: string | null;
};

export function jobSearchProviders({
  getDb,
  alias,
  pluginName,
}: ProviderProps) {
  const resourceProviderId = `${pluginName}/resource-view/v1`;

  return [
    defineCapabilityProvider({
      contract: SearchV1,
      operations: {
        [SearchV1.operations.search.id]: ({ input }) => {
          const cursor =
            input.cursor === null
              ? { query: input.query, offset: 0 }
              : CursorSchema.parse(JSON.parse(input.cursor));

          if (cursor.query !== input.query) {
            throw new Error('Search cursor belongs to another query.');
          }

          const db = getDb();
          const escaped = input.query.replace(/[\\%_]/g, '\\$&');

          const rows = db
            .query(
              `SELECT
                 id,
                 name,
                 schedule,
                 schedule_description,
                 prompt,
                 enabled,
                 execution_type,
                 instructions,
                 task_type,
                 tool_alias,
                 tool_name
               FROM jobs
               WHERE name LIKE $query ESCAPE '\\'
                  OR prompt LIKE $query ESCAPE '\\'
                  OR schedule_description LIKE $query ESCAPE '\\'
                  OR schedule LIKE $query ESCAPE '\\'
                  OR instructions LIKE $query ESCAPE '\\'
                  OR tool_alias LIKE $query ESCAPE '\\'
                  OR tool_name LIKE $query ESCAPE '\\'
               ORDER BY
                 CASE WHEN lower(name) = lower($exact) THEN 0 ELSE 1 END,
                 enabled DESC,
                 next_run_at ASC NULLS LAST,
                 id DESC
               LIMIT $limit OFFSET $offset`,
            )
            .all({
              query: `%${escaped}%`,
              exact: input.query,
              limit: input.limit + 1,
              offset: cursor.offset,
            }) as SearchJobRow[];

          return {
            results: rows.slice(0, input.limit).map((row) => {
              const taskSummary =
                row.task_type === 'plugin-tool' &&
                row.tool_alias &&
                row.tool_name
                  ? `${row.tool_alias}:${row.tool_name}`
                  : row.prompt;

              return {
                id: String(row.id),
                text: (row.name || `Job #${row.id}`).slice(0, 1000),
                context: [
                  `#${row.id}`,
                  row.enabled ? 'enabled' : 'disabled',
                  row.execution_type === 'cron' ? 'cron' : 'one-time',
                  row.schedule_description || row.schedule,
                  taskSummary,
                ]
                  .filter(Boolean)
                  .join(' · ')
                  .slice(0, 2000),
                address: {
                  capability: ResourceViewV1.capability,
                  providerId: resourceProviderId,
                  resourceType: 'job',
                  resourceId: String(row.id),
                  surface: 'timeline' as const,
                },
              };
            }),
            nextCursor:
              rows.length > input.limit
                ? JSON.stringify({
                    query: input.query,
                    offset: cursor.offset + input.limit,
                  })
                : null,
            notices: [],
          };
        },
      },
    }),
    defineCapabilityProvider({
      contract: ResourceViewV1,
      operations: {
        [ResourceViewV1.operations.open.id]: ({ input }) => {
          const id = /^\d+$/.test(input.resourceId)
            ? Number(input.resourceId)
            : NaN;

          const db = getDb();

          const job =
            input.resourceType === 'job' && Number.isSafeInteger(id)
              ? getJob(db, id)
              : null;

          if (!job) {
            const view: WebNodeRoot = {
              kind: 'ui',
              version: 1,
              meta: { command: alias, subcommand: 'list' },
              tree: {
                type: 'text',
                value: 'Job not found. It may have been deleted.',
              },
            };

            return { status: 'not-found' as const, view };
          }

          const jobs = listJobs(db);

          return {
            status: 'found' as const,
            view: renderListWeb({
              command: alias,
              prefix: '/',
              jobs,
              focusedJobId: job.id,
            }),
          };
        },
      },
    }),
  ];
}
