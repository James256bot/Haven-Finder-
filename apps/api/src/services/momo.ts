import * as https from 'node:https';

const SUB_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
const API_USER = process.env.MOMO_API_USER;
const API_KEY = process.env.MOMO_API_KEY;
const HOST = 'sandbox.momodeveloper.mtn.com';

function httpsRequest(opts: {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        port: 443,
        method: opts.method,
        path: opts.path,
        headers: {
          ...opts.headers,
          ...(opts.body ? { 'Content-Length': Buffer.byteLength(opts.body).toString() } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function getAccessToken(): Promise<string> {
  if (!SUB_KEY || !API_USER || !API_KEY) throw new Error('MTN credentials missing');
  const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
  const res = await httpsRequest({
    method: 'POST',
    path: '/collection/token/',
    headers: {
      Authorization: `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': SUB_KEY,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (res.status !== 200) throw new Error(`Token ${res.status}: ${res.body}`);
  const data = JSON.parse(res.body);
  return data.access_token;
}

export async function requestMoMoPayment(amount: string, phone: string, refId: string) {
  try {
    const token = await getAccessToken();
    const body = JSON.stringify({
      amount,
      currency: 'EUR',
      externalId: refId,
      payer: { partyIdType: 'MSISDN', partyId: phone },
      payerMessage: 'HavenFinder Boost',
      payeeNote: 'Listing promotion',
    });
    const res = await httpsRequest({
      method: 'POST',
      path: '/collection/v1_0/requesttopay',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': refId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': SUB_KEY!,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (res.status === 202) {
      return { success: true, referenceId: refId };
    }
    return { success: false, error: `HTTP ${res.status}: ${res.body}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function checkMoMoStatus(refId: string): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const token = await getAccessToken();
    const res = await httpsRequest({
      method: 'GET',
      path: `/collection/v1_0/requesttopay/${refId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': SUB_KEY!,
      },
    });
    if (res.status !== 200) {
      return { success: false, error: `HTTP ${res.status}: ${res.body.slice(0, 200)}` };
    }
    const data = JSON.parse(res.body);
    return { success: true, status: data.status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
