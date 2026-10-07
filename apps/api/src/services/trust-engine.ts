export type Signal = {
  code: string;
  label: string;
  severity: 'high' | 'medium' | 'low' | 'positive';
  scoreDelta: number;
  evidence?: string;
};

export type TrustResult = {
  score: number;              // 0-100
  label: 'trusted' | 'caution' | 'risky' | 'unknown';
  signals: Signal[];
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
};

export function computeTrust(ctx: ListingContext): TrustResult {
  const signals: Signal[] = [];

  // ═══ POSITIVE SIGNALS ═══
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

  // ═══ RISK SIGNALS ═══
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

  // ═══ TOTAL ═══
  const raw = 50 + signals.reduce((s, x) => s + x.scoreDelta, 0);
  const score = Math.max(0, Math.min(100, raw));
  const label: TrustResult['label'] =
    score >= 75 ? 'trusted' :
    score >= 50 ? 'caution' :
    score >= 25 ? 'risky' : 'risky';

  return { score, label, signals };
}
