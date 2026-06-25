import { EsanError, SesionExpiradaError } from "../../domain/errors";
import type { Curso, Grabacion, Material, Sesion } from "../../domain/models";
import type { AulaVirtualPort } from "../../domain/ports";
import { ESAN, assertNoWaf, createClient, cursoUrl, enAulaVirtual, jarFromSesion } from "./http";
import { parseCursos, parseGrabaciones, parseMaterial } from "./moodle-parsers";

/**
 * Adapter del Aula Virtual (aulavirtualue.uesan.edu.pe, Moodle). HTTP + cheerio.
 * La cookie `MoodleSession` la deja el mismo login (SSO vía joomdle). Ver RECON §8.
 */
export class MoodleScraperAdapter implements AulaVirtualPort {
  async listarCursos(sesion: Sesion): Promise<Curso[]> {
    return parseCursos(await this.fetchAutenticado(sesion, ESAN.aulaHome));
  }

  async getMaterial(sesion: Sesion, courseId: string): Promise<Material[]> {
    return parseMaterial(await this.fetchAutenticado(sesion, cursoUrl(courseId)));
  }

  async getGrabaciones(sesion: Sesion, courseId: string): Promise<Grabacion[]> {
    return parseGrabaciones(await this.fetchAutenticado(sesion, cursoUrl(courseId)));
  }

  /** GET autenticado: si Moodle rebota al login, la sesión expiró (RECON §8.1). */
  private async fetchAutenticado(sesion: Sesion, url: string): Promise<string> {
    const client = createClient(jarFromSesion(sesion));
    const res = await client.get(url);
    assertNoWaf(res);
    if (!enAulaVirtual(res)) throw new SesionExpiradaError();
    // Moodle redirige a /enrol/ cuando no estás matriculado (o el courseId no existe).
    if (res.url.includes("/enrol/")) {
      throw new EsanError(
        "No tienes acceso a ese curso (no estás matriculado o el id no es válido).",
      );
    }
    return res.body;
  }
}
