import { DPOPayment } from '@kazion/dpopay-sdk';
import type { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from './provider';

const DPO_PAYMENT_URL = process.env.DPO_ENV === 'sandbox'
  ? 'https://secure.3gdirectpay.com/payv3.php'
  : 'https://secure.3gdirectpay.com/payv3.php';

export class DpoPayProvider implements PaymentProvider {
  readonly name = 'dpo';
  private dpo: DPOPayment;
  private serviceType = process.env.DPO_SERVICE_TYPE!;
  private redirectUrl = process.env.DPO_REDIRECT_URL!;
  private backUrl = process.env.DPO_BACK_URL!;

  constructor() {
    this.dpo = new DPOPayment({
      companyToken: process.env.DPO_COMPANY_TOKEN!,
      apiVersion: 'v6',
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const companyRef = `HF-${input.purpose.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      transaction: {
        paymentAmount: input.amount,
        paymentCurrency: input.currency,
        companyRef,
        redirectURL: this.redirectUrl,
        backURL: this.backUrl,
        customerFirstName: 'HavenFinder',
        customerLastName: 'User',
        customerEmail: 'payments@havenfinder.app',
        customerPhone: input.phone ?? '',
        customerCountry: 'UG',
        emailTransaction: 1,
      },
      services: [
        {
          serviceType: this.serviceType,
          serviceDescription: `${input.purpose} — ${input.description}`,
          serviceDate: new Date().toISOString().slice(0, 10),
        },
      ],
    };

    try {
      const result = await this.dpo.initiatePayment(payload as any);

      if (result.Result !== '000') {
        return {
          providerReference: companyRef,
          status: 'failed',
          raw: result,
        };
      }

      const transactionToken = result.TransToken;
      const redirectUrl = `${DPO_PAYMENT_URL}?ID=${transactionToken}`;

      return {
        providerReference: transactionToken,
        status: 'pending',
        redirectUrl,
        raw: { ...result, companyRef },
      };
    } catch (err: any) {
      return {
        providerReference: companyRef,
        status: 'failed',
        raw: { error: err.message },
      };
    }
  }

  async verifyPayment(providerReference: string): Promise<{ status: 'pending' | 'success' | 'failed'; raw: unknown }> {
    try {
      const result = await (this.dpo as any).checkPaymentStatus?.(providerReference)
        ?? await this.verifyToken(providerReference);

      const code = result.Result;
      if (code === '000') {
        return { status: 'success', raw: result };
      }
      if (code === '900' || code === '901') {
        return { status: 'pending', raw: result };
      }
      return { status: 'failed', raw: result };
    } catch (err: any) {
      return { status: 'pending', raw: { error: err.message } };
    }
  }

  private async verifyToken(transactionToken: string) {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${process.env.DPO_COMPANY_TOKEN}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${transactionToken}</TransactionToken>
</API3G>`;

    const res = await fetch('https://secure.3gdirectpay.com/API/v6/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Accept': 'application/xml',
      },
      body,
    });

    const xml = await res.text();
    return parseXmlResponse(xml);
  }

  async refundPayment(providerReference: string): Promise<{ ok: boolean; raw: unknown }> {
    try {
      const result = await (this.dpo as any).refundPayment?.(providerReference, 0, 'Refund');
      return { ok: result?.Result === '000', raw: result };
    } catch (err: any) {
      return { ok: false, raw: { error: err.message } };
    }
  }
}

/** Minimal XML → object parser for DPO's flat response structure. */
function parseXmlResponse(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const matches = xml.matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g);
  for (const m of matches) {
    out[m[1]] = m[2];
  }
  return out;
}
