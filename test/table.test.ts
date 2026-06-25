import { describe, expect, test } from "bun:test";
import { type Columna, construirTabla } from "../src/adapters/driving/cli/table";

const cols: Columna[] = [
  { header: "Día", key: "dia", max: 10 },
  { header: "Inicio", key: "inicio", max: 6 },
  { header: "Fin", key: "fin", max: 6 },
  { header: "Curso", key: "curso", min: 14 },
  { header: "Aula", key: "aula", max: 10 },
  { header: "Profesor", key: "profesor", min: 10 },
];

const filas = [
  {
    dia: "SÁBADO",
    inicio: "08:00",
    fin: "09:30",
    curso: "INTELIGENCIA ARTIFICIAL PARA LA INGENIERÍA",
    aula: "A-104",
    profesor: "Arauco Livia Mayra",
  },
  {
    dia: "MIÉRCOLES",
    inicio: "10:00",
    fin: "11:30",
    curso: "DATA STORYTELLING y DATA VISUALIZATION",
    aula: "B-201",
    profesor: "Juan Carlos Perez Gonzalez",
  },
];

describe("construirTabla", () => {
  for (const ancho of [50, 60, 80, 120, 200]) {
    test(`ninguna línea excede el ancho ${ancho}`, () => {
      const out = construirTabla(cols, filas, ancho);
      for (const linea of out.split("\n")) {
        // contar code points (acentos y caracteres de caja = 1 columna visible)
        expect([...linea].length).toBeLessThanOrEqual(ancho);
      }
    });
  }

  test("trunca con … las columnas marcadas (p.ej. URLs)", () => {
    const out = construirTabla(
      [{ header: "Enlace", key: "url", max: 20, truncar: true }],
      [{ url: "https://zoom.us/rec/share/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }],
      80,
    );
    expect(out).toContain("…");
    expect(out).not.toContain("AAAAAAAAAAAAAAAAAAAA"); // el valor completo no aparece
  });

  test("una columna protegida no se trunca aunque la tabla se encoja", () => {
    const out = construirTabla(
      [
        { header: "Clase", key: "titulo", min: 22 },
        { header: "Clave", key: "clave", max: 16, protegida: true },
        { header: "Enlace", key: "enlace", max: 32, truncar: true },
      ],
      [
        {
          titulo: "Clase muy larga que debería envolverse en varias líneas sin problema",
          clave: "9mXQQoEs@1",
          enlace: `https://zoom.us/rec/share/${"A".repeat(40)}`,
        },
      ],
      60,
    );
    expect(out).toContain("9mXQQoEs@1"); // la clave aparece completa
    for (const linea of out.split("\n")) expect([...linea].length).toBeLessThanOrEqual(60);
  });

  test("sin filas → (sin resultados)", () => {
    expect(construirTabla(cols, [], 80)).toBe("(sin resultados)");
  });
});
