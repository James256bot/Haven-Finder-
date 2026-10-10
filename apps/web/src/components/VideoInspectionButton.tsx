export function VideoInspectionButton({
  phone,
  listingTitle,
  listingSlug,
  city,
}: {
  phone?: string | null;
  listingTitle: string;
  listingSlug: string;
  city?: string | null;
}) {
  // If no phone, hide the button — nothing to request against
  if (!phone) return null;

  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '256' + digits.slice(1) : digits;

  const siteUrl = 'https://dist-black-six-60.vercel.app';
  const msg = encodeURIComponent(
    `Hi, I'd like to schedule a video walkthrough of "${listingTitle}"${city ? ` in ${city}` : ''} on HavenFinder.\n\n` +
    `${siteUrl}/listing/${listingSlug}\n\n` +
    `When would be a good time?`
  );

  return (
    <a
      href={`https://wa.me/${intl}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-purple-500 text-purple-700 hover:bg-purple-50 font-medium transition-colors"
      aria-label="Request video inspection"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
      Request video inspection
    </a>
  );
}
