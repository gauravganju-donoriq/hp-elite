import fs from "fs";
import path from "path";
import type { PoolConfig } from "pg";

const DO_HOST = "ondigitalocean.com";

/**
 * Returns the DigitalOcean CA certificate (PEM), or undefined if unavailable.
 *
 * Prefers DATABASE_CA_CERT (the PEM contents, used on Vercel where files
 * outside the traced bundle aren't available) over DATABASE_CA_CERT_PATH
 * (a file path, used locally).
 */
function loadCaCert(): string | undefined {
  const cert = process.env.DATABASE_CA_CERT;
  if (cert) {
    return cert;
  }

  const caPath = process.env.DATABASE_CA_CERT_PATH;
  if (caPath) {
    const resolved = path.isAbsolute(caPath)
      ? caPath
      : path.join(process.cwd(), caPath);
    return fs.readFileSync(resolved).toString();
  }

  return undefined;
}

/**
 * Resolves the SSL configuration for a given connection URL.
 *
 * - Returns undefined when the URL has no sslmode (plain local connections).
 * - For the DigitalOcean host, when a CA cert is available (see loadCaCert),
 *   verifies the server against it (sslmode=verify-full semantics:
 *   rejectUnauthorized true + hostname check).
 * - Otherwise falls back to an encrypted-but-unverified connection so other
 *   providers (e.g. Azure) without a bundled CA keep working.
 */
function resolveSsl(url: string): PoolConfig["ssl"] {
  if (!url.includes("sslmode=")) {
    return undefined;
  }

  if (url.includes(DO_HOST)) {
    const ca = loadCaCert();
    if (ca) {
      return { ca, rejectUnauthorized: true };
    }
  }

  return { rejectUnauthorized: false };
}

/**
 * Strips sslmode/sslrootcert from the connection string.
 *
 * pg builds its client config with `Object.assign(config, parse(connectionString))`,
 * so pg-connection-string's parsed ssl (an empty `{}` for any sslmode) would
 * override our explicit `ssl` option and drop the CA. Removing these params
 * lets our resolved ssl config take effect.
 */
function stripSslParams(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("sslrootcert");
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Builds a pg Pool config (connectionString + ssl) for a specific URL. */
export function poolConfigFor(url: string | undefined): PoolConfig {
  const raw = url ?? "";
  return {
    connectionString: stripSslParams(raw),
    ssl: resolveSsl(raw),
  };
}

/** Builds a pg Pool config from the primary DATABASE_URL env var. */
export function getPoolConfig(): PoolConfig {
  return poolConfigFor(process.env.DATABASE_URL);
}
