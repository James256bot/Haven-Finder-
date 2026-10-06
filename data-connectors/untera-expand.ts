import 'dotenv/config';
const KEY = process.env.UNTERA_API_KEY!;

const CANDIDATES = [
  'UG','KE','TZ','RW','ZA','NG','GH','EG','MA','SN',
  'PT','ES','IT','GR','TR','AE','TH','MX','JP','BR',
];

async function probe(country: string) {
  // Fetch 50 in one page — count of results returned = real total (capped at 50)
  const url = `https://api.untera.io/api/v1/listings/search?country=${country}&page=1&pageSize=50`;
  try {
    const res = await fetch(url, { headers: { 'X-API-Key': KEY } });
    if (!res.ok) return { country, count: 0 };
    const j: any = await res.json();
    return { country, count: (j.results ?? []).length };
  } catch {
    return { country, count: 0 };
  }
}

async function main() {
  console.log('Country     Results (up to 50 shown)\n');
  for (const c of CANDIDATES) {
    const r = await probe(c);
    const bar = '█'.repeat(Math.min(r.count, 50));
    console.log(`  ${c}  ${String(r.count).padStart(3)}  ${bar}`);
    await new Promise(r => setTimeout(r, 4200));
  }
}
main();
