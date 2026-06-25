/**
 * Casos de uso (puertos de entrada). Orquestan: asegurar sesión viva → pedir datos al adapter.
 * `withSession` centraliza el re-login transparente y el reintento ante sesión expirada.
 */
import type { Deps } from "./composition-root";
import { EsanError } from "./domain/errors";
import type {
  Alumno,
  CicloResumen,
  Curso,
  CursoNota,
  Grabacion,
  Material,
  Pago,
  Sala,
  Sesion,
  SesionHorario,
} from "./domain/models";

export async function consultarPerfil(deps: Deps): Promise<Alumno> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getPerfil(s));
}

export async function consultarNotas(deps: Deps, curso?: string): Promise<CursoNota[]> {
  const notas = await deps.sessionManager.withSession((s) =>
    deps.portalAcademico.getNotasActuales(s),
  );
  if (!curso) return notas;
  const q = curso.toLowerCase();
  return notas.filter((c) => c.curso.toLowerCase().includes(q));
}

export async function consultarHorario(deps: Deps): Promise<SesionHorario[]> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getHorario(s));
}

export async function consultarPagos(deps: Deps): Promise<Pago[]> {
  return deps.sessionManager.withSession((s) => deps.portalAcademico.getCronogramaPagos(s));
}

export async function listarCursos(deps: Deps, ciclo?: string): Promise<Curso[]> {
  const cursos = await deps.sessionManager.withSession((s) => deps.aulaVirtual.listarCursos(s));
  if (!ciclo) return cursos;
  const q = ciclo.toLowerCase();
  return cursos.filter((c) => c.ciclo.toLowerCase().includes(q));
}

/** Índice de ciclos (nombre + nº de cursos), preservando el orden del portal (más reciente primero). */
export async function listarCiclos(deps: Deps): Promise<CicloResumen[]> {
  const cursos = await listarCursos(deps);
  const orden: string[] = [];
  const conteo = new Map<string, number>();
  for (const c of cursos) {
    if (!conteo.has(c.ciclo)) orden.push(c.ciclo);
    conteo.set(c.ciclo, (conteo.get(c.ciclo) ?? 0) + 1);
  }
  return orden.map((ciclo) => ({ ciclo, cantidad: conteo.get(ciclo) ?? 0 }));
}

export async function obtenerMaterial(deps: Deps, curso: string): Promise<Material[]> {
  return deps.sessionManager.withSession(async (s) => {
    const id = await resolverCursoId(deps, s, curso);
    return deps.aulaVirtual.getMaterial(s, id);
  });
}

export async function obtenerGrabaciones(deps: Deps, curso: string): Promise<Grabacion[]> {
  return deps.sessionManager.withSession(async (s) => {
    const id = await resolverCursoId(deps, s, curso);
    return deps.aulaVirtual.getGrabaciones(s, id);
  });
}

/** Resuelve `<curso>` a un courseId de Moodle: numérico → tal cual; texto → match por nombre. */
async function resolverCursoId(deps: Deps, sesion: Sesion, arg: string): Promise<string> {
  const limpio = arg.trim();
  if (/^\d+$/.test(limpio)) return limpio;
  return matchCurso(await deps.aulaVirtual.listarCursos(sesion), limpio);
}

/**
 * Empareja un texto contra la lista de cursos. Prioriza coincidencia exacta; si varios cursos
 * coinciden por subcadena (p.ej. el mismo curso en distintos ciclos) NO elige uno al azar: lanza un
 * error listando los candidatos para que el usuario desambigüe con el courseId.
 */
export function matchCurso(cursos: Curso[], arg: string): string {
  const q = arg.trim().toLowerCase();

  const exacto = cursos.find((c) => c.nombre.toLowerCase() === q);
  if (exacto) return exacto.id;

  const matches = cursos.filter((c) => c.nombre.toLowerCase().includes(q));
  if (matches.length === 1) return matches[0]?.id ?? "";
  if (matches.length === 0) {
    throw new EsanError(
      `No encontré un curso que coincida con "${arg}". Usa \`esan cursos\` para ver la lista o pasa el courseId.`,
    );
  }
  const lista = matches.map((c) => `${c.id} ${c.nombre} (${c.ciclo})`).join("; ");
  throw new EsanError(
    `Varios cursos coinciden con "${arg}": ${lista}. Repite el comando con el courseId.`,
  );
}

export async function mostrarSalas(deps: Deps, codigos: string[]): Promise<Sala[]> {
  return deps.sessionManager.withSession((s) =>
    deps.portalAcademico.getSalasDisponibles(s, codigos),
  );
}
