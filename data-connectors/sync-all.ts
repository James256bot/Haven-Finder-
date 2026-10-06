import { spawn } from 'child_process';

const connectors = [
  { name: 'OSM (Free)', file: 'osm.ts', needs: [] },
  { name: 'RentCast', file: 'rentcast.ts', needs: ['RENTCAST_API_KEY'] },
  { name: 'Realtor.com', file: 'realtor.ts', needs: ['RAPIDAPI_KEY'] },
];

async function runConnector(connector: any) {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Running: ${connector.name}`);
  console.log('═══════════════════════════════════════════════');
  
  return new Promise<void>((resolve) => {
    const child = spawn('npx', ['tsx', connector.file], { stdio: 'inherit' });
    child.on('close', () => resolve());
  });
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   🏠 HAVENFINDER - REAL PROPERTY SYNC         ║');
  console.log('║   Fetching REAL listings from public APIs     ║');
  console.log('╚═══════════════════════════════════════════════╝');
  
  for (const connector of connectors) {
    const missing = connector.needs.filter(k => !process.env[k]);
    if (missing.length > 0) {
      console.log(`\n⚠️  Skipping ${connector.name} - missing: ${missing.join(', ')}`);
      continue;
    }
    await runConnector(connector);
  }
  
  console.log('');
  console.log('✅ All connectors complete');
  process.exit(0);
}

main().catch(console.error);
