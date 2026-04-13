export function toneForPlainReply(text: string): 'info' | 'success' | 'error' {
  if (text.startsWith('Usage:')) {
    return 'error';
  }

  if (text.startsWith('Failed')) {
    return 'error';
  }

  if (text.startsWith('Run failed:')) {
    return 'error';
  }

  if (text.includes('requires an agent backend')) {
    return 'error';
  }

  if (text.includes('## Jobs') || text.startsWith('Pending drafts:')) {
    return 'info';
  }

  if (text.startsWith('History for ')) {
    return 'info';
  }

  if (text.startsWith('No jobs.')) {
    return 'info';
  }

  if (text.startsWith('No pending drafts.')) {
    return 'info';
  }

  if (text.startsWith('No runs yet for ')) {
    return 'info';
  }

  return 'success';
}
