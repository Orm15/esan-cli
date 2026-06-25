import * as cheerio from "cheerio";
import { PortalParseError } from "../../domain/errors";
import type { Alumno } from "../../domain/models";

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
