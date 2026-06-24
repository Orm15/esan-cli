import { NotImplementedError } from "../../domain/errors";
import type { Alumno, CursoNota, Pago, Sala, Sesion, SesionHorario } from "../../domain/models";
import type { PortalAcademicoPort } from "../../domain/ports";

/**
 * Adapter de Mi Portal (miportal.uesan.edu.pe, ASP.NET MVC). HTTP + cheerio.
 * Fase 2: parsear el HTML server-rendered. Los selectores irán aislados en
 * `miportal/selectors.ts` y el parseo puro en `miportal/parsers.ts`. Ver RECON §6–§7.
 */
export class MiPortalScraperAdapter implements PortalAcademicoPort {
  async getPerfil(_sesion: Sesion): Promise<Alumno> {
    throw new NotImplementedError("MiPortal.getPerfil (Fase 2)");
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
}
