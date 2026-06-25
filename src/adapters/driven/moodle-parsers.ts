import * as cheerio from "cheerio";
import type { Curso, Grabacion, Material, TipoMaterial } from "../../domain/models";

function limpiar(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const TIPOS_CONOCIDOS: readonly string[] = ["resource", "page", "url", "forum", "assign", "quiz"];

function tipoMaterial(modname: string): TipoMaterial {
  return TIPOS_CONOCIDOS.includes(modname) ? (modname as TipoMaterial) : "otro";
}

/**
 * Lista de cursos del Aula Virtual: bloque `section.block_esan_courses` de la home, con `h3.sectionname`
 * por ciclo seguido de enlaces `course/view.php?id=N`. Se recorre en orden de documento (RECON §8.2).
 */
export function parseCursos(html: string): Curso[] {
  const $ = cheerio.load(html);
  const cursos: Curso[] = [];
  let ciclo = "";

  $(".block_esan_courses")
    .find("h3.sectionname, a[href*='course/view.php?id=']")
    .each((_, el) => {
      const $el = $(el);
      if ($el.is("h3")) {
        ciclo = limpiar($el.text());
        return;
      }
      const href = $el.attr("href") ?? "";
      const id = href.match(/[?&]id=(\d+)/)?.[1];
      if (!id) return;
      cursos.push({ id, nombre: limpiar($el.text()), ciclo, url: href });
    });

  return cursos;
}

/**
 * Material de un curso (`/course/view.php?id=<id>`): cada `li.activity` trae `id="module-<cmid>"`,
 * clase `modtype_<tipo>`, `.instancename` (nombre, sin el `.accesshide` que añade Moodle) y un `<a>`.
 * Se agrupan por sección (`.sectionname`). Se omiten labels y módulos sin nombre (RECON §8.3).
 */
export function parseMaterial(html: string): Material[] {
  const $ = cheerio.load(html);
  const materiales: Material[] = [];

  // Paso global único sobre actividades + sección del ancestro más cercano: si las secciones
  // anidan (subsecciones de Moodle 4.x) NO se duplica el módulo (se emite una vez, con su sección).
  $("li.activity").each((_, act) => {
    const $act = $(act);
    const cmid = ($act.attr("id") ?? "").match(/module-(\d+)/)?.[1];
    const $name = $act.find(".instancename").first().clone();
    $name.find(".accesshide").remove();
    const nombre = limpiar($name.text());
    if (!cmid || !nombre) return; // labels / módulos sin enlace

    const seccion = limpiar(
      $act.closest("li.section, .course-section").find(".sectionname").first().text(),
    );
    const modname = ($act.attr("class") ?? "").match(/modtype_(\w+)/)?.[1] ?? "";
    materiales.push({
      cmid,
      tipo: tipoMaterial(modname),
      nombre,
      url: $act.find("a").first().attr("href") ?? "",
      seccion,
    });
  });

  return materiales;
}

/**
 * Grabaciones de clase (Zoom) de un curso: tabla `table.enlaces-zoom` donde cada `tr` tiene el enlace
 * de la grabación (`zoom.us/rec/share/...`) y un `span.descripcion-meeting` con "Clave de acceso: X".
 * El título (curso/sección/fecha) está en el primer `td` (RECON §8.5).
 */
export function parseGrabaciones(html: string): Grabacion[] {
  const $ = cheerio.load(html);
  // Preferir el título de la cabecera del curso; el `, h1` por orden de documento podía tomar un
  // h1 sr-only/accesshide anterior. Fallback a un h1 visible.
  const curso =
    limpiar($(".page-header-headings h1").first().text()) ||
    limpiar($("h1:not(.sr-only):not(.accesshide)").first().text());
  const grabaciones: Grabacion[] = [];

  $("table.enlaces-zoom tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const enlace =
      $tr.find("a[href*='zoom.us/rec']").first().attr("href") ??
      $tr.find("a[href*='zoom.us']").first().attr("href");
    if (!enlace) return; // fila de cabecera

    // `limpiar` antes de matchear: si el texto del span trae saltos de línea, el regex igual capta.
    const claveTexto = limpiar(
      $tr
        .find("span.descripcion-meeting")
        .filter((_, s) => /Clave de acceso/i.test($(s).text()))
        .first()
        .text(),
    );
    const clave = claveTexto.match(/Clave de acceso:\s*(.+)$/i)?.[1]?.trim() ?? null;

    const $titulo = $tr.find("td").first().clone();
    $titulo.find("span.descripcion-meeting").remove();

    grabaciones.push({ curso, titulo: limpiar($titulo.text()), enlace, clave });
  });

  return grabaciones;
}
