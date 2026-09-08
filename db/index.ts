// ---------------------------------------------------------------------------
// plugins/job/db/index.ts — public DB API (split modules in this folder)
// ---------------------------------------------------------------------------

export { createJobRunActiveIndex, createJobTables } from './tables';
export { getNextRunAt, validateSchedule } from './cron-schedule';
export {
  getJobRunCount,
  createJob,
  listJobs,
  getJob,
  updateJobDetails,
  updateJobTask,
  deleteJob,
  updateJobSessionId,
  enableJob,
  disableJob,
  listDueJobs,
  updateJobRunTimes,
} from './jobs';
export { listJobRuns, insertJobRun, updateJobRun } from './runs';
export {
  appendJobRunLog,
  listJobLogs,
  recoverInterruptedJobRuns,
} from './logs';
export { openDb } from './open';
export {
  createSchedulerResourcesTable,
  createSchedulerResource,
  createSchedulerResourceForJob,
  linkSchedulerResourceToJob,
  getSchedulerResource,
  listSchedulerResources,
} from './scheduler-resources';
