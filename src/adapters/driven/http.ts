import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import got, { type Got, type Hooks } from "got";
import { CookieJar } from "tough-cookie";
import { paths } from "../../config/paths";
import { WafBlockError } from "../../domain/errors";
import type { Sesion } from "../../domain/models";

/** UA de navegador real: necesario para no ser filtrado por el WAF de Huawei (RECON §5). */
export const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

/** TTL informativo de la sesión (~5 min de inactividad, RECON §5). La expiración real se detecta
 *  de forma perezosa cuando el portal rebota al login. */
export const SESSION_TTL_MS = 5 * 60 * 1000;

/** URLs del flujo de auth y de Mi Portal (RECON §3, §6). */
export const ESAN = {
  verificar: "https://uevirtual.ue.edu.pe/intranet/verificar.php",
  miPortalSso: "https://uevirtual.ue.edu.pe/intranet/index.php/mi-portal",
  principal: "https://miportal.uesan.edu.pe/GestionSeguridad/Principal",
  horario: "https://miportal.uesan.edu.pe/GestionSeguridad/Principal/Horario",
  notas: "https://miportal.uesan.edu.pe/GestionAcademica/Notas/NotasActuales",
  pagos: "https://miportal.uesan.edu.pe/GestionAcademica/Pagos/CronogramaPagos",
  logout: "https://miportal.uesan.edu.pe/GestionSeguridad/Acceso/CerrarSesionUsuario",
  aulaBase: "https://aulavirtualue.uesan.edu.pe",
  aulaHome: "https://aulavirtualue.uesan.edu.pe/",
  landing: "https://pa.uesan.edu.pe/",
} as const;

/** URL del contenido de un curso del Aula Virtual (Moodle). */
export function cursoUrl(courseId: string): string {
  return `${ESAN.aulaBase}/course/view.php?id=${encodeURIComponent(courseId)}`;
}

/** Host de Mi Portal: si tras seguir redirects NO seguimos aquí, la sesión rebotó al login. */
export const MIPORTAL_HOST = "miportal.uesan.edu.pe";
export const AULA_HOST = "aulavirtualue.uesan.edu.pe";

/** Vista mínima de una respuesta para clasificarla (status + URL final tras redirects). */
type RespLike = { statusCode: number; url: string };

/** ¿Aterrizamos en Mi Portal con éxito? Única fuente de verdad de "sesión válida en miportal". */
export function enMiPortal(res: RespLike): boolean {
  return res.statusCode < 400 && res.url.includes(MIPORTAL_HOST);
}

/** ¿Sesión válida en el Aula Virtual (Moodle)? Si rebota a `/login/`, la sesión murió. */
export function enAulaVirtual(res: RespLike): boolean {
  return res.statusCode < 400 && res.url.includes(AULA_HOST) && !res.url.includes("/login/");
}

/** El WAF de Huawei responde 403 desnudo. Se chequea en TODA respuesta (POST y GET). */
export function assertNoWaf(res: RespLike): void {
  if (res.statusCode === 403) {
    throw new WafBlockError("El WAF de ESAN bloqueó la petición. Reintenta en unos segundos.");
  }
}

export function newJar(): CookieJar {
  return new CookieJar();
}

/** Serializa el cookie jar a la `Sesion` persistible (nunca contiene la contraseña). */
export function jarToSesion(jar: CookieJar, usuario = "", previa?: Sesion): Sesion {
  const ahora = Date.now();
  return {
    usuario,
    cookies: JSON.stringify(jar.toJSON()),
    creadaEn: previa?.creadaEn ?? ahora,
    expiraEn: ahora + SESSION_TTL_MS,
  };
}

/** Reconstruye el cookie jar desde una `Sesion` cacheada. */
export function jarFromSesion(sesion: Sesion): CookieJar {
  return CookieJar.fromJSON(JSON.parse(sesion.cookies));
}

/** Vuelca el HTML de cada respuesta a ~/.cache/esan-cli/debug (0600) cuando ESAN_DEBUG está activo.
 *  ⚠️ El HTML puede contener PII del alumno → se restringen permisos. */
function debugHooks(): Partial<Hooks> | undefined {
  if (!process.env.ESAN_DEBUG) return undefined;
  return {
    afterResponse: [
      (response) => {
        try {
          const dir = `${paths.cache}/debug`;
          mkdirSync(dir, { recursive: true, mode: 0o700 });
          const slug = String(response.url || "resp")
            .replace(/^https?:\/\//, "")
            .replace(/[^a-z0-9]+/gi, "_")
            .slice(0, 120);
          const file = `${dir}/${slug}.html`;
          const body = typeof response.body === "string" ? response.body : "";
          writeFileSync(file, body, { mode: 0o600 });
          chmodSync(file, 0o600); // writeFileSync no rebaja permisos si el archivo ya existía
        } catch {
          // el debug nunca debe romper la petición
        }
        return response;
      },
    ],
  };
}

/**
 * Cliente HTTP ligado a un cookie jar: mantiene las 3 cookies de sesión (Joomla →
 * ASP.NET_SessionId → MoodleSession) y sigue los redirects 302/303 del login (RECON §3).
 * `retry.statusCodes: []` → los 5xx se devuelven al adapter para que los clasifique (no se
 * reintentan); los errores de red transitorios sí se reintentan una vez en GET.
 */
export function createClient(jar: CookieJar): Got {
  return got.extend({
    cookieJar: jar,
    followRedirect: true,
    maxRedirects: 20,
    throwHttpErrors: false,
    timeout: { request: 25_000 },
    headers: { "user-agent": USER_AGENT },
    retry: { limit: 1, methods: ["GET"], statusCodes: [] },
    hooks: debugHooks(),
  });
}
