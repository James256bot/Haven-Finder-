import type { PaymentProvider } from './provider';
import { HavenPayDevProvider } from './dev-provider';
import { DpoPayProvider } from './dpo-provider';

const USE_DPO = !!process.env.DPO_COMPANY_TOKEN && !!process.env.DPO_SERVICE_TYPE;

export const paymentProvider: PaymentProvider = USE_DPO
  ? new DpoPayProvider()
  : new HavenPayDevProvider();

console.log(`[payments] using provider: ${paymentProvider.name}`);
