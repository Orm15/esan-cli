import { NotImplementedError } from "../../domain/errors";
import type { Curso, Grabacion, Material, Sesion } from "../../domain/models";
import type { AulaVirtualPort } from "../../domain/ports";

/**
 * Adapter del Aula Virtual (aulavirtualue.uesan.edu.pe, Moodle). HTTP + cheerio.
 * Fase 3: parsear home (cursos), course/view.php (material) y grabaciones
 * (link Zoom + "Clave de acceso"). Ver RECON §8.
 */
export class MoodleScraperAdapter implements AulaVirtualPort {
  async listarCursos(_sesion: Sesion): Promise<Curso[]> {
    throw new NotImplementedError("Moodle.listarCursos (Fase 3)");
  }

  async getMaterial(_sesion: Sesion, _courseId: string): Promise<Material[]> {
    throw new NotImplementedError("Moodle.getMaterial (Fase 3)");
  }

  async getGrabaciones(_sesion: Sesion, _courseId: string): Promise<Grabacion[]> {
    throw new NotImplementedError("Moodle.getGrabaciones (Fase 3)");
  }
}
