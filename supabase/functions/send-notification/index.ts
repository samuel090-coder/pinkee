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

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Generate ECDH key pair for encryption
async function generateLocalKeys(): Promise<{ privateKey: CryptoKey; publicKey: Uint8Array }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  return {
    privateKey: keyPair.privateKey,
    publicKey: new Uint8Array(publicKeyRaw),
  };
}

// HKDF implementation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", 
    ikm.buffer as ArrayBuffer, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  const saltToUse = salt.length ? salt : new Uint8Array(32);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, saltToUse.buffer as ArrayBuffer));
  
  const prkKey = await crypto.subtle.importKey(
    "raw", 
    prk.buffer as ArrayBuffer, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter.buffer as ArrayBuffer));
  return okm.slice(0, length);
}

// Create info for HKDF
function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  const info = new Uint8Array(
    18 + typeBytes.length + 1 + 5 + 2 + clientPublicKey.length + 2 + serverPublicKey.length
  );
  
  let offset = 0;
  const infoView = new DataView(info.buffer);
  
  // "Content-Encoding: "
  const contentEncoding = encoder.encode("Content-Encoding: ");
  info.set(contentEncoding, offset);
  offset += contentEncoding.length;
  
  // type
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  
  // null byte
  info[offset++] = 0;
  
  // "P-256"
  const p256 = encoder.encode("P-256");
  info.set(p256, offset);
  offset += p256.length;
  
  // client public key length and key
  infoView.setUint16(offset, clientPublicKey.length, false);
  offset += 2;
  info.set(clientPublicKey, offset);
  offset += clientPublicKey.length;
  
  // server public key length and key
  infoView.setUint16(offset, serverPublicKey.length, false);
  offset += 2;
  info.set(serverPublicKey, offset);
  
  return info;
}

// Encrypt the payload using Web Push encryption
async function encryptPayload(
  payload: string,
  subscription: PushSubscription
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  
  // Generate local ECDH keys
  const { privateKey: localPrivateKey, publicKey: localPublicKey } = await generateLocalKeys();
  
  // Import subscriber's public key
  const clientPublicKeyBytes = base64UrlToUint8Array(subscription.p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    localPrivateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);
  
  // Get auth secret
  const authSecret = base64UrlToUint8Array(subscription.auth);
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive PRK
  const authInfo = encoder.encode("Content-Encoding: auth\0");
  const prk = await hkdf(authSecret, sharedSecret, authInfo, 32);
  
  // Derive content encryption key
  const cekInfo = createInfo("aesgcm", clientPublicKeyBytes, localPublicKey);
  const cek = await hkdf(salt, prk, cekInfo, 16);
  
  // Derive nonce
  const nonceInfo = createInfo("nonce", clientPublicKeyBytes, localPublicKey);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);
  
  // Add padding (2 bytes for padding length + padding + payload)
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);
  
  // Encrypt
  const key = await crypto.subtle.importKey(
    "raw", 
    cek.buffer as ArrayBuffer, 
    { name: "AES-GCM" }, 
    false, 
    ["encrypt"]
  );
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce.buffer as ArrayBuffer },
    key,
    paddedPayload.buffer as ArrayBuffer
  );
  
  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    salt,
    localPublicKey,
  };
}

// Create JWT for VAPID
async function createVapidJwt(
  endpoint: string,
  vapidPrivateKeyBase64: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: "mailto:admin@example.com",
  };
  
  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import private key (PKCS8 format)
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKeyBase64);
  
  // Build PKCS8 wrapper for raw private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  
  const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Key.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  // Sign
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );
  
  // Convert DER signature to raw format
  const signature = new Uint8Array(signatureBuffer);
  const signatureB64 = uint8ArrayToBase64Url(derToRaw(signature));
  
  return `${unsignedToken}.${signatureB64}`;
}

// Convert DER signature to raw format (64 bytes)
function derToRaw(derSignature: Uint8Array): Uint8Array {
  // Check if it's already raw format (64 bytes)
  if (derSignature.length === 64) {
    return derSignature;
  }
  
  // Parse DER format
  const raw = new Uint8Array(64);
  let offset = 2; // Skip sequence header
  
  // R value
  if (derSignature[offset] !== 0x02) throw new Error("Invalid DER signature");
  offset++;
  let rLength = derSignature[offset++];
  let rStart = offset;
  if (derSignature[rStart] === 0) {
    rStart++;
    rLength--;
  }
  raw.set(derSignature.slice(rStart, rStart + Math.min(rLength, 32)), 32 - Math.min(rLength, 32));
  offset += derSignature[offset - rLength - 1 === 0 ? rLength + 1 : rLength];
  
  // S value
  if (derSignature[offset] !== 0x02) throw new Error("Invalid DER signature");
  offset++;
  let sLength = derSignature[offset++];
  let sStart = offset;
  if (derSignature[sStart] === 0) {
    sStart++;
    sLength--;
  }
  raw.set(derSignature.slice(sStart, sStart + Math.min(sLength, 32)), 64 - Math.min(sLength, 32));
  
  return raw;
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    console.log(`Sending to endpoint: ${subscription.endpoint}`);
    
    // Encrypt payload
    const { ciphertext, salt, localPublicKey } = await encryptPayload(payload, subscription);
    
    // Create VAPID JWT
    const jwt = await createVapidJwt(subscription.endpoint, vapidPrivateKey);
    
    // Build request
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aesgcm",
        "Encryption": `salt=${uint8ArrayToBase64Url(salt)}`,
        "Crypto-Key": `dh=${uint8ArrayToBase64Url(localPublicKey)};p256ecdsa=${vapidPublicKey}`,
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "TTL": "86400",
      },
      body: ciphertext.buffer as ArrayBuffer,
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
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    console.log("Starting notification send...");
    console.log("VAPID public key exists:", !!vapidPublicKey);
    console.log("VAPID private key exists:", !!vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, image_url, link, notification_id } = await req.json() as NotificationPayload;
    console.log("Notification payload:", { title, body, link });

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError) {
      console.error("Failed to fetch subscriptions:", subError);
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`Found ${subscriptions?.length || 0} subscribers`);

    if (!subscriptions || subscriptions.length === 0) {
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

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/favicon.ico",
      image: image_url,
      data: { link: link || "/" },
    });

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];
    const errors: string[] = [];

    // Send to all subscribers
    for (const sub of subscriptions) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      );
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        // Only mark as failed (for cleanup) if it's a permanent error (410 Gone or 404)
        if (result.status === 410 || result.status === 404) {
          failedEndpoints.push(sub.endpoint);
        }
        if (result.error) {
          errors.push(result.error);
        }
      }
    }

    console.log(`Results: ${successCount} success, ${failCount} failed`);

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
      console.log(`Cleaning up ${failedEndpoints.length} expired subscriptions`);
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
