import { describe, expect, test } from "bun:test";
import { EsanError } from "../src/domain/errors";
import type { Curso } from "../src/domain/models";
import { matchCurso } from "../src/usecases";

const cursos: Curso[] = [
  { id: "6951", nombre: "GREEN BUSINESS [S-004]", ciclo: "CICLO 2025-2", url: "" },
  {
    id: "6950",
    nombre: "DATA STORYTELLING y DATA VISUALIZATION [S-003]",
    ciclo: "CICLO 2025-2",
    url: "",
  },
];

describe("matchCurso", () => {
  test("coincidencia única por subcadena (case-insensitive)", () => {
    expect(matchCurso(cursos, "green")).toBe("6951");
  });

  test("match exacto del nombre completo", () => {
    expect(matchCurso(cursos, "green business [s-004]")).toBe("6951");
  });

  test("sin coincidencias → EsanError", () => {
    expect(() => matchCurso(cursos, "biología")).toThrow(EsanError);
  });

  test("ambiguo (mismo curso en otro ciclo) → error con candidatos, sin elegir al azar", () => {
    const dup: Curso[] = [
      ...cursos,
      { id: "5000", nombre: "GREEN BUSINESS [S-002]", ciclo: "CICLO 2024-2", url: "" },
    ];
    expect(() => matchCurso(dup, "green")).toThrow(/Varios cursos coinciden/);
  });
});
