import { NotImplementedError, SesionExpiradaError } from "../../domain/errors";
import type { Alumno, CursoNota, Pago, Sala, Sesion, SesionHorario } from "../../domain/models";
import type { PortalAcademicoPort } from "../../domain/ports";
import { ESAN, assertNoWaf, createClient, enMiPortal, jarFromSesion } from "./http";
import { parsePerfil } from "./miportal-parsers";

/**
 * Adapter de Mi Portal (miportal.uesan.edu.pe, ASP.NET MVC). HTTP + cheerio.
 * Fase 1: `getPerfil` (para `whoami`). Fase 2: notas, horario y pagos (RECON §6–§7).
 */
export class MiPortalScraperAdapter implements PortalAcademicoPort {
  async getPerfil(sesion: Sesion): Promise<Alumno> {
    const html = await this.fetchAutenticado(sesion, ESAN.principal);
    return parsePerfil(html);
  }

  async getNotasActuales(_sesion: Sesion): Promise<CursoNota[]> {
    throw new NotImplementedError("MiPortal.getNotasActuales (Fase 2)");
  }

  async getHorario(_sesion: Sesion): Promise<SesionHorario[]> {
    throw new NotImplementedError("MiPortal.getHorario (Fase 2)");
  }

  async getCronogramaPagos(_sesion: Sesion): Promise<Pago[]> {
    throw new NotImplementedError("MiPortal.getCronogramaPagos (Fase 2)");
  }

  async getSalasDisponibles(_sesion: Sesion, _codigos: string[]): Promise<Sala[]> {
    throw new NotImplementedError("MiPortal.getSalasDisponibles (Fase 4)");
  }

  /** GET autenticado: si el portal rebota fuera de Mi Portal, la sesión expiró (RECON §5). */
  private async fetchAutenticado(sesion: Sesion, url: string): Promise<string> {
    const client = createClient(jarFromSesion(sesion));
    const res = await client.get(url);
    assertNoWaf(res);
    if (!enMiPortal(res)) throw new SesionExpiradaError();
    return res.body;
  }
}
