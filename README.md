# esan-cli

> CLI **no oficial** para consultar el campus virtual de **ESAN** (Pregrado) desde la terminal.
> Uso **personal y educativo**, **solo lectura**, **solo tu propia cuenta**.

## Descripción

`esan-cli` te permite consultar tus propios datos del campus virtual de ESAN sin abrir el
navegador, directo desde la terminal:

- Notas y cursos matriculados
- Horario de clases
- Material de cada curso (aula virtual)
- Links de clases y grabaciones
- Cronograma de pagos
- Disponibilidad de salas de estudio

La salida se muestra en tablas legibles o en JSON (`--json`) para integrarla en scripts.

## Tecnología

TypeScript + [Bun](https://bun.sh), con arquitectura hexagonal (ports & adapters).

## Aviso

Proyecto independiente, **sin afiliación** con la Universidad ESAN. Replica las mismas peticiones
que hace tu navegador al usar el portal con normalidad; no ataca, escanea ni modifica nada.

## Licencia

MIT
