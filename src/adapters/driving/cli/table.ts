import Table from "cli-table3";
import type { IO } from "./io";

/** Ancho de la terminal (columnas). Fallback razonable si no es TTY (pipe/redirección). */
export function terminalWidth(): number {
  const c = process.stdout.columns;
  return c && c > 0 ? c : 100;
}

export interface Columna {
  header: string;
  key: string;
  min?: number; // ancho mínimo de contenido (def. 5)
  max?: number; // ancho máximo de contenido
  truncar?: boolean; // true → corta con "…" (p.ej. URLs); por defecto hace word-wrap
  protegida?: boolean; // true → no se encoge (datos cortos y críticos: clave, id, hora, monto)
}

const PAD = 2; // padding de celda de cli-table3 (1 a cada lado)
const PISO = 3 + PAD; // ancho duro mínimo de una columna flexible

type Calc = { col: Columna; contenido: number; natural: number; w: number };

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return typeof valor === "object" ? JSON.stringify(valor) : String(valor);
}

function recorta(s: string, n: number): string {
  const max = Math.max(1, n);
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Reparte `presupuesto` entre un grupo de columnas, proporcional al contenido, con piso duro. */
function distribuir(grupo: Calc[], presupuesto: number): void {
  const sumaContenido = grupo.reduce((a, c) => a + c.contenido, 0) || 1;
  for (const c of grupo) {
    const piso = Math.max(PISO, (c.col.min ?? 5) + PAD);
    c.w = Math.max(
      PISO,
      Math.min(piso, c.natural),
      Math.floor(presupuesto * (c.contenido / sumaContenido)),
    );
  }
  let total = grupo.reduce((a, c) => a + c.w, 0);
  let guard = 0;
  while (total > presupuesto && guard++ < 3000) {
    const c = grupo.reduce((m, x) => (x.w > m.w ? x : m));
    if (c.w <= PISO) break;
    c.w -= 1;
    total -= 1;
  }
}

/**
 * Construye una tabla que SIEMPRE cabe en `ancho`: calcula anchos a partir del contenido y, si no
 * entra, encoge SOLO las columnas no protegidas (word-wrap o truncado), dejando intactas las cortas
 * y críticas (clave, id, hora…). Devuelve el texto (sin color) o "(sin resultados)" si no hay filas.
 */
export function construirTabla(
  columnas: Columna[],
  filas: ReadonlyArray<object>,
  ancho = terminalWidth(),
): string {
  if (columnas.length === 0 || filas.length === 0) return "(sin resultados)";

  const valor = (fila: object, c: Columna) => texto((fila as Record<string, unknown>)[c.key]);

  const cols: Calc[] = columnas.map((c) => {
    const contenido = Math.max(c.header.length, ...filas.map((f) => valor(f, c).length));
    const natural = Math.min(contenido, c.max ?? contenido) + PAD;
    return { col: c, contenido, natural, w: natural };
  });

  // cli-table3 añade (nº columnas + 1) bordes; el resto es presupuesto para los colWidths.
  const presupuesto = Math.max(columnas.length * PISO, ancho - (columnas.length + 1));
  const naturalTotal = cols.reduce((a, c) => a + c.natural, 0);

  if (naturalTotal > presupuesto) {
    const protegidas = cols.filter((c) => c.col.protegida);
    const flexibles = cols.filter((c) => !c.col.protegida);
    const protTotal = protegidas.reduce((a, c) => a + c.natural, 0);

    if (flexibles.length > 0 && presupuesto - protTotal >= flexibles.length * PISO) {
      // Protegidas mantienen su ancho natural; el resto del presupuesto se reparte entre las flexibles.
      distribuir(flexibles, presupuesto - protTotal);
    } else {
      // Caso degenerado (terminal muy angosta): encoger todo.
      distribuir(cols, presupuesto);
    }
  }

  const table = new Table({
    head: columnas.map((c) => c.header),
    colWidths: cols.map((c) => c.w),
    wordWrap: true,
    wrapOnWordBoundary: true,
    style: { head: [], border: [] }, // sin color → ancho visible == longitud
  });

  for (const fila of filas) {
    table.push(
      cols.map((c) => {
        const s = valor(fila, c.col);
        return c.col.truncar ? recorta(s, c.w - PAD) : s;
      }),
    );
  }
  return table.toString();
}

/** Imprime una tabla responsive por `io` (o "(sin resultados)" si está vacía). */
export function renderTabla(io: IO, columnas: Columna[], filas: ReadonlyArray<object>): void {
  io.info(construirTabla(columnas, filas));
}
