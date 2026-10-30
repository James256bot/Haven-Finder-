import * as https from 'node:https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const SITE_URL = 'https://dist-black-six-60.vercel.app';

function httpsRequest(opts: { hostname: string; path: string; method: string; headers: Record<string,string>; body?: string }): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

export async function postToSocials(listing: any) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('[Social] Missing Telegram credentials');
    return { success: false, error: 'Missing credentials' };
  }

  const caption = 
    `🏠 <b>${listing.title}</b>\n\n` +
    `📍 ${listing.city || ''}, ${listing.country || 'Uganda'}\n` +
    `💰 ${listing.currency || 'UGX'} ${Number(listing.price_amount || 0).toLocaleString()} ${listing.price_period ? `/${listing.price_period}` : ''}\n` +
    `🛏 ${listing.bedrooms || '-'} Beds  |  🛁 ${listing.bathrooms || '-'} Baths\n\n` +
    `👉 <a href="${SITE_URL}/property/${listing.slug}">Click here to see photos & contact owner</a>`;

  try {
    const res = await httpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        photo: listing.main_image_url || 'https://placehold.co/600x400?text=Haven+Finder',
        caption: caption,
        parse_mode: 'HTML',
      }),
    });

    if (res.ok) {
      console.log('[Social] ✅ Posted to Telegram');
      return { success: true };
    } else {
      console.error('[Social] ❌ Telegram error:', res);
      return { success: false, error: res.description };
    }
  } catch (err: any) {
    console.error('[Social] Exception:', err.message);
    return { success: false, error: err.message };
  }
}
