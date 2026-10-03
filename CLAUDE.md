# Maestro — app para aprender aperturas de ajedrez

App personal de Gianni para estudiar repertorios de aperturas como si tuviera un maestro: lecciones jugada por jugada, práctica guiada contra el repertorio y exámenes con repetición espaciada. Se entrega como **un único HTML autocontenido** (`dist/index.html`) que funciona en el celular y en la compu. Además se publica como **PWA en GitHub Pages**: en Android se instala desde Chrome («Instalar app», genera un WebAPK), funciona sin conexión y se actualiza sola.

## Cómo trabajar con Gianni

- Escribir en español rioplatense (voseo), directo y sin relleno.
- **Discutir y confirmar decisiones de arquitectura antes de ejecutarlas.** Actuar sin confirmación es un punto de fricción conocido. Cambios chicos y obvios (un texto, un bug) sí se pueden hacer directo.
- Quiere crítica honesta: si una línea de teoría es dudosa, decirlo.
- En la app las jugadas se muestran en notación inglesa (N, B, Q). Gianni a veces escribe en notación española (C = caballo, A = alfil, D = dama, T = torre, R = rey). Ejemplo: "Cc3" = Nc3, "Ac4" = Bc4.

## Comandos

```
node scripts/validate.js   # legalidad + consistencia del repertorio (obligatorio tras tocar src/data.js)
node scripts/build.js      # genera dist/ (index.html + sw.js + manifest + icons)
npm run build              # validate + build
npm run serve              # build + servidor local en http://localhost:8080 (para probar la PWA)
npm run icons              # regenera assets/icons/*.png desde assets/icon.svg (usa Edge/Chrome headless)
python tests/smoke.py      # prueba de humo en Chromium headless (opcional, requiere playwright)
```

Sin dependencias de npm: chess.js 0.10.3 está vendorizado en `vendor/`.

## Estructura

```
src/head.html      HTML base + todo el CSS (tokens de color oscuro por defecto y claro en :root; fuente Nunito)
src/data.js        const OPENINGS = [...]  → los repertorios (lo que más se edita)
src/app.js         lógica: índice, tablero, lección, práctica, examen, progreso, navegación
src/sw.js          service worker de la PWA (build.js completa VERSION y FONT_CSS)
src/manifest.webmanifest
vendor/chess.js    chess.js 0.10.3 (reglas, SAN, FEN). Global `Chess`. Licencia BSD en vendor/
assets/pieces/     piezas SVG cburnett (lichess, CC BY-SA 3.0) → se embeben como data URI
assets/icon.svg    ícono de la app; assets/icons/*.png se generan con `npm run icons` y se versionan
scripts/build.js   concatena todo en dist/index.html y copia lo de la PWA
scripts/validate.js
scripts/serve.js   servidor estático mínimo para probar dist/ en localhost
.github/workflows/pages.yml  cada push a main → npm run build → publica dist/ en GitHub Pages
dist/              build final (no se versiona: lo arma el workflow)
```

## Modelo de datos (src/data.js)

```js
{ id, name, short?, cover?, side: "w"|"b", first, sub, intro,   // short = nombre corto (chips); cover = plies de la portada
  groups: [{ id, name, desc }],
  lines: [{ id, group, name,
            moves: "e4 c6 d4 d5 ...",      // SAN separadas por espacio, desde la posición inicial
            notes: { 1: "texto", 3: "..." }, // clave = índice de ply 0-based (0 = primera jugada de blancas)
            plan: "plan del medio juego" }] }
```

**Invariantes (los chequea validate.js):**
1. Todas las jugadas legales.
2. En cada posición donde juega el usuario (`side`), la jugada es **única** en todo el repertorio, aunque se llegue por transposición. El rival sí puede tener varias opciones.
3. Las notas apuntan a plies que existen.
4. Ids de línea únicos dentro de la apertura y grupos existentes.

Las transposiciones se aprovechan a propósito: posiciones idénticas comparten nodo (clave = FEN sin contadores de jugadas).

## Arquitectura de app.js

- `buildIndex(op)` → `{ user, opp, nodes, lineNodes }`. `user[clave]` = jugada del repertorio; `opp[clave]` = Set de jugadas del rival; `nodes` = posiciones donde juega el usuario (sirven para examen y progreso). Clave = `opId|fen4`.
- **Tablero propio** (`Board`): grilla de divs con pointer events. Se mueve tocando pieza y casilla o arrastrando (pieza "fantasma" `.ghost` en `position:fixed`). `set(g,{anim:true})` desliza la última jugada. Con `canMove` el tablero lleva `.live` (`touch-action:none`); si no, `onTap` recibe los clicks. La orientación sigue a `op.side`.
- **Estilo**: look de app de juego (azul noche, acentos lima/naranja/azul/violeta, botones con relieve `.btn`). Nada de serif ni estilo Claude.
- **Navegación**: barra inferior fija `#nav` (Inicio · Aprender · Practicar · Examen · Progreso) y, dentro de una apertura, chips `.opbar` para cambiar de apertura. `nav(patch, push)` actualiza `state` (`view`, `tab`, `sub`, `grp`, `d`) y hace `pushState`/`replaceState`, así el botón atrás de Android vuelve dentro de la app. Se apila al entrar a una apertura, a una variante o a un examen; cambiar de pestaña, de apertura o de filtro reemplaza. Inicio hace `history.go(-d)`. Al recargar se restaura desde `history.state`.
- **Selección visual**: las variantes se eligen con tarjetas de mini tablero (`mini(arr,n,orient)`, piezas como clases CSS con background). `l.key` = ply que separa la variante de las demás; `gr.cov` y `op.cov` = portada de familia y apertura (se calculan solos; `op.cover` los fuerza). `state.grp` filtra por familia con chips.
- **Inicio**: tarjeta principal con la acción del día (repasar → examen de la apertura con más pendientes; si no, seguir aprendiendo o practicar) y racha de días (`maestro-ajedrez-days`, se marca en `grade()`).
- **Lección**: recorre una línea y muestra la nota del ply y, al final, el plan. Se avanza con ▶, con las flechas del teclado o tocando la mitad derecha del tablero (la izquierda vuelve).
- **Práctica**: el rival juega solo (480 ms). Si el usuario se equivoca dos veces, se marca la jugada correcta. El modo `__all` elige al azar entre `opp[clave]`.
- **Examen**: 10 posiciones elegidas por prioridad de caja baja y atraso (con algo de azar), con un intento cada una. Se puede filtrar por grupo.
- **Progreso / repetición espaciada**: sistema Leitner de cajas 0–6 con `INTERVAL` en milisegundos. Acertar suma 1 caja y fallar vuelve a 0. "Dominado" = caja ≥ 3.
- Persistencia: `localStorage['maestro-ajedrez-v1']`. Hay una migración de claves viejas sin prefijo hacia `caro-kann|`. El tema (auto/claro/oscuro) va en `maestro-ajedrez-theme`, la última versión vista en `maestro-ajedrez-build`, la última apertura abierta en `maestro-ajedrez-op` y la racha en `maestro-ajedrez-days`.
- En el inicio, cada apertura muestra cuántas posiciones toca repasar (`stats(keys)` → `{due, fresh}`).

## PWA y actualizaciones

- `build.js` inyecta `const BUILD={v,date}`. `v` es un hash del contenido, así que el service worker solo cambia si cambió algo. Si `v` difiere del último visto, aparece un aviso "App actualizada".
- `sw.js`: `index.html` va **red primero**, con un timeout de 3,5 s que cae a la caché; así, cada vez que se abre con internet baja lo último. Los íconos y el manifest van caché primero. Las Google Fonts se precachean en `install` (CSS + woff2), así funcionan sin conexión.
- El manifest y el service worker se registran solo si la página se sirve por http(s) fuera de claude.ai. Abriendo el archivo suelto o como artifact, la app funciona igual pero sin PWA.
- Flujo de actualización: editar → `npm run build` (valida) → commit → `git push`. GitHub Actions publica en ~1 minuto y el celular toma la versión nueva la próxima vez que se abre con conexión.
- El progreso vive en el `localStorage` del origen de GitHub Pages. Es independiente del artifact y de otros navegadores. Gianni aceptó perder el progreso anterior al migrar.

**Restricciones del entorno de publicación (artifact de claude.ai):** un solo archivo, sin imágenes remotas; los scripts externos solo se permiten desde cdnjs, jsdelivr, tailwind y jquery; Google Fonts sí funciona. Por eso todo va embebido. Si se empaqueta como APK, nada de esto aplica, pero conviene mantener el formato de un solo archivo.

## Repertorio actual (decisiones confirmadas por Gianni)

**Caro-Kann con negras** — 15 variantes, 94 posiciones.
- En la línea principal se juega la Clásica 4...Bf5 (descartada la Karpov 4...Nd7).
- Clásica: principal con 6.h4, con 3.Nd2, 6.Nf3 y 6.Bc4.
- Avance (3...Bf5 en todas): Short 4.Nf3, Tal 4.h4 h5, 4.Nc3 e6 5.g4 y 4.Bd3.
- Panov: 4...Nf6 5.Nc3 e6.
- Cambio: 4.Bd3 Nc6 con ...Bg4.
- Alternativas: Dos Caballos, Fantasía 3.f3 e6, 2.c4, 2.d3 y 2.Bc4.

**Viena con blancas** — 10 variantes, 46 posiciones.
- Contra 2...Nf6, gambito 3.f4: 3...d5, 3...exf4 (con 4...Ng8 y con 4...Qe7), 3...d6 y 3...Nc6.
- Contra 2...Nc6, 3.Bc4:
  - 3...Bc5 4.Qg4, con 4...Qf6 y 4...g6.
  - 3...Nf6 4.d3 Bc5 5.f4.
- Otras: 2...Bc5 y 2...d6.

**Holandesa Leningrado con negras** — 9 variantes, 54 posiciones. Es la respuesta a todo menos 1.e4.
- Principal: 1.d4 f5 2.g3, con ...Qe8, ...a5 y ...Na6-c5.
- Transposiciones: 2.c4, 1.c4, 1.Nf3 y 1.g3.
- Anti-Holandesas: Staunton 2.e4 (con 4.Bg5 y 4.f3), 2.Bg5 y 2.Nc3.

## Advertencias sobre la teoría

Las líneas las armó Claude sin motor. Son legales y consistentes, pero no están verificadas con Stockfish. Las más delicadas:
- Caro-Kann, Avance 4.Nc3 e6 5.g4: está cortada a propósito en la jugada 8 porque es muy teórica.
- Viena, 3...exf4 (las dos sublíneas) y 3.Bc4 Bc5 4.Qg4 Qf6: son muy tácticas.
- Holandesa, Staunton y 2.Nc3 Nf6 3.Bg5 d5: conviene confirmar el orden de jugadas.

Si se agrega verificación con motor, la opción natural es stockfish.js (WASM) en un script aparte de validación, no dentro de la app.

## Pendientes / ideas conversadas

1. **APK para Android.** Decidido (2026-10-02): PWA en GitHub Pages con repo público, instalada como WebAPK desde Chrome. Si más adelante quiere un archivo .apk, se genera con PWABuilder o Bubblewrap (TWA) sobre la misma URL, y sigue actualizándose solo. En esta máquina no hay Java ni Android SDK.
2. Exportar/importar progreso: se ofreció, Gianni dijo que no hace falta por ahora.
3. Holandesa contra 1.b3 y 1.f4: Gianni todavía no lo pidió, se ofreció.
4. Más aperturas: se agregan como un objeto nuevo en `OPENINGS` sin tocar `app.js`.

## Publicación

- **Principal: GitHub Pages**, publicado por el workflow en cada push a `main`. El push lo hace Gianni (o Claude si se lo pide); la autenticación es con Git Credential Manager y no hay `gh` instalado.
- Requisito de única vez en GitHub: Settings → Pages → Source: «GitHub Actions».
- La versión vieja sigue como artifact de claude.ai (privado de Gianni). Desde Claude Code no se puede actualizar ese link.
