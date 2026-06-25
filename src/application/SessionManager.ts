import { NoAutenticadoError, SesionExpiradaError } from "../domain/errors";
import type { Credenciales, Sesion } from "../domain/models";
import type { AuthPort, SessionStorePort } from "../domain/ports";

/** Resuelve credenciales para el re-login transparente (env → keychain). `null` si no hay. */
export type CredentialResolver = () => Promise<Credenciales | null>;

/** Resuelve el usuario "esperado" (env `ESAN_USER` → config) para reconciliar la sesión cacheada. */
export type UsuarioResolver = () => Promise<string | undefined>;

/**
 * Asegura una sesión viva. Estrategia perezosa: usa la sesión cacheada sin validarla por red;
 * si una operación falla con `SesionExpiradaError`, re-loguea con la credencial guardada y
 * reintenta **una** vez (ARCHITECTURE §5). Así un comando normal hace 1 request, no 2.
 */
export class SessionManager {
  constructor(
    private readonly auth: AuthPort,
    private readonly sessions: SessionStorePort,
    private readonly resolveCreds: CredentialResolver,
    private readonly resolveUsuario: UsuarioResolver,
  ) {}

  /** Sesión utilizable: cacheada (si es del usuario esperado); si no, re-login. */
  async ensureSession(): Promise<Sesion> {
    return (await this.loadValidCache()) ?? this.relogin();
  }

  /**
   * Ejecuta `op` con una sesión viva. Si la sesión CACHEADA murió (`SesionExpiradaError`),
   * re-loguea una sola vez y reintenta. Si la sesión ya venía de un re-login fresco, no se
   * reintenta (un segundo login no arreglaría un fallo del servidor) y el error se propaga.
   */
  async withSession<T>(op: (sesion: Sesion) => Promise<T>): Promise<T> {
    const cache = await this.loadValidCache();
    const sesion = cache ?? (await this.relogin());
    try {
      return await op(sesion);
    } catch (err) {
      if (!(err instanceof SesionExpiradaError) || !cache) throw err;
      return op(await this.relogin());
    }
  }

  /** Carga la sesión cacheada solo si pertenece al usuario esperado (evita usar la de otra cuenta). */
  private async loadValidCache(): Promise<Sesion | null> {
    const cacheada = await this.sessions.load();
    if (!cacheada) return null;
    const esperado = await this.resolveUsuario();
    if (esperado && cacheada.usuario && cacheada.usuario !== esperado) return null;
    return cacheada;
  }

  /** Re-login: exige credencial (env/keychain). Sin ella → `NoAutenticadoError` accionable. */
  private async relogin(): Promise<Sesion> {
    const cred = await this.resolveCreds();
    if (!cred) throw new NoAutenticadoError();
    const sesion = await this.auth.login(cred);
    await this.sessions.save(sesion);
    return sesion;
  }
}
