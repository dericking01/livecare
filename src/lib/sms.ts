import https from "https";
import { URL } from "url";

const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL ?? "https://simba.afyacall.co.tz:8443";

// Dedicated agent that skips TLS verification for the AfyaCall SMS gateway
// (the gateway uses a self-signed certificate)
const gatewayAgent = new https.Agent({ rejectUnauthorized: false });

export interface SmsSendResult {
  success: boolean;
  requestId?: string;
  normalizedMsisdn?: string;
  error?: string;
  httpStatus?: number;
}

function httpsRequest(
  urlStr: string,
  options: { method: string; headers: Record<string, string>; body?: string; timeoutMs: number }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method,
        headers: options.headers,
        agent: gatewayAgent,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: raw }));
      }
    );
    req.setTimeout(options.timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${options.timeoutMs}ms`));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function sendSms(
  msisdn: string,
  message: string,
  originatorConversationId: string
): Promise<SmsSendResult> {
  const username = process.env.API_BASIC_USERNAME;
  const password = process.env.API_BASIC_PASSWORD;

  if (!username || !password) {
    console.error("[sms] API_BASIC_USERNAME or API_BASIC_PASSWORD not set");
    return { success: false, error: "SMS gateway credentials not configured" };
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const payload = JSON.stringify({
    originator_conversation_id: originatorConversationId,
    request_type: "sms",
    msisdn,
    message,
  });

  try {
    const { status, body: raw } = await httpsRequest(
      `${SMS_GATEWAY_URL}/api/v1/process`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload).toString(),
          Authorization: `Basic ${credentials}`,
        },
        body: payload,
        timeoutMs: 15_000,
      }
    );

    let body: Record<string, unknown> = {};
    try { body = JSON.parse(raw); } catch { /* non-JSON response */ }

    if (status >= 200 && status < 300 && body.status === "success") {
      return {
        success: true,
        requestId: body.request_id as string | undefined,
        normalizedMsisdn: body.msisdn as string | undefined,
        httpStatus: status,
      };
    }

    const errMsg =
      Array.isArray(body.errors)
        ? (body.errors as string[]).join(", ")
        : (body.message as string | undefined) ?? `HTTP ${status}`;

    return { success: false, error: errMsg, httpStatus: status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown network error";
    console.error("[sms] Network error:", msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}

export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const { status, body: raw } = await httpsRequest(
      `${SMS_GATEWAY_URL}/health`,
      { method: "GET", headers: {}, timeoutMs: 5_000 }
    );
    if (status < 200 || status >= 300) return false;
    const body = JSON.parse(raw) as Record<string, unknown>;
    return body.status === "UP";
  } catch {
    return false;
  }
}
