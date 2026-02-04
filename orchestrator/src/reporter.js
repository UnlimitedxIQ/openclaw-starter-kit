/**
 * Reporting adapter.
 *
 * In production, this should send updates back to the originating channel
 * (Telegram/Twilio/etc). In v1 starter code, we log to stdout.
 */

export function createReporter() {
  return {
    async taskQueued(task) {
      console.log(`[report] queued task=${task.taskId} channel=${task.channel}`);
    },

    async approvalRequested(task, approval) {
      console.log(`[report] approval requested task=${task.taskId} approvalId=${approval.approvalId} gate=${approval.gate}`);
    },

    async taskCompleted(task, result) {
      console.log(`[report] completed task=${task.taskId} summary=${result?.summary || ''}`);
    },

    async taskFailed(task, error) {
      console.log(`[report] failed task=${task.taskId} error=${error?.message || error || ''}`);
    }
  };
}
