import { NotImplementedError, SesionExpiradaError } from "../../domain/errors";
import type { Alumno, CursoNota, Pago, Sala, Sesion, SesionHorario } from "../../domain/models";
import type { PortalAcademicoPort } from "../../domain/ports";
import { ESAN, assertNoWaf, createClient, enMiPortal, jarFromSesion } from "./http";
import { parseHorario, parseNotas, parsePagos, parsePerfil } from "./miportal-parsers";

/**
 * Adapter de Mi Portal (miportal.uesan.edu.pe, ASP.NET MVC). HTTP + cheerio.
 * Scrapea el HTML server-rendered: perfil, notas, horario y pagos (RECON §6–§7).
 */
export class MiPortalScraperAdapter implements PortalAcademicoPort {
  async getPerfil(sesion: Sesion): Promise<Alumno> {
    return parsePerfil(await this.fetchAutenticado(sesion, ESAN.principal));
  }

  async getNotasActuales(sesion: Sesion): Promise<CursoNota[]> {
    return parseNotas(await this.fetchAutenticado(sesion, ESAN.notas));
  }

  async getHorario(sesion: Sesion): Promise<SesionHorario[]> {
    return parseHorario(await this.fetchAutenticado(sesion, ESAN.horario));
  }

  async getCronogramaPagos(sesion: Sesion): Promise<Pago[]> {
    return parsePagos(await this.fetchAutenticado(sesion, ESAN.pagos));
  }

  async getSalasDisponibles(_sesion: Sesion, _codigos: string[]): Promise<Sala[]> {
    throw new NotImplementedError("MiPortal.getSalasDisponibles (salas)");
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
