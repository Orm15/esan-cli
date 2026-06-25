import { describe, expect, test } from "bun:test";
import {
  parseCursos,
  parseGrabaciones,
  parseMaterial,
} from "../src/adapters/driven/moodle-parsers";

describe("parseCursos", () => {
  const html = `
    <section class="block_esan_courses">
      <h3 class="sectionname">CICLO 2025-2</h3>
      <div class="row subcategorias"><div class="col-xs-12 name" data-id="6949">
        <a href="https://aulavirtualue.uesan.edu.pe/course/view.php?id=6949">AGILE PROJECT MANAGEMENT [S-007]</a>
      </div></div>
      <h3 class="sectionname">CICLO 2025-1</h3>
      <div class="col-xs-12 name">
        <a href="https://aulavirtualue.uesan.edu.pe/course/view.php?id=5455">COSTOS Y PRESUPUESTOS [S-004]</a>
      </div>
    </section>
    <a href="https://aulavirtualue.uesan.edu.pe/course/view.php?id=99">FUERA DEL BLOQUE</a>`;

  test("agrupa cursos por ciclo y respeta el orden; ignora links fuera del bloque", () => {
    const cursos = parseCursos(html);
    expect(cursos).toHaveLength(2);
    expect(cursos[0]).toEqual({
      id: "6949",
      nombre: "AGILE PROJECT MANAGEMENT [S-007]",
      ciclo: "CICLO 2025-2",
      url: "https://aulavirtualue.uesan.edu.pe/course/view.php?id=6949",
    });
    expect(cursos[1]?.ciclo).toBe("CICLO 2025-1");
    expect(cursos[1]?.id).toBe("5455");
  });
});

describe("parseMaterial", () => {
  const html = `
    <li class="section main">
      <h3 class="sectionname">General</h3>
      <ul>
        <li class="activity forum modtype_forum" id="module-460997">
          <a href="https://aulavirtualue.uesan.edu.pe/mod/forum/view.php?id=460">
            <span class="instancename">Avisos<span class="accesshide"> Foro</span></span></a>
        </li>
        <li class="activity resource modtype_resource" id="module-491385">
          <a href="https://aulavirtualue.uesan.edu.pe/mod/resource/view.php?id=491">
            <span class="instancename">Syllabus 2025-2<span class="accesshide"> Archivo</span></span></a>
        </li>
        <li class="activity label modtype_label" id="module-1"><div>solo texto</div></li>
      </ul>
    </li>`;

  test("extrae módulos con cmid/tipo/nombre/url/sección y omite labels", () => {
    const mat = parseMaterial(html);
    expect(mat).toHaveLength(2);
    expect(mat[0]).toEqual({
      cmid: "460997",
      tipo: "forum",
      nombre: "Avisos", // sin el sufijo .accesshide "Foro"
      url: "https://aulavirtualue.uesan.edu.pe/mod/forum/view.php?id=460",
      seccion: "General",
    });
    expect(mat[1]?.tipo).toBe("resource");
    expect(mat[1]?.nombre).toBe("Syllabus 2025-2");
  });

  test("no duplica módulos cuando las secciones anidan (subsecciones)", () => {
    const html = `
      <li class="section main"><h3 class="sectionname">Unidad 1</h3>
        <ul><li class="activity resource modtype_resource" id="module-600">
          <a href="/mod/resource/view.php?id=600"><span class="instancename">Lectura</span></a></li></ul>
        <li class="section main"><h3 class="sectionname">Subsección</h3>
          <ul><li class="activity url modtype_url" id="module-601">
            <a href="/mod/url/view.php?id=601"><span class="instancename">Video</span></a></li></ul>
        </li>
      </li>`;
    const mat = parseMaterial(html);
    expect(mat.map((m) => m.cmid)).toEqual(["600", "601"]); // sin duplicados
    expect(mat.find((m) => m.cmid === "601")?.seccion).toBe("Subsección"); // sección más específica
  });
});

describe("parseGrabaciones", () => {
  const html = `
    <div class="page-header-headings"><h1>GREEN BUSINESS</h1></div>
    <table class="enlaces-zoom"><tbody>
      <tr><td>Clase</td><td>Enlace</td></tr>
      <tr>
        <td><span>Clase - S-004 - SÁBADO 25/04/2026 08:00</span>
          <span class="descripcion-meeting">sala@esan_123</span></td>
        <td class="meeting-icono">
          <a href="https://zoom.us/rec/share/ABC.def"></a>
          <span class="descripcion-meeting">Clave de acceso: 9mXQQoEs@1</span></td>
      </tr>
    </tbody></table>`;

  test("extrae título, enlace Zoom y clave; descarta la fila de cabecera", () => {
    const g = parseGrabaciones(html);
    expect(g).toHaveLength(1);
    expect(g[0]).toEqual({
      curso: "GREEN BUSINESS",
      titulo: "Clase - S-004 - SÁBADO 25/04/2026 08:00",
      enlace: "https://zoom.us/rec/share/ABC.def",
      clave: "9mXQQoEs@1",
    });
  });

  test("capta la clave aunque el span tenga saltos de línea/espacios", () => {
    const html = `
      <table class="enlaces-zoom"><tbody><tr>
        <td><span>Clase X</span></td>
        <td><a href="https://zoom.us/rec/share/Z"></a>
          <span class="descripcion-meeting">
            Clave de acceso: Pwd#2025
          </span></td>
      </tr></tbody></table>`;
    expect(parseGrabaciones(html)[0]?.clave).toBe("Pwd#2025");
  });

  test("devuelve [] cuando el curso no tiene grabaciones", () => {
    expect(parseGrabaciones("<h1>X</h1><p>sin grabaciones</p>")).toEqual([]);
  });
});
