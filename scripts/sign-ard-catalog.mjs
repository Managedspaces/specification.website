// Sign the ARD AI Catalog's host trustManifest with a detached ES256 JWS.
//
// Offline signing: the private key lives in .ard-signing-key.json (gitignored),
// never in CI or Cloudflare. We commit the signed ai-catalog.json plus the
// public JWKS at public/.well-known/jwks.json.
//
//   node scripts/sign-ard-catalog.mjs --init   # one-time: generate the keypair
//   node scripts/sign-ard-catalog.mjs          # (re)sign the catalog
//   node scripts/sign-ard-catalog.mjs --check   # verify the committed signature
//
// Per the AI Catalog spec the signature covers the trustManifest only:
// canonicalise it with JCS (RFC 8785) after removing `signature`, then sign the
// canonical bytes as a detached JWS (RFC 7515) with ES256 (P-256). Verifiers
// resolve the key from the HTTPS `identity` URL (the JWKS) by the JWS `kid`.

import { readFile, writeFile, access } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = join(root, "public/.well-known/ai-catalog.json");
const JWKS = join(root, "public/.well-known/jwks.json");
const KEYFILE = join(root, ".ard-signing-key.json");

const enc = new TextEncoder();
const b64url = (buf) => Buffer.from(buf).toString("base64url");
const EC = { name: "ECDSA", namedCurve: "P-256" };
const SIGN = { name: "ECDSA", hash: "SHA-256" };

// RFC 8785 JSON Canonicalisation, restricted to the value types the trust
// manifest uses (string, boolean, null, array, object). Numbers would need
// the spec's float serialisation; we deliberately reject them so a future
// numeric field can't silently produce a non-canonical signature.
function jcs(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    throw new Error(
      "jcs: numeric values are not supported in the trust manifest",
    );
  }
  if (Array.isArray(value)) {
    return "[" + value.map(jcs).join(",") + "]";
  }
  // Object keys sorted by UTF-16 code unit — JS default string sort.
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + jcs(value[k])).join(",") +
    "}"
  );
}

// RFC 7638 JWK thumbprint for an EC key.
async function thumbprint(jwk) {
  const ordered = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(jcs(ordered)));
  return b64url(hash);
}

async function signDetached(pkcs8b64, kid, payloadBytes) {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(pkcs8b64, "base64url"),
    EC,
    false,
    ["sign"],
  );
  const header = b64url(enc.encode(JSON.stringify({ alg: "ES256", kid })));
  const signingInput = header + "." + b64url(payloadBytes);
  const sig = await crypto.subtle.sign(SIGN, key, enc.encode(signingInput));
  // Detached JWS: payload omitted from the compact serialisation.
  return header + ".." + b64url(sig);
}

async function verifyDetached(publicJwk, detached, payloadBytes) {
  const [header, , sig] = detached.split(".");
  const key = await crypto.subtle.importKey("jwk", publicJwk, EC, false, [
    "verify",
  ]);
  const signingInput = header + "." + b64url(payloadBytes);
  return crypto.subtle.verify(
    SIGN,
    key,
    Buffer.from(sig, "base64url"),
    enc.encode(signingInput),
  );
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

async function writeJson(p, obj) {
  await writeFile(p, JSON.stringify(obj, null, 2) + "\n");
}

async function initKey() {
  if (await fileExists(KEYFILE)) {
    throw new Error(
      `${KEYFILE} already exists — refusing to overwrite an existing key`,
    );
  }
  const kp = await crypto.subtle.generateKey(EC, true, ["sign", "verify"]);
  const pkcs8 = b64url(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const kid = await thumbprint(pub);
  await writeJson(KEYFILE, { kid, pkcs8 });
  const jwks = {
    keys: [
      {
        kty: pub.kty,
        crv: pub.crv,
        x: pub.x,
        y: pub.y,
        use: "sig",
        alg: "ES256",
        kid,
      },
    ],
  };
  await writeJson(JWKS, jwks);
  console.log(`  generated keypair (kid ${kid})`);
  console.log(
    `  wrote private key → ${KEYFILE} (gitignored — move to secure storage)`,
  );
  console.log(`  wrote public JWKS → public/.well-known/jwks.json`);
  return { pkcs8, kid };
}

function payloadOf(catalog) {
  const tm = catalog?.host?.trustManifest;
  if (!tm) throw new Error("catalog has no host.trustManifest");
  // Sign over the trustManifest WITHOUT its signature field (JCS bytes).
  const rest = { ...tm };
  delete rest.signature;
  return enc.encode(jcs(rest));
}

async function sign() {
  const key = await readJson(KEYFILE);
  const catalog = await readJson(CATALOG);
  const payload = payloadOf(catalog);
  const detached = await signDetached(key.pkcs8, key.kid, payload);
  catalog.host.trustManifest.signature = detached;
  await writeJson(CATALOG, catalog);

  const jwks = await readJson(JWKS);
  const pub = jwks.keys.find((k) => k.kid === key.kid);
  const ok = await verifyDetached(pub, detached, payload);
  if (!ok) throw new Error("self-verification failed after signing");
  console.log(
    `  signed host.trustManifest (kid ${key.kid}) and verified against JWKS ✓`,
  );
}

async function check() {
  const catalog = await readJson(CATALOG);
  const jwks = await readJson(JWKS);
  const detached = catalog?.host?.trustManifest?.signature;
  if (!detached) throw new Error("no signature on host.trustManifest");
  const kid = JSON.parse(
    Buffer.from(detached.split(".")[0], "base64url").toString(),
  ).kid;
  const pub = jwks.keys.find((k) => k.kid === kid);
  if (!pub) throw new Error(`JWKS has no key with kid ${kid}`);
  const ok = await verifyDetached(pub, detached, payloadOf(catalog));
  if (!ok) throw new Error("signature does NOT verify — re-run the signer");
  console.log(`  signature verifies against JWKS (kid ${kid}) ✓`);
}

const mode = process.argv[2];
if (mode === "--init") {
  await initKey();
  await sign();
} else if (mode === "--check") {
  await check();
} else {
  if (!(await fileExists(KEYFILE))) {
    console.error(
      `No signing key at ${KEYFILE}. Run \`node scripts/sign-ard-catalog.mjs --init\` first,\n` +
        `or restore the key from secure storage.`,
    );
    process.exit(1);
  }
  await sign();
}
