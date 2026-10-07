import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../lib/db';
import { generateAllPosts } from '../marketing/generator';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const CreateBody = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  propertyType: z.string().min(2).max(50),
  listingType: z.enum(['rent', 'sale', 'short_stay', 'commercial_lease', 'land_sale']),
  city: z.string().min(2).max(100),
  addressLine: z.string().max(300).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  floorAreaSqm: z.number().min(0).max(100000).optional(),
  landAreaSqm: z.number().min(0).max(1000000).optional(),
  furnishing: z.enum(['unfurnished', 'semi_furnished', 'furnished']).optional(),
  priceAmount: z.number().positive(),
  currency: z.string().length(3).default('UGX'),
  pricePeriod: z.enum(['nightly', 'weekly', 'monthly', 'yearly', 'total']),
});

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;  // 10 MB

const route: FastifyPluginAsync = async (app) => {
  // ── POST /me/listings — create draft ─────────────────
  app.post('/me/listings', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = CreateBody.parse(req.body);
    const uid = req.user!.sub;

    // Slug
    const base = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const slug = `u-${base}-${randomUUID().slice(0, 8)}`;

    // Convert to USD for cross-currency sorting
    const rate = body.currency === 'UGX' ? 3800 : body.currency === 'KES' ? 130 : 1;
    const usd = (body.priceAmount / rate).toFixed(2);

    const r = await pool.query(
      `INSERT INTO listings (
         user_id, title, slug, description,
         type, status, price, currency,
         city, country, latitude, longitude,
         bedrooms, bathrooms, property_type,
         main_image_url, published_at,
         listing_type, country_code,
         price_period, price_amount, price_usd,
         floor_area_sqm, land_area_sqm, furnishing, address_line,
         verification, is_seed, source_code
       ) VALUES (
         $1,$2,$3,$4,
         'property','pending_review',$5,$6,
         $7,'Uganda',$8,$9,
         $10,$11,$12,
         NULL, NULL,
         $13,'UG',
         $14,$15,$16,
         $17,$18,$19,$20,
         'unverified', false, 'user'
       )
       RETURNING id, slug, status`,
      [
        uid, body.title, slug, body.description,
        body.priceAmount, body.currency,
        body.city, body.latitude ?? null, body.longitude ?? null,
        body.bedrooms ?? null, body.bathrooms ?? null, body.propertyType,
        body.listingType, body.pricePeriod, body.priceAmount, usd,
        body.floorAreaSqm ?? null, body.landAreaSqm ?? null,
        body.furnishing ?? null, body.addressLine ?? null,
      ],
    );

    return reply.code(201).send({
      success: true,
      data: { listing: r.rows[0] },
    });
  });

  // ── GET /me/listings — owner's own listings ──────────
  app.get('/me/listings', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT l.id, l.slug, l.title, l.status, l.city, l.country,
              l.price_amount, l.currency, l.price_period,
              l.main_image_url, l.verification, l.property_type,
              l.listing_type, l.bedrooms, l.bathrooms,
              l.view_count, l.favorite_count, l.inquiry_count,
              l.created_at, l.updated_at,
              (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id)::int AS image_count
       FROM listings l
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC
       LIMIT 200`,
      [req.user!.sub],
    );
    return { success: true, data: { listings: r.rows } };
  });

  // ── PATCH /me/listings/:id — edit ────────────────────
  app.patch('/me/listings/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = CreateBody.partial().parse(req.body);

    const own = await pool.query(
      `SELECT id FROM listings WHERE id = $1 AND user_id = $2`,
      [id, req.user!.sub],
    );
    if (!own.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const fields: string[] = [];
    const args: any[] = [];
    let i = 1;

    const map: Record<string, string> = {
      title: 'title',
      description: 'description',
      propertyType: 'property_type',
      listingType: 'listing_type',
      city: 'city',
      addressLine: 'address_line',
      latitude: 'latitude',
      longitude: 'longitude',
      bedrooms: 'bedrooms',
      bathrooms: 'bathrooms',
      floorAreaSqm: 'floor_area_sqm',
      landAreaSqm: 'land_area_sqm',
      furnishing: 'furnishing',
      priceAmount: 'price_amount',
      currency: 'currency',
      pricePeriod: 'price_period',
    };

    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      fields.push(`${map[k]} = $${i++}`);
      args.push(v);
    }
    if (fields.length === 0) {
      return { success: true, data: { message: 'Nothing to update' } };
    }

    fields.push(`updated_at = now()`);
    args.push(id);

    await pool.query(
      `UPDATE listings SET ${fields.join(', ')} WHERE id = $${i}`,
      args,
    );

    return { success: true, data: { message: 'Updated' } };
  });

  // ── POST /me/listings/:id/images — upload one image ──
  app.post('/me/listings/:id/images', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const own = await pool.query(
      `SELECT id FROM listings WHERE id = $1 AND user_id = $2`,
      [id, req.user!.sub],
    );
    if (!own.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const data = await (req as any).file();
    if (!data) {
      return reply.code(400).send({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }
    if (!ALLOWED_TYPES.has(data.mimetype)) {
      return reply.code(415).send({ success: false, error: { code: 'BAD_TYPE', message: 'Only JPEG, PNG, or WebP allowed' } });
    }

    const buf = await data.toBuffer();
    if (buf.length > MAX_FILE_BYTES) {
      return reply.code(413).send({ success: false, error: { code: 'TOO_LARGE', message: 'Max 10 MB per image' } });
    }

    const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const fname = `${randomUUID()}.${ext}`;
    const dir = join(UPLOAD_DIR, id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fname), buf);

    const url = `/uploads/${id}/${fname}`;

    // Count existing
    const cnt = await pool.query(
      `SELECT COUNT(*)::int AS n FROM listing_images WHERE listing_id = $1`,
      [id],
    );
    const sortOrder = cnt.rows[0].n;
    const isPrimary = sortOrder === 0;

    const ins = await pool.query(
      `INSERT INTO listing_images (listing_id, url, sort_order, is_primary)
       VALUES ($1, $2, $3, $4)
       RETURNING id, url, sort_order, is_primary`,
      [id, url, sortOrder, isPrimary],
    );

    // If this is the first image, set as main_image_url on the listing
    if (isPrimary) {
      await pool.query(
        `UPDATE listings SET main_image_url = $1 WHERE id = $2`,
        [url, id],
      );
    }

    return reply.code(201).send({ success: true, data: { image: ins.rows[0] } });
  });

  // ── DELETE /me/listings/:id/images/:imageId ──────────
  app.delete('/me/listings/:id/images/:imageId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, imageId } = req.params as { id: string; imageId: string };

    const own = await pool.query(
      `SELECT id FROM listings WHERE id = $1 AND user_id = $2`,
      [id, req.user!.sub],
    );
    if (!own.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const img = await pool.query(
      `SELECT id, url FROM listing_images WHERE id = $1 AND listing_id = $2`,
      [imageId, id],
    );
    if (!img.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    }

    // Delete file from disk
    const filePath = join(UPLOAD_DIR, id, img.rows[0].url.split('/').pop());
    await unlink(filePath).catch(() => {});

    await pool.query(`DELETE FROM listing_images WHERE id = $1`, [imageId]);

    // If it was the primary, promote the next one
    const rest = await pool.query(
      `SELECT id, url FROM listing_images WHERE listing_id = $1 ORDER BY sort_order LIMIT 1`,
      [id],
    );
    const newMain = rest.rowCount ? rest.rows[0].url : null;
    await pool.query(`UPDATE listings SET main_image_url = $1 WHERE id = $2`, [newMain, id]);
    if (rest.rowCount) {
      await pool.query(`UPDATE listing_images SET is_primary = true WHERE id = $1`, [rest.rows[0].id]);
    }

    return { success: true, data: { message: 'Deleted' } };
  });

  // ── DELETE /me/listings/:id — soft delete ────────────
  app.delete('/me/listings/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = await pool.query(
      `UPDATE listings SET status = 'draft', deleted_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user!.sub],
    );
    if (!r.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    }
    return { success: true, data: { message: 'Deleted' } };
  });

  // ── PATCH /me/listings/:id/publish ───────────────────
  app.patch('/me/listings/:id/publish', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const own = await pool.query(
      `SELECT l.id, l.title, l.description, l.main_image_url, l.price_amount
       FROM listings l WHERE l.id = $1 AND l.user_id = $2`,
      [id, req.user!.sub],
    );
    if (!own.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const l = own.rows[0];
    if (!l.title || !l.description || !l.main_image_url || !l.price_amount) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INCOMPLETE', message: 'Title, description, image, and price are required' },
      });
    }

    // For now, owners can publish directly. Admin review comes later.
    await pool.query(
      `UPDATE listings SET status = 'published', published_at = now(), updated_at = now()
       WHERE id = $1`,
      [id],
    );

    // Auto-generate marketing content
    try {
      const full = await pool.query(
        `SELECT id, slug, title, description, city, country,
                bedrooms, bathrooms, price_amount, currency, price_period,
                property_type, listing_type, main_image_url
         FROM listings WHERE id = $1`,
        [id],
      );
      if (full.rowCount) {
        const posts = await generateAllPosts(pool, full.rows[0], req.user!.sub);
        console.log(`[marketing] generated ${posts.length} posts for listing ${id}`);
      }
    } catch (e: any) {
      console.error('[marketing] generation failed:', e.message);
    }

    return { success: true, data: { message: 'Published' } };
  });
};

export default route;
