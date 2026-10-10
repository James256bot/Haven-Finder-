export type Signal = {
  code: string;
  label: string;
  severity: 'high' | 'medium' | 'low' | 'positive';
  scoreDelta: number;
  evidence?: string;
};

export type Badge = {
  code: string;
  label: string;
  icon: string;
};

export type TrustResult = {
  score: number;              // internal use only — not shown to users
  label: 'trusted' | 'caution' | 'risky' | 'unknown';  // internal
  signals: Signal[];          // internal — admin/debug
  badges: Badge[];            // ✅ what the frontend displays
};

type ListingContext = {
  priceUsd: number;
  bedrooms: number | null;
  city: string | null;
  countryCode: string | null;
  sourceCode: string | null;
  hasImages: boolean;
  imageCount: number;
  descriptionLength: number;
  createdDaysAgo: number;
  ownerVerification: 'unverified' | 'pending' | 'verified' | 'suspended';
  ownerListingCount: number;
  ownerAccountAgeDays: number;
  hasCoordinates?: boolean;
  hasOwnerPhone?: boolean;
};

export function computeTrust(ctx: ListingContext): TrustResult {
  const signals: Signal[] = [];
  const badges: Badge[] = [];

  // ═══ BADGES (positive only — what users see) ═══

  if (ctx.ownerVerification === 'verified') {
    badges.push({ code: 'VERIFIED', label: 'Verified listing', icon: '✓' });
  }

  if (ctx.imageCount >= 5 || (ctx.imageCount === 0 && ctx.hasImages)) {
    badges.push({ code: 'MANY_PHOTOS', label: '5+ photos', icon: '📸' });
  } else if (ctx.imageCount >= 3) {
    badges.push({ code: 'MULTIPLE_PHOTOS', label: 'Multiple photos', icon: '📸' });
  }

  if (ctx.descriptionLength > 200) {
    badges.push({ code: 'DETAILED', label: 'Detailed description', icon: '📝' });
  }

  if (ctx.hasCoordinates) {
    badges.push({ code: 'MAPPED', label: 'Location mapped', icon: '📍' });
  }

  if (ctx.hasOwnerPhone || ctx.ownerListingCount > 0) {
    badges.push({ code: 'CONTACTABLE', label: 'Owner contactable', icon: '👤' });
  }

  if (ctx.ownerListingCount > 3 && ctx.ownerAccountAgeDays > 30) {
    badges.push({ code: 'ESTABLISHED', label: 'Established agent', icon: '⭐' });
  }

  if (ctx.priceUsd > 0) {
    badges.push({ code: 'PRICED', label: 'Priced', icon: '💰' });
  }

  // If nothing positive yet, at least say when it was recently listed
  if (badges.length === 0 && ctx.createdDaysAgo < 7) {
    badges.push({ code: 'NEW', label: 'Newly listed', icon: '🆕' });
  }

  // ═══ SIGNALS (internal — retained for admin/debug) ═══

  if (ctx.ownerVerification === 'verified') {
    signals.push({ code: 'VERIFIED_OWNER', label: 'Verified owner', severity: 'positive', scoreDelta: 15 });
  }
  if (ctx.ownerListingCount > 3 && ctx.ownerAccountAgeDays > 30) {
    signals.push({ code: 'ESTABLISHED_AGENT', label: 'Established agent with listing history', severity: 'positive', scoreDelta: 10 });
  }
  if (ctx.imageCount >= 3) {
    signals.push({ code: 'MULTIPLE_PHOTOS', label: 'Multiple photos provided', severity: 'positive', scoreDelta: 5 });
  }
  if (ctx.descriptionLength > 200) {
    signals.push({ code: 'DETAILED_DESCRIPTION', label: 'Detailed property description', severity: 'positive', scoreDelta: 5 });
  }

  if (!ctx.hasImages || ctx.imageCount === 0) {
    signals.push({ code: 'NO_PHOTOS', label: 'No photos provided', severity: 'high', scoreDelta: -25 });
  }
  if (ctx.descriptionLength < 50) {
    signals.push({ code: 'THIN_DESCRIPTION', label: 'Very short or missing description', severity: 'medium', scoreDelta: -15 });
  }
  if (ctx.priceUsd > 0 && ctx.priceUsd < 5) {
    signals.push({ code: 'SUSPICIOUSLY_CHEAP', label: 'Price is unusually low', severity: 'medium', scoreDelta: -20, evidence: `$${ctx.priceUsd}` });
  }
  if (ctx.createdDaysAgo < 1 && !ctx.hasImages) {
    signals.push({ code: 'FRESH_NO_PHOTOS', label: 'Just posted, no photos', severity: 'high', scoreDelta: -20 });
  }
  if (ctx.sourceCode === 'jiji' && ctx.ownerVerification !== 'verified') {
    signals.push({ code: 'UNVERIFIED_CLASSIFIEDS', label: 'Unverified listing from classifieds', severity: 'medium', scoreDelta: -10 });
  }
  if (ctx.ownerListingCount > 50 && ctx.ownerAccountAgeDays < 7) {
    signals.push({ code: 'BULK_POSTING_NEW_ACCOUNT', label: 'New account posting many listings', severity: 'high', scoreDelta: -25 });
  }
  if (ctx.ownerVerification === 'suspended') {
    signals.push({ code: 'SUSPENDED_OWNER', label: 'Owner account is suspended', severity: 'high', scoreDelta: -50 });
  }

  const raw = 50 + signals.reduce((s, x) => s + x.scoreDelta, 0);
  const score = Math.max(0, Math.min(100, raw));
  const label: TrustResult['label'] =
    score >= 75 ? 'trusted' :
    score >= 50 ? 'caution' :
    'risky';

  return { score, label, signals, badges };
}
