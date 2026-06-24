import got, { type Got } from "got";

/** UA de navegador real: necesario para no ser filtrado por el WAF de Huawei (RECON §5). */
export const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

/**
 * Cliente HTTP base. En Fase 1 se le inyecta el cookie jar (tough-cookie) para
 * mantener las 3 cookies de sesión y seguir los redirects del login.
 */
export function createHttpClient(): Got {
  return got.extend({
    followRedirect: true,
    headers: { "user-agent": USER_AGENT },
    retry: { limit: 2 },
    throwHttpErrors: false,
  });
}
