import fs from "fs";
import path from "path";
import type { PoolConfig } from "pg";

const DO_HOST = "ondigitalocean.com";

/**
 * Resolves the SSL configuration for a given connection URL.
 *
 * - Returns undefined when the URL has no sslmode (plain local connections).
 * - For the DigitalOcean host, when DATABASE_CA_CERT_PATH is set, verifies the
 *   server against that CA (sslmode=verify-full semantics: rejectUnauthorized
 *   true + hostname check).
 * - Otherwise falls back to an encrypted-but-unverified connection so other
 *   providers (e.g. Azure) without a bundled CA keep working.
 */
function resolveSsl(url: string): PoolConfig["ssl"] {
  if (!url.includes("sslmode=")) {
    return undefined;
  }

  const caPath = process.env.DATABASE_CA_CERT_PATH;
  if (caPath && url.includes(DO_HOST)) {
    const resolved = path.isAbsolute(caPath)
      ? caPath
      : path.join(process.cwd(), caPath);
    return {
      ca: fs.readFileSync(resolved).toString(),
      rejectUnauthorized: true,
    };
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
