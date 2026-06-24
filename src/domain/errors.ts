/** Errores tipados del dominio (ver tabla de manejo de errores en ARCHITECTURE.md §6). */

export class EsanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotImplementedError extends EsanError {
  constructor(que: string) {
    super(`No implementado aún: ${que}`);
  }
}

/** La cookie de sesión murió (~5 min de inactividad). */
export class SesionExpiradaError extends EsanError {
  constructor() {
    super("La sesión expiró. Corre `esan login`.");
  }
}

/** Credenciales inválidas al loguear. */
export class AuthError extends EsanError {}

/** El HTML del portal cambió y el selector ya no calza. */
export class PortalParseError extends EsanError {}

/** Endpoint que ESAN devuelve con 500 (p.ej. HistoricoNotas, ver RECON §6). */
export class EndpointCaidoError extends EsanError {}

/** El WAF de Huawei bloqueó la petición. */
export class WafBlockError extends EsanError {}
