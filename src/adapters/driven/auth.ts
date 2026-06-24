import { NotImplementedError } from "../../domain/errors";
import type { Credenciales, Sesion } from "../../domain/models";
import type { AuthPort } from "../../domain/ports";

/**
 * Login por HTTP (sin navegador: ESAN no tiene captcha).
 * Fase 1: POST a uevirtual.../verificar.php + seguir el SSO hasta acumular las 3
 * cookies (Joomla → ASP.NET_SessionId → MoodleSession). Ver RECON §3.
 */
export class EsanAuthAdapter implements AuthPort {
  async login(_cred: Credenciales): Promise<Sesion> {
    throw new NotImplementedError("EsanAuthAdapter.login (Fase 1)");
  }

  async isSessionAlive(_sesion: Sesion): Promise<boolean> {
    throw new NotImplementedError("EsanAuthAdapter.isSessionAlive (Fase 1)");
  }
}
