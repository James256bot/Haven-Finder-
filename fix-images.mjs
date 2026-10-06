import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://havenfinder:havenfinder_dev@127.0.0.1:5432/havenfinder' });

// 25 unique property images from Unsplash
const uniqueImages = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448075-bb485b067938?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
];

async function fixImages() {
  console.log('🖼️ Assigning unique images to all listings...');
  
  const result = await pool.query('SELECT id, title FROM listings ORDER BY created_at');
  const listings = result.rows;
  
  for (let i = 0; i < listings.length; i++) {
    const img = uniqueImages[i % uniqueImages.length];
    await pool.query('UPDATE listings SET main_image_url = $1 WHERE id = $2', [img, listings[i].id]);
  }
  
  console.log(`✅ Assigned ${listings.length} unique images to ${listings.length} listings`);
  
  // Show what was updated
  const verify = await pool.query('SELECT title, main_image_url FROM listings ORDER BY created_at LIMIT 10');
  verify.rows.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.title.substring(0, 40)} → ${r.main_image_url.substring(r.main_image_url.indexOf('photo-'), r.main_image_url.indexOf('?'))}`);
  });
  
  await pool.end();
  process.exit(0);
}

fixImages().catch(e => { console.error('Error:', e.message); process.exit(1); });
