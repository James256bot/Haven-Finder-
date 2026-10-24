const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export async function trackLead(listingId: string, channel: 'whatsapp' | 'message' | 'viewing' | 'video_inspection') {
  try {
    await fetch(`${API}/leads/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, channel }),
    });
  } catch {
    // Never block the user's action on tracking failure
  }
}
