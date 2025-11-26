// jobs/reportCron.js
// Schedules periodic report generation (daily). Requires `node-cron`.
const cron = require('node-cron');
const reportService = require('../services/reportService');
const { connectToNetwork, GUEST_FABRIC_ID } = require('../utils/fabricHelper');

// Run daily at 05:00
cron.schedule('0 5 * * *', async () => {
  console.log('[reportCron] Running daily report job');
  let conn;
  try {
    conn = await connectToNetwork(GUEST_FABRIC_ID);
    const entry = await reportService.generateReport(conn, { type: 'daily', format: 'xlsx', period: 'daily' });
    console.log('[reportCron] Generated report', entry);
  } catch (err) {
    console.error('[reportCron] Error generating report', err);
  } finally {
    if (conn && conn.gateway) conn.gateway.disconnect();
  }
});

console.log('[reportCron] Scheduler initialized (daily @05:00)');
