import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  app.post('/admin/seed-demo', async (req, reply) => {
    const { secret } = req.body as { secret?: string };
    if (secret !== (process.env.MIGRATION_SECRET ?? 'havenfinder-migrate-2026')) {
      return reply.code(403).send({ error: 'bad secret' });
    }

    let adminId: string;
    const existing = await pool.query(`SELECT id FROM users LIMIT 1`);
    if (existing.rowCount) adminId = existing.rows[0].id;
    else {
      const ins = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, country_code)
         VALUES ('admin@havenfinder.test', 'placeholder', 'Demo Admin', 'admin', 'UG')
         RETURNING id`
      );
      adminId = ins.rows[0].id;
    }

    const props = [
      { t: 'Modern 2-bedroom Apartment in Ntinda',    p: 1500000,   pt: 'apartment', lt: 'rent', bd: 2, ba: 2, lat: 0.3606, lng: 32.6125, hood: 'Ntinda' },
      { t: 'Executive 3-bedroom House in Kololo',     p: 4500000,   pt: 'house',     lt: 'rent', bd: 3, ba: 2, lat: 0.3341, lng: 32.5914, hood: 'Kololo' },
      { t: 'Luxury 4-bedroom Villa in Muyenga',       p: 12000000,  pt: 'villa',     lt: 'rent', bd: 4, ba: 4, lat: 0.2907, lng: 32.6114, hood: 'Muyenga' },
      { t: 'Cozy Studio in Kisaasi',                  p: 850000,    pt: 'studio',    lt: 'rent', bd: 0, ba: 1, lat: 0.3821, lng: 32.6205, hood: 'Kisaasi' },
      { t: 'Spacious 2-bedroom Apartment in Bukoto',  p: 2000000,   pt: 'apartment', lt: 'rent', bd: 2, ba: 2, lat: 0.3450, lng: 32.6001, hood: 'Bukoto' },
      { t: 'Family 3-bedroom House in Kira',          p: 3500000,   pt: 'house',     lt: 'rent', bd: 3, ba: 2, lat: 0.3975, lng: 32.6630, hood: 'Kira' },
      { t: 'Prime Land in Wakiso',                    p: 120000000, pt: 'land',      lt: 'land_sale', bd: 0, ba: 0, lat: 0.4040, lng: 32.4590, hood: 'Wakiso' },
      { t: 'Gated 4-bedroom House in Naguru',         p: 6500000,   pt: 'house',     lt: 'rent', bd: 4, ba: 3, lat: 0.3392, lng: 32.6081, hood: 'Naguru' },
      { t: 'Furnished 1-bedroom Apartment in Kololo', p: 2800000,   pt: 'apartment', lt: 'rent', bd: 1, ba: 1, lat: 0.3341, lng: 32.5914, hood: 'Kololo' },
      { t: 'Commercial Office in Kampala CBD',        p: 5500000,   pt: 'office',    lt: 'commercial_lease', bd: 0, ba: 2, lat: 0.3136, lng: 32.5811, hood: 'Kampala' },
    ];

    let ok = 0;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      const slug = `demo-${p.pt}-${p.hood.toLowerCase()}-${i}`;
      try {
        await pool.query(
          `INSERT INTO listings (
             user_id, title, slug, description, type, status,
             price, currency, city, country, latitude, longitude,
             bedrooms, bathrooms, property_type, main_image_url, published_at,
             listing_type, country_code, price_period, price_amount, price_usd_cents,
             verification, is_seed, source_code
           ) VALUES ($1,$2,$3,$4,'property','published',$5,'UGX','Kampala','Uganda',$6,$7,$8,$9,$10,$11,now(),$12,'UG','monthly',$5,$13,'unverified',true,'demo')
           ON CONFLICT (slug) DO NOTHING`,
          [
            adminId, p.t, slug,
            `Beautiful ${p.pt} in ${p.hood}, Kampala. ${p.bd} bedrooms, ${p.ba} bathrooms. Close to shops and transport.`,
            p.p, p.lat, p.lng, p.bd, p.ba, p.pt,
            `https://picsum.photos/seed/${slug}/1200/800`,
            p.lt, (p.p / 3800).toFixed(2),
          ],
        );
        ok++;
      } catch (e: any) {}
    }

    return { seeded: ok };
  });
};

export default route;
