/**
 * Casos de uso (puertos de entrada). Orquestan: asegurar sesión → pedir datos al adapter.
 * No conocen la infraestructura concreta; reciben el contenedor `Deps`.
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
  const s = await deps.sessionManager.ensureSession();
  return deps.portalAcademico.getPerfil(s);
}

export async function consultarNotas(deps: Deps): Promise<CursoNota[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.portalAcademico.getNotasActuales(s);
}

export async function consultarHorario(deps: Deps): Promise<SesionHorario[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.portalAcademico.getHorario(s);
}

export async function consultarPagos(deps: Deps): Promise<Pago[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.portalAcademico.getCronogramaPagos(s);
}

export async function listarCursos(deps: Deps): Promise<Curso[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.aulaVirtual.listarCursos(s);
}

export async function obtenerMaterial(deps: Deps, courseId: string): Promise<Material[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.aulaVirtual.getMaterial(s, courseId);
}

export async function obtenerGrabaciones(deps: Deps, courseId: string): Promise<Grabacion[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.aulaVirtual.getGrabaciones(s, courseId);
}

export async function mostrarSalas(deps: Deps, codigos: string[]): Promise<Sala[]> {
  const s = await deps.sessionManager.ensureSession();
  return deps.portalAcademico.getSalasDisponibles(s, codigos);
}
