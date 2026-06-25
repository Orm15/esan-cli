import * as cheerio from "cheerio";
import { PortalParseError } from "../../domain/errors";
import type {
  Alumno,
  ComponenteEvaluacion,
  CursoNota,
  Pago,
  SesionHorario,
} from "../../domain/models";

/**
 * Extrae el perfil (código, nombre, rol) de la cabecera de Mi Portal (RECON §7.1).
 * Selectores validados con HTML real del dashboard:
 *   `.nombre-usuario`  → nombre completo
 *   `.nombre-codigo`   → código de alumno (8 dígitos)
 *   `.badge-secondary` → rol ("ALUMNO")
 * Si el markup cambia se usan heurísticas de respaldo; si nada calza → `PortalParseError`
 * (el usuario puede volcar el HTML con `ESAN_DEBUG=1` para afinar selectores).
 */
export function parsePerfil(html: string): Alumno {
  const $ = cheerio.load(html);
  const texto = limpiar($("body").text());

  const nombre = limpiar($(".nombre-usuario").first().text()) || (extraerNombre($, texto) ?? "");
  const codigo = extraerCodigo(limpiar($(".nombre-codigo").first().text())) ?? extraerCodigo(texto);
  const rol =
    limpiar($(".badge-secondary").first().text()) || (/\bALUMNO\b/i.test(texto) ? "ALUMNO" : "");

  if (!codigo && !nombre) {
    throw new PortalParseError(
      "No se pudo leer el perfil de Mi Portal (markup inesperado). Vuelve a correr con ESAN_DEBUG=1.",
    );
  }
  return { codigo: codigo ?? "", nombre, rol };
}

/** Código de alumno = 8 dígitos; preferimos el que va junto a la etiqueta "Código". */
function extraerCodigo(texto: string): string | null {
  const etiquetado = texto.match(/c[oó]digo[^0-9]{0,12}(\d{8})/i);
  if (etiquetado?.[1]) return etiquetado[1];
  const suelto = texto.match(/\b(\d{8})\b/);
  return suelto?.[1] ?? null;
}

/** Respaldo del nombre: saludo "Bienvenido(a), X" o selectores genéricos de cabecera. */
function extraerNombre($: cheerio.CheerioAPI, texto: string): string | null {
  // El saludo se ubica case-insensitive, pero el NOMBRE se extrae con clase solo-mayúsculas SIN
  // flag `i` (un flag `i` global haría que la clase de mayúsculas también calce minúsculas y
  // engulla texto de UI). Se corta en la primera palabra en minúsculas (etiquetas, menú…).
  const inicio = texto.match(/bienvenid[oa]\(?a?\)?,?\s+/i);
  if (inicio) {
    const resto = texto.slice((inicio.index ?? 0) + inicio[0].length);
    const nombre = resto.match(/^[A-ZÁÉÍÓÚÑ]{2,}(?:[ .'-]?[A-ZÁÉÍÓÚÑ]{2,})*/);
    if (nombre) return limpiar(nombre[0]);
  }

  const selectores = [".user-name", ".username", ".nombre-usuario", "#nombreUsuario"];
  for (const sel of selectores) {
    const t = limpiar($(sel).first().text());
    if (t.length >= 4) return t;
  }
  return null;
}

function limpiar(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Quita el prefijo de código de sección "[18903-7-25] " del nombre del curso. */
function limpiarCurso(s: string): string {
  return limpiar(s).replace(/^\[[^\]]*\]\s*/, "");
}

/** Nota numérica ("13.00", "15") o `null` si no aplica ("-", ""). */
function parseNota(v: string): number | null {
  const n = Number(limpiar(v).replace(",", "."));
  return limpiar(v) !== "" && Number.isFinite(n) ? n : null;
}

/** Cabecera de componente: "EXAMEN PARCIAL30%" → { nombre, peso }. */
function parseComponente(texto: string): { nombre: string; peso: number | null } {
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*%\s*$/);
  if (m?.index !== undefined && m[1]) {
    return { nombre: limpiar(texto.slice(0, m.index)), peso: Number(m[1].replace(",", ".")) };
  }
  return { nombre: limpiar(texto), peso: null };
}

/**
 * Notas actuales (`/GestionAcademica/Notas/NotasActuales`): una `table#tabledata` por curso dentro
 * de su `.card`. thead = componentes (`COMPONENTE<br>30%`) + `PROMEDIO GENERAL`; tbody = las notas.
 */
export function parseNotas(html: string): CursoNota[] {
  const $ = cheerio.load(html);
  const cursos: CursoNota[] = [];

  $("table#tabledata").each((_, tabla) => {
    const $t = $(tabla);
    const heads = $t
      .find("thead th")
      .toArray()
      .map((th) => limpiar($(th).text()));
    const vals = $t
      .find("tbody")
      .first()
      .find("th, td")
      .toArray()
      .map((c) => limpiar($(c).text()));
    if (heads.length === 0) return;

    // Nombre del curso: el `.card-header` (de un `.card` ancestro) cuyo texto trae el código "[...]".
    // Se sube por todos los `.card` ancestros para no agarrar el header de un card anidado interno.
    const headers = $t
      .parents(".card")
      .toArray()
      .map((card) => limpiar($(card).children(".card-header").first().text()))
      .filter((tx) => tx.length > 0);
    const curso = limpiarCurso(headers.find((h) => /^\[[^\]]*\]/.test(h)) ?? headers[0] ?? "");
    const componentes: ComponenteEvaluacion[] = [];
    let promedio: number | null = null;

    heads.forEach((h, i) => {
      const val = vals[i] ?? "";
      if (/PROMEDIO\s+GENERAL/i.test(h)) {
        promedio = parseNota(val);
      } else {
        const { nombre, peso } = parseComponente(h);
        componentes.push({ nombre, peso, nota: parseNota(val) });
      }
    });

    cursos.push({ curso, componentes, promedio });
  });

  return cursos;
}

/**
 * Horario semanal (`/GestionSeguridad/Principal/Horario`): un `.tab-pane` por día con `h4` (día) y,
 * por clase, un `h5` ("08:00 - 09:30") seguido de un `p` con `Curso:`/`Profesor:`/`Ambiente:`.
 */
export function parseHorario(html: string): SesionHorario[] {
  const $ = cheerio.load(html);
  const sesiones: SesionHorario[] = [];

  $(".tab-pane").each((_, pane) => {
    const $p = $(pane);
    const dia = limpiar($p.find("h4").first().text());
    if (!dia) return;

    $p.find("h5").each((_, h5) => {
      const t = limpiar($(h5).text()).match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
      if (!t?.[1] || !t[2]) return;

      // `nextUntil("h5", "p")` ata el <p> a SU <h5> (no toma el del siguiente bloque si falta).
      const info = limpiar($(h5).nextUntil("h5", "p").first().text());
      const curso = limpiarCurso(
        info.match(/Curso:\s*(.*?)(?:\s*Profesor:|\s*Ambiente:|$)/i)?.[1] ?? "",
      );
      // Capturas acotadas por las otras etiquetas → estables aunque cambie el orden de los campos.
      const profesor = info.match(/Profesor:\s*(.*?)(?:\s*Ambiente:|\s*Curso:|$)/i)?.[1]?.trim();
      const aula = info.match(/Ambiente:\s*(.*?)(?:\s*Profesor:|\s*Curso:|$)/i)?.[1]?.trim();

      // aula/profesor siempre presentes (string) → columnas de tabla estables entre semanas.
      sesiones.push({
        dia,
        curso,
        inicio: t[1],
        fin: t[2],
        aula: aula ?? "",
        profesor: profesor ?? "",
      });
    });
  });

  return sesiones;
}

/**
 * Cronograma de pagos (`/GestionAcademica/Pagos/CronogramaPagos`): la `table#tabledata` con cabecera
 * `DESCRIPCIÓN·MONEDA·MONTO·VENCIMIENTO`. Las filas placeholder ("-") se descartan.
 */
export function parsePagos(html: string): Pago[] {
  const $ = cheerio.load(html);
  const pagos: Pago[] = [];

  const tabla = $("table#tabledata")
    .filter((_, t) => /VENCIMIENTO/i.test($(t).find("thead").text()))
    .first();

  tabla.find("tbody tr").each((_, tr) => {
    const c = $(tr)
      .find("td")
      .toArray()
      .map((td) => limpiar($(td).text()));
    const descripcion = c[0] ?? "";
    if (!descripcion || descripcion === "-") return; // fila vacía / sin cuotas

    const norm = (v: string | undefined) => (v && v !== "-" ? v : "");
    pagos.push({
      descripcion,
      moneda: norm(c[1]),
      monto: norm(c[2]),
      vencimiento: norm(c[3]),
    });
  });

  return pagos;
}
