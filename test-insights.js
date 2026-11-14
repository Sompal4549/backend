const dotenv = require('dotenv');
dotenv.config();
const { resolveIntegrations, getSearchConsoleSummary } = require('./dist/services/integration-settings.service.js');
async function test() {
  const creds = await resolveIntegrations();
  console.log('Creds SC URL:', creds.searchConsoleSiteUrl, 'has SA:', !!creds.serviceAccount);
  const summary = await getSearchConsoleSummary(creds);
  console.log('Clicks:', summary.clicks, 'Impressions:', summary.impressions, 'CTR:', summary.ctr, 'Position:', summary.position);
  console.log('Queries count:', summary.queries?.length);
  if (summary.queries?.length) {
    console.log('Top query:', summary.queries[0]);
  }
}
test().catch(console.error);

