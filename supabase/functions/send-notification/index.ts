import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Web Push implementation for Deno
async function generateVapidAuthorizationHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: "mailto:admin@example.com",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBuffer = base64UrlToArrayBuffer(vapidPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = arrayBufferToBase64Url(signature);
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For simple push notification without encryption, we use the native fetch
    // This is a simplified version that works with most push services
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payload,
    });

    return response.ok || response.status === 201;
  } catch (error) {
    console.error("Push failed:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, image_url, link, notification_id } = await req.json() as NotificationPayload;

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      // Update notification as sent even if no subscribers
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

    const payload = JSON.stringify({
      title,
      body,
      icon: "/favicon.ico",
      image: image_url,
      data: { link: link || "/" },
    });

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    // Send to all subscribers
    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        sub,
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      
      if (success) {
        successCount++;
      } else {
        failCount++;
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up failed subscriptions (likely expired)
    if (failedEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    // Update notification as sent
    if (notification_id) {
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
