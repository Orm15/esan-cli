import { describe, expect, test } from "bun:test";
import { parseHorario, parseNotas, parsePagos } from "../src/adapters/driven/miportal-parsers";

describe("parseNotas", () => {
  const html = `
    <div class="card">
      <div class="card-header"><i class="fa"></i>&nbsp;[18903-7-25] AGILE PROJECT MANAGEMENT</div>
      <div class="collapse show"><div class="card-body">
        <table id="tabledata"><thead><tr>
          <th>EXAMEN PARCIAL<br />30%</th>
          <th>DESARROLLO DE CASOS<br />30%</th>
          <th>TRABAJO INDIVIDUAL<br />40%</th>
          <th>PROMEDIO GENERAL<br /></th>
        </tr></thead><tbody><tr>
          <th>13.00</th><th>15.85</th><th>17.00</th><th>15</th>
        </tr></tbody></table>
      </div></div>
    </div>`;

  test("extrae curso, componentes con peso/nota y promedio", () => {
    const [curso] = parseNotas(html);
    expect(curso?.curso).toBe("AGILE PROJECT MANAGEMENT"); // sin el [código]
    expect(curso?.promedio).toBe(15);
    expect(curso?.componentes).toEqual([
      { nombre: "EXAMEN PARCIAL", peso: 30, nota: 13 },
      { nombre: "DESARROLLO DE CASOS", peso: 30, nota: 15.85 },
      { nombre: "TRABAJO INDIVIDUAL", peso: 40, nota: 17 },
    ]);
  });

  test("devuelve [] cuando no hay tablas de notas", () => {
    expect(parseNotas("<div>sin notas</div>")).toEqual([]);
  });

  test("toma el header del curso (con código) aunque la tabla esté en un card anidado", () => {
    const html = `
      <div class="card"><div class="card-header">[18903-7-25] AGILE PROJECT MANAGEMENT</div>
        <div class="card"><div class="card-header">WIDGET INTERNO</div>
          <table id="tabledata">
            <thead><tr><th>EXAMEN<br />100%</th><th>PROMEDIO GENERAL</th></tr></thead>
            <tbody><tr><th>16</th><th>16</th></tr></tbody>
          </table>
        </div>
      </div>`;
    expect(parseNotas(html)[0]?.curso).toBe("AGILE PROJECT MANAGEMENT");
  });
});

describe("parseHorario", () => {
  const html = `
    <div class="tab-pane" id="SABADO"><h4>SÁBADO</h4>
      <h5 class="light text-danger">08:00 <span class="semi-bold"> - </span>09:30</h5>
      <p class="p-l-10">
        <span class="semi-bold">Curso: </span> [20658-4-25] GREEN BUSINESS<br />
        <span class="hint-text">Profesor: Arauco Livia Mayra</span><br />
        <span class="hint-text">Ambiente: A-104</span>
      </p>
    </div>
    <div class="tab-pane" id="DOMINGO"><h4>DOMINGO</h4>
      <label class="semi-bold">No se cuenta con horario para este día.</label>
    </div>`;

  test("extrae las clases de un día (curso/horas/aula/profesor)", () => {
    const sesiones = parseHorario(html);
    expect(sesiones).toHaveLength(1);
    expect(sesiones[0]).toEqual({
      dia: "SÁBADO",
      curso: "GREEN BUSINESS",
      inicio: "08:00",
      fin: "09:30",
      aula: "A-104",
      profesor: "Arauco Livia Mayra",
    });
  });

  test("los días sin clases no generan sesiones", () => {
    const html2 = `<div class="tab-pane"><h4>LUNES</h4>
      <label>No se cuenta con horario para este día.</label></div>`;
    expect(parseHorario(html2)).toEqual([]);
  });

  test("una clase sin su <p> no roba el bloque de la siguiente clase", () => {
    const html2 = `<div class="tab-pane"><h4>LUNES</h4>
      <h5>08:00 <span> - </span>09:30</h5>
      <h5>10:00 <span> - </span>11:30</h5>
      <p class="p-l-10"><span>Curso: </span> [1-2-3] MATEMÁTICAS<br />
        <span>Profesor: Juan Perez</span><br /><span>Ambiente: A-101</span></p>
    </div>`;
    const s = parseHorario(html2);
    expect(s).toHaveLength(2);
    expect(s[0]).toEqual({
      dia: "LUNES",
      curso: "",
      inicio: "08:00",
      fin: "09:30",
      aula: "",
      profesor: "",
    });
    expect(s[1]).toEqual({
      dia: "LUNES",
      curso: "MATEMÁTICAS",
      inicio: "10:00",
      fin: "11:30",
      aula: "A-101",
      profesor: "Juan Perez",
    });
  });
});

describe("parsePagos", () => {
  const html = `
    <table id="tabledata"><thead><tr>
      <th>DESCRIPCIÓN</th><th>MONEDA</th><th>MONTO</th><th>VENCIMIENTO</th><th></th>
    </tr></thead><tbody>
      <tr><td>CUOTA 1</td><td>S/.</td><td>2500.00</td><td>15/04/2026</td><td>-</td></tr>
      <tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
    </tbody></table>
    <table id="tabledata"><thead><tr><th>BANCO</th><th>MODALIDADES DE PAGO</th></tr></thead>
      <tbody><tr><td>BCP</td><td>ventanilla</td></tr></tbody></table>`;

  test("parsea las cuotas reales y descarta la tabla de bancos y las filas '-'", () => {
    const pagos = parsePagos(html);
    expect(pagos).toEqual([
      { descripcion: "CUOTA 1", moneda: "S/.", monto: "2500.00", vencimiento: "15/04/2026" },
    ]);
  });

  test("devuelve [] cuando no hay cuotas", () => {
    const vacio = `<table id="tabledata"><thead><tr><th>DESCRIPCIÓN</th><th>VENCIMIENTO</th></tr></thead>
      <tbody><tr><td>-</td><td>-</td></tr></tbody></table>`;
    expect(parsePagos(vacio)).toEqual([]);
  });
});
