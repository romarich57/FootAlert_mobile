import fs from 'node:fs';
import path from 'node:path';

const coveragePath = path.resolve('coverage/coverage-summary.json');
const matrixPath = path.resolve('test/fixtures/route-test-matrix.json');

if (!fs.existsSync(coveragePath)) {
  console.error(`Missing coverage summary at ${coveragePath}. Run npm run test:coverage first.`);
  process.exit(1);
}

if (!fs.existsSync(matrixPath)) {
  console.error(`Missing route matrix at ${matrixPath}. Run npm run routes:catalog first.`);
  process.exit(1);
}

const coverageSummary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const total = coverageSummary.total;
const globalThreshold = 85;
const criticalThreshold = 95;

const globalMetrics = ['lines', 'functions', 'statements'];
for (const metric of globalMetrics) {
  const metricResult = total[metric];
  if (!metricResult || metricResult.pct < globalThreshold) {
    console.error(
      `Global coverage below threshold for ${metric}: ${metricResult?.pct ?? 0}% < ${globalThreshold}%`,
    );
    process.exit(1);
  }
}

const criticalPaths = new Set(
  matrix
    .filter(entry => entry.critical === true)
    .map(entry => entry.path),
);

const criticalFileRules = [
  {
    id: 'matches',
    match: file => file.includes('/src/routes/matches/'),
    routes: ['/v1/matches'],
  },
  {
    id: 'competitions',
    match: file => file.includes('/src/routes/competitions/'),
    routes: ['/v1/competitions'],
  },
  {
    id: 'notifications',
    match: file => file.endsWith('/src/routes/notifications.ts'),
    routes: ['/v1/notifications'],
  },
  {
    id: 'telemetry',
    match: file => file.endsWith('/src/routes/telemetry.ts'),
    routes: ['/v1/telemetry'],
  },
  {
    id: 'mobileSession',
    match: file => file.endsWith('/src/routes/mobileSession.ts'),
    routes: ['/v1/mobile/session'],
  },
];

for (const rule of criticalFileRules) {
  const hasCriticalRoute = rule.routes.some(prefix =>
    [...criticalPaths].some(pathname => pathname.startsWith(prefix)),
  );
  if (!hasCriticalRoute) {
    continue;
  }

  const matchingEntries = Object.entries(coverageSummary).filter(([file]) => rule.match(file));
  if (matchingEntries.length === 0) {
    console.error(`No coverage entries found for critical area "${rule.id}".`);
    process.exit(1);
  }

  for (const [file, metrics] of matchingEntries) {
    const linesPct = metrics.lines?.pct ?? 0;
    const functionsPct = metrics.functions?.pct ?? 0;
    const statementsPct = metrics.statements?.pct ?? 0;

    if (linesPct < criticalThreshold || functionsPct < criticalThreshold || statementsPct < criticalThreshold) {
      console.error(
        `Critical coverage below ${criticalThreshold}% for ${file} (lines=${linesPct}, functions=${functionsPct}, statements=${statementsPct}).`,
      );
      process.exit(1);
    }
  }
}

console.log(
  `Coverage gates passed (global >= ${globalThreshold}%, critical >= ${criticalThreshold}%).`,
);
