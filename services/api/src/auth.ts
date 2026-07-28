import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { AuthenticatedUser } from "@checklist/contracts";
import { getUserByEmail, getUserById } from "./database.js";
import type { ApiDatabase } from "./database.js";

const audience = process.env.OIDC_AUDIENCE ?? "checklist-paranaiba-api";
const developmentIssuer = "https://checklist.local/development";
let remoteKeySet: ReturnType<typeof createRemoteJWKSet> | null = null;
let remoteIssuer = "";

function authMode() {
  const configured = process.env.AUTH_MODE;
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? "oidc" : "development";
}

function developmentSecret() {
  const configured = process.env.DEV_AUTH_SECRET;
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEV_AUTH_SECRET não pode ser usado implicitamente em produção.");
  }
  return new TextEncoder().encode("development-only-secret-change-before-production");
}

export async function issueDevelopmentToken(user: AuthenticatedUser) {
  if (authMode() !== "development" || process.env.NODE_ENV === "production") {
    throw new Error("DEVELOPMENT_AUTH_DISABLED");
  }
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(developmentIssuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(developmentSecret());
}

async function getRemoteKeySet() {
  const issuer = process.env.OIDC_ISSUER?.replace(/\/+$/, "");
  if (!issuer) throw new Error("OIDC_ISSUER_NOT_CONFIGURED");
  if (remoteKeySet && remoteIssuer === issuer) return { issuer, keySet: remoteKeySet };

  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("OIDC_DISCOVERY_FAILED");
  const discovery = (await response.json()) as { issuer?: string; jwks_uri?: string };
  if (!discovery.jwks_uri || discovery.issuer !== issuer) throw new Error("OIDC_DISCOVERY_INVALID");
  remoteIssuer = issuer;
  remoteKeySet = createRemoteJWKSet(new URL(discovery.jwks_uri));
  return { issuer, keySet: remoteKeySet };
}

export async function authenticate(database: ApiDatabase, authorization: string | undefined) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) throw new Error("UNAUTHENTICATED");

  if (authMode() === "development") {
    const { payload } = await jwtVerify(token, developmentSecret(), {
      issuer: developmentIssuer,
      audience,
      algorithms: ["HS256"],
    });
    const user = payload.sub ? getUserById(database.raw, payload.sub) : null;
    if (!user) throw new Error("USER_NOT_PROVISIONED");
    return user;
  }

  const { issuer, keySet } = await getRemoteKeySet();
  const { payload } = await jwtVerify(token, keySet, {
    issuer,
    audience,
    algorithms: ["RS256", "ES256"],
  });
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const user = email ? getUserByEmail(database.raw, email) : null;
  if (!user) throw new Error("USER_NOT_PROVISIONED");
  return user;
}

export function isDevelopmentAuthEnabled() {
  return authMode() === "development" && process.env.NODE_ENV !== "production";
}
