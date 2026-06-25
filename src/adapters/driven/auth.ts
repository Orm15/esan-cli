import { MaxRedirectsError, TimeoutError } from "got";
import { AuthError, EsanError, WafBlockError } from "../../domain/errors";
import type { Credenciales, Sesion } from "../../domain/models";
import type { AuthPort } from "../../domain/ports";
import {
  ESAN,
  MIPORTAL_HOST,
  assertNoWaf,
  createClient,
  enMiPortal,
  jarFromSesion,
  jarToSesion,
  newJar,
} from "./http";

/**
 * Login por HTTP (sin navegador: ESAN no tiene captcha).
 * Flujo (RECON §3): POST a uevirtual.../verificar.php → el cookie jar sigue los redirects
 * del SSO y acumula las cookies de Joomla y MoodleSession; luego GET a `mi-portal` dispara
 * el SSO a Mi Portal (AutenticarUsuarioWeb) que setea `ASP.NET_SessionId`.
 */
export class EsanAuthAdapter implements AuthPort {
  async login(cred: Credenciales): Promise<Sesion> {
    const jar = newJar();
    const client = createClient(jar);

    try {
      // 1. POST de credenciales. throwHttpErrors=false → inspeccionamos la respuesta nosotros.
      const post = await client.post(ESAN.verificar, {
        form: { username: cred.usuario, password: cred.password },
        headers: { referer: ESAN.landing, origin: "https://pa.uesan.edu.pe" },
      });
      assertNoWaf(post); // un 403 del WAF aquí no debe confundirse con credenciales inválidas

      // 2. SSO a Mi Portal: con credenciales válidas terminamos en miportal/Principal (con
      //    ASP.NET_SessionId en el jar). Si no, el portal rebota al login (otro host).
      const res = await client.get(ESAN.miPortalSso);
      assertNoWaf(res);
      if (!res.url.includes(MIPORTAL_HOST)) {
        throw new AuthError("Usuario o contraseña incorrectos (no se pudo entrar a Mi Portal).");
      }
      if (res.statusCode >= 400) {
        throw new EsanError(`Mi Portal respondió ${res.statusCode} al iniciar sesión. Reintenta.`);
      }

      return jarToSesion(jar, cred.usuario);
    } catch (err) {
      if (err instanceof EsanError) throw err;
      if (err instanceof TimeoutError) {
        throw new WafBlockError("El login superó el tiempo de espera. Reintenta en unos segundos.");
      }
      if (err instanceof MaxRedirectsError) {
        throw new WafBlockError("Demasiados redirects en el login (posible WAF). Reintenta.");
      }
      throw new EsanError(
        `No se pudo conectar con ESAN: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async isSessionAlive(sesion: Sesion): Promise<boolean> {
    try {
      const client = createClient(jarFromSesion(sesion));
      return enMiPortal(await client.get(ESAN.principal));
    } catch {
      return false;
    }
  }
}
