/**
 * Casos de uso (puertos de entrada). Orquestan: asegurar sesión viva → pedir datos al adapter.
 * `withSession` centraliza el re-login transparente y el reintento ante sesión expirada.
 */
import type { Deps } from "./composition-root";
import type {
  Alumno,
  Curso,
  CursoNota,
  Grabacion,
  Material,
  Pago,
  Sala,
  SesionHorario,
} from "./domain/models";

export async function consultarPerfil(deps: Deps): Promise<Alumno> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getPerfil(s));
}

export async function consultarNotas(deps: Deps): Promise<CursoNota[]> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getNotasActuales(s));
}

export async function consultarHorario(deps: Deps): Promise<SesionHorario[]> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getHorario(s));
}

export async function consultarPagos(deps: Deps): Promise<Pago[]> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getCronogramaPagos(s));
}

export async function listarCursos(deps: Deps): Promise<Curso[]> {
  return deps.sessionManager.withSession((s) => deps.aulaVirtual.listarCursos(s));
}

export async function obtenerMaterial(deps: Deps, courseId: string): Promise<Material[]> {
  return deps.sessionManager.withSession((s) => deps.aulaVirtual.getMaterial(s, courseId));
}

export async function obtenerGrabaciones(deps: Deps, courseId: string): Promise<Grabacion[]> {
  return deps.sessionManager.withSession((s) => deps.aulaVirtual.getGrabaciones(s, courseId));
}

export async function mostrarSalas(deps: Deps, codigos: string[]): Promise<Sala[]> {
  return deps.sessionManager.withSession((s) =>
    deps.portalAcademico.getSalasDisponibles(s, codigos),
  );
}
