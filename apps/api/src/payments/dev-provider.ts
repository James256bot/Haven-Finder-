import { randomUUID } from 'node:crypto';
import type { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from './provider';

/**
 * DEVELOPMENT ONLY. Never processes real money.
 * Every payment returns status='pending' and must be manually confirmed
 * by an admin via PATCH /admin/promotions/:id/mark-paid.
 */
export class HavenPayDevProvider implements PaymentProvider {
  readonly name = 'dev';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const ref = `DEV_${randomUUID().slice(0, 8).toUpperCase()}`;
    console.log(`[DEVP-PAY] ${ref} — ${input.currency} ${input.amount} for ${input.purpose}`);
    return {
      providerReference: ref,
      status: 'pending',
      raw: { mode: 'dev', simulated: true, input },
    };
  }

  async verifyPayment(): Promise<{ status: 'pending' | 'success' | 'failed'; raw: unknown }> {
    return { status: 'pending', raw: { mode: 'dev' } };
  }

  async refundPayment(): Promise<{ ok: boolean; raw: unknown }> {
    return { ok: true, raw: { mode: 'dev', refunded: true } };
  }
}

export const paymentProvider: PaymentProvider = new HavenPayDevProvider();
