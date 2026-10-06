import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

const LAYER = 'https://services.arcgis.com/CmINIEzurW7Tagtl/ArcGIS/rest/services/KampalaURAMap_WFL1/FeatureServer/0';
const PAGE_SIZE = 2000;

// Web Mercator (EPSG:3857) → WGS84
function mercatorToLatLng(x: number, y: number) {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

function extractCoords(attrs: any) {
  const x = attrs.X ?? attrs.x ?? attrs.Longitude ?? attrs.longitude;
  const y = attrs.Y ?? attrs.y ?? attrs.Latitude ?? attrs.latitude;
  if (x == null || y == null) return null;
  // Heuristic: Web Mercator coords are > 1000 in magnitude
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    return mercatorToLatLng(Number(x), Number(y));
  }
  return { lat: Number(y), lng: Number(x) };
}

function pick(attrs: any, ...keys: string[]) {
  for (const k of keys) {
    if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== '') return attrs[k];
  }
  return null;
}

async function fetchPage(offset: number) {
  const url = `${LAYER}/query?where=1%3D1&outFields=*&f=json&outSR=4326&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: any = await res.json();
  if (json.error) throw new Error(`ArcGIS: ${json.error.message}`);
  return {
    features: json.features ?? [],
    exceeded: json.exceededTransferLimit ?? false,
  };
}

function normalizeDate(v: any): string | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    // Try parsing as ISO string
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  // Epoch: < 10^10 is seconds, >= 10^10 is milliseconds
  const ms = n < 1e10 ? n * 1000 : n;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1970 || d.getFullYear() > 2100) return null;
  return d.toISOString().slice(0, 10);
}

async function saveFeature(f: any) {
  const a = f.attributes ?? {};
  const coords = extractCoords(a);
  const objectId = Number(pick(a, 'OBJECTID', 'objectid', 'ObjectId', 'FID'));
  if (!objectId) return false;

  await pool.query(
    `INSERT INTO kcca_properties (
       object_id, camv_id, serial_no, house_number, frontage,
       property_name, division, parish, village, street,
       payment_status, expiry_date, latitude, longitude, raw
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (object_id) DO UPDATE SET
       property_name   = EXCLUDED.property_name,
       division        = EXCLUDED.division,
       parish          = EXCLUDED.parish,
       village         = EXCLUDED.village,
       street          = EXCLUDED.street,
       payment_status  = EXCLUDED.payment_status,
       latitude        = EXCLUDED.latitude,
       longitude       = EXCLUDED.longitude,
       raw             = EXCLUDED.raw,
       imported_at     = now()`,
    [
      objectId,
      pick(a, 'Camv_ID', 'CAMV_ID', 'camv_id'),
      pick(a, 'Serial_No', 'serial_no'),
      pick(a, 'House_Numb', 'House_Number', 'house_number'),
      pick(a, 'Frontage', 'frontage'),
      pick(a, 'Name', 'NAME', 'name'),
      pick(a, 'Division', 'division'),
      pick(a, 'Parish', 'parish'),
      pick(a, 'Village', 'village'),
      pick(a, 'Street', 'street'),
      pick(a, 'Payment', 'payment_status', 'Payment_Status'),
      normalizeDate(pick(a, 'ExpiryDate', 'expiry_date')),
      coords?.lat ?? null,
      coords?.lng ?? null,
      JSON.stringify(a),
    ],
  );
  return true;
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  🏛️  KCCA KAMPALA PROPERTY REGISTRY');
  console.log('══════════════════════════════════════════\n');

  let offset = 0, total = 0, withCoords = 0;
  while (true) {
    process.stdout.write(`  Fetching offset ${offset}... `);
    const { features, exceeded } = await fetchPage(offset);
    if (features.length === 0) { console.log('done'); break; }

    for (const f of features) {
      try {
        if (await saveFeature(f)) {
          total++;
          const a = f.attributes ?? {};
          if (a.X != null && a.Y != null) withCoords++;
        }
      } catch (e: any) {
        console.log(`\n     ⚠️  ${e.message.slice(0, 100)}`);
      }
    }
    console.log(`${features.length} rows`);
    if (!exceeded) break;
    offset += features.length;
    await new Promise(r => setTimeout(r, 500));
  }

  const s = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL) AS with_coords,
      COUNT(DISTINCT division) AS divisions,
      COUNT(DISTINCT parish) AS parishes,
      COUNT(DISTINCT village) AS villages
    FROM kcca_properties`);

  console.log(`\n✅ Imported ${total} KCCA records`);
  console.log('   ', s.rows[0]);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
