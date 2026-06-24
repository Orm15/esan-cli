import { NotImplementedError } from "../domain/errors";
import type { Sesion } from "../domain/models";
import type { AuthPort, CredentialStorePort, SessionStorePort } from "../domain/ports";

/**
 * Asegura una sesión viva: usa el cache; si expiró, re-loguea con la credencial
 * guardada (keychain) de forma transparente y reintenta una vez. (Fase 1)
 */
export class SessionManager {
  constructor(
    private readonly auth: AuthPort,
    private readonly sessions: SessionStorePort,
    private readonly credentials: CredentialStorePort,
  ) {}

  async ensureSession(): Promise<Sesion> {
    // TODO Fase 1: cache → ¿viva? → re-login con credencial → retry.
    void this.auth;
    void this.sessions;
    void this.credentials;
    throw new NotImplementedError("SessionManager.ensureSession (Fase 1)");
  }
}
