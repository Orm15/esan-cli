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

Requiere [Bun](https://bun.sh) (o Node 20+ para el binario ya compilado).

```bash
bun install
bun run build        # genera dist/bin.js (compatible con Node)
```

Durante el desarrollo puedes ejecutarlo sin compilar con `bun run src/bin.ts <comando>`.
Tras `npm install -g .` (o `bun link`) el binario queda disponible como `esan`.

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
