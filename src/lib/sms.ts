const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL ?? "https://simba.afyacall.co.tz:8443";

export interface SmsSendResult {
  success: boolean;
  requestId?: string;
  normalizedMsisdn?: string;
  error?: string;
  httpStatus?: number;
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

  try {
    const res = await fetch(`${SMS_GATEWAY_URL}/api/v1/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        originator_conversation_id: originatorConversationId,
        request_type: "sms",
        msisdn,
        message,
      }),
      // 15 second timeout
      signal: AbortSignal.timeout(15_000),
    });

    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      // response body not JSON
    }

    if (res.ok && body.status === "success") {
      return {
        success: true,
        requestId: body.request_id as string | undefined,
        normalizedMsisdn: body.msisdn as string | undefined,
        httpStatus: res.status,
      };
    }

    const errMsg =
      Array.isArray(body.errors)
        ? (body.errors as string[]).join(", ")
        : (body.message as string | undefined) ?? `HTTP ${res.status}`;

    return { success: false, error: errMsg, httpStatus: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown network error";
    console.error("[sms] Network error:", msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}

export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SMS_GATEWAY_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return false;
    const body = await res.json() as Record<string, unknown>;
    return body.status === "UP";
  } catch {
    return false;
  }
}
