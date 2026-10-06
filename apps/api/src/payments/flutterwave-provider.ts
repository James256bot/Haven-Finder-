import type { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from './provider';

const BASE = process.env.FLW_ENV === 'live'
  ? 'https://api.flutterwave.com/v3'
  : 'https://api.flutterwave.com/v3'; // Flutterwave uses the same URL for test keys

export class FlutterwaveProvider implements PaymentProvider {
  readonly name = 'flutterwave';
  private secret = process.env.FLW_SECRET_KEY!;
  private webhookHash = process.env.FLW_WEBHOOK_HASH!;

  private headers() {
    return {
      'Authorization': `Bearer ${this.secret}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Uganda mobile money charge.
   * NOTE: requires phone_number + network.
   * Our interface doesn't include network yet, so we infer it from the prefix
   * OR require the caller to pass it via `phone` as "256772...|MTN".
   */
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // Parse phone + network. Expected format: "256772000001" or "256772000001|MTN"
    const [rawPhone, explicitNetwork] = (input.phone ?? '').split('|');
    const phone = rawPhone.replace(/[^0-9]/g, '');

    if (!phone || phone.length < 10) {
      throw new Error('Flutterwave requires a valid phone number (256XXXXXXXXX)');
    }

    // Infer network from Uganda prefix if not explicit
    const network = explicitNetwork ?? inferUgandaNetwork(phone);

    const txRef = `HF-${input.purpose.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const res = await fetch(`${BASE}/charges?type=mobile_money_uganda`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        phone_number: phone,
        network,
        amount: input.amount,
        currency: input.currency,
        email: 'payments@havenfinder.app',
        tx_ref: txRef,
        fullname: 'HavenFinder User',
        meta: {
          purpose: input.purpose,
          reference_id: input.referenceId,
          user_id: input.userId,
        },
      }),
    });

    const json: any = await res.json();

    if (json.status !== 'success') {
      return {
        providerReference: txRef,
        status: 'failed',
        raw: json,
      };
    }

    // Flutterwave response: data.status may be "pending" | "successful" | "failed"
    const flwStatus = json.data?.status;
    const status: 'pending' | 'success' | 'failed' =
      flwStatus === 'successful' ? 'success'
      : flwStatus === 'failed' ? 'failed'
      : 'pending';

    return {
      providerReference: String(json.data?.id ?? txRef),
      status,
      raw: json,
    };
  }

  async verifyPayment(providerReference: string): Promise<{ status: 'pending' | 'success' | 'failed'; raw: unknown }> {
    // providerReference here can be either Flutterwave's numeric transaction id OR our tx_ref.
    // The verify endpoint works with the numeric id.
    const res = await fetch(`${BASE}/transactions/${providerReference}/verify`, {
      headers: this.headers(),
    });
    const json: any = await res.json();

    if (json.status !== 'success') {
      return { status: 'failed', raw: json };
    }

    const s = json.data?.status;
    const status: 'pending' | 'success' | 'failed' =
      s === 'successful' ? 'success'
      : s === 'failed' ? 'failed'
      : 'pending';

    return { status, raw: json };
  }

  async refundPayment(providerReference: string): Promise<{ ok: boolean; raw: unknown }> {
    // Flutterwave requires the numeric transaction id for refunds.
    const res = await fetch(`${BASE}/transactions/${providerReference}/refund`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ amount: undefined }), // full refund
    });
    const json: any = await res.json();
    return { ok: json.status === 'success', raw: json };
  }

  /** Used by webhook handler to verify the incoming request is genuinely from Flutterwave. */
  verifyWebhookSignature(headerHash: string | undefined): boolean {
    if (!headerHash || !this.webhookHash) return false;
    return headerHash === this.webhookHash;
  }
}

function inferUgandaNetwork(phone: string): 'MTN' | 'AIRTEL' {
  // Uganda MTN prefixes: 77, 78, 76 (and 39, 31 legacy)
  // Uganda Airtel prefixes: 70, 75, 74
  const local = phone.startsWith('256') ? phone.slice(3) : phone;
  const prefix = local.slice(0, 2);
  if (['77', '78', '76', '39', '31'].includes(prefix)) return 'MTN';
  if (['70', '75', '74'].includes(prefix)) return 'AIRTEL';
  // Default to MTN — will fail at Flutterwave if wrong, user retries with Airtel
  return 'MTN';
}
