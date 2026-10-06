export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency: string;
  purpose: 'promotion' | 'verification' | 'subscription';
  referenceId: string;
  description: string;
  phone?: string;
};

export type CreatePaymentResult = {
  providerReference: string;
  status: 'pending' | 'success' | 'failed';
  redirectUrl?: string;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(providerReference: string): Promise<{ status: 'pending' | 'success' | 'failed'; raw: unknown }>;
  refundPayment(providerReference: string): Promise<{ ok: boolean; raw: unknown }>;
}
