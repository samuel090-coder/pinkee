import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushHTTPRequest } from "https://esm.sh/@pushforge/builder@1.1.0";
import { p256 } from "https://esm.sh/@noble/curves@1.7.0/p256";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  title: string;
  body: string;
  image_url?: string;
  link?: string;
  notification_id?: string;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function base64UrlToUint8Array(base64urlOrBase64: string): Uint8Array {
  const cleaned = base64urlOrBase64.replace(/\s+/g, "");
  const base64 = cleaned.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64UrlToUint8Array(b64);
}

async function privateKeyEnvToJwk(privateKeyEnv: string): Promise<JsonWebKey> {
  const raw = privateKeyEnv.trim();

  // 1) JSON JWK (PushForge native)
  if (raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.kty !== "EC") throw new Error("VAPID private key JWK must be an EC key");
    return parsed as JsonWebKey;
  }

  // 2) PEM / PKCS8 DER (we export to JWK)
  const maybeDer = raw.includes("BEGIN") ? pemToDer(raw) : base64UrlToUint8Array(raw);
  if (maybeDer.length > 32 && maybeDer[0] === 0x30) {
    try {
      const key = await crypto.subtle.importKey(
        "pkcs8",
        maybeDer.buffer as ArrayBuffer,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
      );
      const jwk = await crypto.subtle.exportKey("jwk", key);
      return jwk;
    } catch (e) {
      console.log("Failed to import PKCS8 VAPID private key; will try raw-32 fallback.", e);
    }
  }

  // 3) Raw 32-byte private key (base64url/base64) → derive x/y
  const dBytes = base64UrlToUint8Array(raw);
  if (dBytes.length !== 32) {
    throw new Error(`Unsupported VAPID_PRIVATE_KEY format (decoded length=${dBytes.length}). Use JWK JSON, PKCS8 PEM, or 32-byte base64url.`);
  }

  const pub = p256.getPublicKey(dBytes, false); // 65 bytes, 0x04 + X(32) + Y(32)
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);

  return {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(dBytes),
    ext: true,
  };
}

async function sendWebPush(
  subscription: PushSubscriptionRow,
  messagePayload: unknown,
  privateJwk: JsonWebKey
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK: privateJwk,
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      message: {
        payload: messagePayload as any,
        options: {
          ttl: 86400,
          urgency: "normal",
        },
        adminContact: "mailto:admin@example.com",
      },
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    console.log(`Push response status: ${response.status}`);

    if (!response.ok && response.status !== 201) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Push failed: ${response.status} - ${errorText}`);
      return { success: false, status: response.status, error: errorText };
    }

    return { success: true, status: response.status };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Push error:", error);
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;

    console.log("Starting notification send...");
    console.log("VAPID public key exists:", !!vapidPublicKey);
    console.log("VAPID private key exists:", !!vapidPrivateKey);

    const privateJwk = await privateKeyEnvToJwk(vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, image_url, link, notification_id } = (await req.json()) as NotificationPayload;
    console.log("Notification payload:", { title, body, link });

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth");

    if (subError) {
      console.error("Failed to fetch subscriptions:", subError);
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`Found ${subscriptions?.length || 0} subscribers`);

    if (!subscriptions || subscriptions.length === 0) {
      // Nothing to send, but we can still mark the notification row as sent.
      if (notification_id) {
        await supabase
          .from("notifications")
          .update({ is_sent: true, sent_at: new Date().toISOString() })
          .eq("id", notification_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "No subscribers to notify", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payloadObject = {
      title,
      body,
      icon: "/favicon.ico",
      image: image_url ?? undefined,
      data: { link: link || "/" },
    };

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];
    const errors: string[] = [];

    for (const sub of subscriptions as PushSubscriptionRow[]) {
      console.log(`Sending to endpoint: ${sub.endpoint}`);

      const result = await sendWebPush(sub, payloadObject, privateJwk);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        if (result.status === 410 || result.status === 404) {
          failedEndpoints.push(sub.endpoint);
        }
        if (result.error) errors.push(result.error);
      }
    }

    console.log(`Results: ${successCount} success, ${failCount} failed`);

    if (failedEndpoints.length > 0) {
      console.log(`Cleaning up ${failedEndpoints.length} expired subscriptions`);
      await supabase.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
    }

    // Mark as sent only if at least one delivery succeeded.
    if (notification_id && successCount > 0) {
      await supabase
        .from("notifications")
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq("id", notification_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        cleaned: failedEndpoints.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

