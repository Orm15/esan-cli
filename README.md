# esan-cli

> CLI **no oficial** para consultar el campus virtual de **ESAN** (Pregrado) desde la terminal.
> Uso **personal y educativo**, **solo lectura**, **solo tu propia cuenta**.

## Descripción

`esan-cli` te permite consultar tus propios datos del campus virtual de ESAN sin abrir el
navegador, directo desde la terminal:

- Notas y cursos matriculados
- Horario de clases
- Material de cada curso (aula virtual)
- Links de clases y grabaciones (con su clave de acceso)
- Cronograma de pagos

La salida se muestra en tablas legibles o en JSON (`--json`) para integrarla en scripts.

## Instalación

Necesitas [Bun](https://bun.sh). Clona el repositorio e instala dependencias:

```bash
git clone https://github.com/Orm15/esan-cli.git
cd esan-cli
bun install
```

## Cómo ejecutarlo

Hay tres formas; elige la que prefieras.

**A. Directo con Bun** (lo más rápido para probar):

```bash
bun run src/bin.ts --help
bun run src/bin.ts login
```

**B. Como comando global `esan`:**

```bash
bun link                 # o: npm install -g .
esan --help
esan login
```

**C. Binario autónomo** (un solo archivo, no requiere Bun ni Node para correr):

```bash
bun run compile          # genera ./dist/esan (específico de tu sistema operativo)
./dist/esan --help
./dist/esan login
```

> También puedes generar un bundle para Node con `bun run build` y ejecutarlo con
> `node dist/bin.js <comando>` (requiere haber hecho `bun install` antes).

Los ejemplos de abajo usan el comando `esan` (formas **B**/**C**). Con la forma **A**,
antepón `bun run src/bin.ts` (p. ej. `bun run src/bin.ts notas`).

## Uso

```bash
esan login                   # inicia sesión (ofrece guardar la contraseña)
esan perfil                  # tus datos: nombre, código, rol

esan notas                   # notas por curso (componentes y promedio)
esan horario                 # horario semanal de clases
esan pagos                   # cronograma de pagos

esan cursos --ciclo 2025-2   # cursos del aula virtual (filtrable por ciclo)
esan material <curso>        # material de un curso (secciones y recursos)
esan grabaciones <curso>     # enlaces de grabación de Zoom + clave de acceso

esan logout                  # cierra la sesión y borra la credencial guardada
```

- `<curso>` acepta el **courseId** de Moodle o un **nombre** (p. ej. `esan material green`).
- La mayoría de comandos acepta `--json` para una salida estructurada.

### Credenciales y configuración

La contraseña nunca se guarda en texto plano. Precedencia: variables de entorno
`ESAN_USER` / `ESAN_PASS` → keychain del sistema → prompt interactivo.

```bash
esan password set|clear|status   # gestiona la contraseña guardada (opt-in, keychain)
esan config get|set <clave> <valor>   # preferencias no sensibles (p. ej. usuario)
```

Las cookies de sesión se cachean con permisos `600`. Con `ESAN_DEBUG=1` el HTML de cada
respuesta se vuelca a `~/.cache/esan-cli/debug/` (útil para depurar selectores).

## Tecnología

TypeScript + [Bun](https://bun.sh), con arquitectura hexagonal (ports & adapters):
`commander` (CLI), `got` + `tough-cookie` (sesión por cookies), `cheerio` (parseo de HTML),
`@clack/prompts` (login interactivo) y `@napi-rs/keyring` (keychain multiplataforma).

## Aviso

Proyecto independiente, **sin afiliación** con la Universidad ESAN. Replica las mismas peticiones
que hace tu navegador al usar el portal con normalidad; no ataca, escanea ni modifica nada.

## Licencia

MIT
