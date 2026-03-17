import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const protoSrc = readFileSync(join(root, 'proto/worldmonitor/trade/v1/get_tariff_trends.proto'), 'utf-8');
const tradeDataProtoSrc = readFileSync(join(root, 'proto/worldmonitor/trade/v1/trade_data.proto'), 'utf-8');
const seedSrc = readFileSync(join(root, 'scripts/seed-supply-chain-trade.mjs'), 'utf-8');
const panelSrc = readFileSync(join(root, 'src/components/TradePolicyPanel.ts'), 'utf-8');
const serviceSrc = readFileSync(join(root, 'src/services/trade/index.ts'), 'utf-8');
const clientGeneratedSrc = readFileSync(join(root, 'src/generated/client/worldmonitor/trade/v1/service_client.ts'), 'utf-8');
const serverGeneratedSrc = readFileSync(join(root, 'src/generated/server/worldmonitor/trade/v1/service_server.ts'), 'utf-8');

function extractFunctionBlock(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]+?\\n\\}`, 'm'));
  assert.ok(match, `Could not extract function ${name}`);
  return match[0];
}

const parseBudgetLabEffectiveTariffHtml = new Function(`
  const BUDGET_LAB_TARIFFS_URL = 'https://budgetlab.yale.edu/research/tracking-economic-effects-tariffs';
  ${extractFunctionBlock(seedSrc, 'htmlToPlainText')}
  ${extractFunctionBlock(seedSrc, 'toIsoDate')}
  ${extractFunctionBlock(seedSrc, 'parseBudgetLabEffectiveTariffHtml')}
  return parseBudgetLabEffectiveTariffHtml;
`)();

describe('Trade tariff proto contract', () => {
  it('adds EffectiveTariffRate message to shared trade data', () => {
    assert.match(tradeDataProtoSrc, /message EffectiveTariffRate/);
    assert.match(tradeDataProtoSrc, /string source_name = 1;/);
    assert.match(tradeDataProtoSrc, /double tariff_rate = 5;/);
  });

  it('adds optional effective_tariff_rate to GetTariffTrendsResponse', () => {
    assert.match(protoSrc, /EffectiveTariffRate effective_tariff_rate = 4;/);
  });
});

describe('Generated tariff types', () => {
  it('client types expose an optional effectiveTariffRate snapshot', () => {
    assert.match(clientGeneratedSrc, /effectiveTariffRate\?: EffectiveTariffRate/);
  });

  it('server types expose an optional effectiveTariffRate snapshot', () => {
    assert.match(serverGeneratedSrc, /effectiveTariffRate\?: EffectiveTariffRate/);
  });

  it('trade service re-exports EffectiveTariffRate', () => {
    assert.match(serviceSrc, /export type \{[^}]*EffectiveTariffRate/);
  });
});

describe('Budget Lab effective tariff seed integration', () => {
  it('uses the Yale Budget Lab tariff tracking page as the effective-rate source', () => {
    assert.match(seedSrc, /https:\/\/budgetlab\.yale\.edu\/research\/tracking-economic-effects-tariffs/);
    assert.match(seedSrc, /function parseBudgetLabEffectiveTariffHtml/);
  });

  it('attaches the effective tariff snapshot only to the US tariff payload', () => {
    assert.match(seedSrc, /reporter === '840' && usEffectiveTariffRate/);
  });

  it('keeps restrictions snapshot labeled as WTO MFN baseline data', () => {
    assert.match(seedSrc, /measureType: 'WTO MFN Baseline'/);
    assert.match(seedSrc, /description: `WTO MFN baseline: \$\{value\.toFixed\(1\)\}%`/);
  });

  it('parses tariff rate, observation period, and updated date from Budget Lab HTML', () => {
    const html = `
      <html>
        <body>
          <div>Updated: March 2, 2026</div>
          <p>U.S. consumers face tariff changes, raising the effective tariff rate reaching 9.9% in December 2025.</p>
        </body>
      </html>
    `;

    assert.deepEqual(parseBudgetLabEffectiveTariffHtml(html), {
      sourceName: 'Yale Budget Lab',
      sourceUrl: 'https://budgetlab.yale.edu/research/tracking-economic-effects-tariffs',
      observationPeriod: 'December 2025',
      updatedAt: '2026-03-02',
      tariffRate: 9.9,
    });
  });

  it('returns null when the Budget Lab page does not expose a recognizable rate', () => {
    assert.equal(parseBudgetLabEffectiveTariffHtml('<html><body><p>No tariff data here.</p></body></html>'), null);
  });
});

describe('Trade policy tariff panel', () => {
  it('renames the misleading Restrictions tab to Overview', () => {
    assert.match(panelSrc, /components\.tradePolicy\.overview/);
    assert.match(panelSrc, /components\.tradePolicy\.noOverviewData/);
  });

  it('labels the WTO series as an MFN baseline', () => {
    assert.match(panelSrc, /components\.tradePolicy\.baselineMfnTariff/);
    assert.match(panelSrc, /components\.tradePolicy\.mfnAppliedRate/);
  });

  it('shows effective tariff and gap cards when coverage exists', () => {
    assert.match(panelSrc, /components\.tradePolicy\.effectiveTariffRateLabel/);
    assert.match(panelSrc, /components\.tradePolicy\.gapLabel/);
    assert.match(panelSrc, /components\.tradePolicy\.effectiveMinusBaseline/);
  });

  it('keeps a graceful MFN-only fallback for countries without effective-rate coverage', () => {
    assert.match(panelSrc, /components\.tradePolicy\.noEffectiveCoverageForCountry/);
  });

  it('clarifies on the Restrictions tab that WTO figures are baselines, not live tariff burden', () => {
    assert.match(panelSrc, /components\.tradePolicy\.overviewNoteNoEffective/);
    assert.match(panelSrc, /components\.tradePolicy\.overviewNoteTail/);
  });

  it('adds inline US effective-rate context on the overview card', () => {
    assert.match(panelSrc, /renderRestrictionEffectiveContext/);
    assert.match(panelSrc, /components\.tradePolicy\.gapVsMfnLabel/);
  });
});
