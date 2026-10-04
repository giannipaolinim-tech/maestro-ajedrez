# Maestro — app para aprender aperturas de ajedrez

App personal de Gianni para estudiar repertorios de aperturas como si tuviera un maestro: lecciones jugada por jugada, práctica guiada contra el repertorio y exámenes con repetición espaciada. Se entrega como **un único HTML autocontenido** (`dist/index.html`) que funciona en el celular y en la compu. Además se publica como **PWA en GitHub Pages**: en Android se instala desde Chrome («Instalar app», genera un WebAPK), funciona sin conexión y se actualiza sola.

## Cómo trabajar con Gianni

- Escribir en español rioplatense (voseo), directo y sin relleno.
- **Discutir y confirmar decisiones de arquitectura antes de ejecutarlas.** Actuar sin confirmación es un punto de fricción conocido. Cambios chicos y obvios (un texto, un bug) sí se pueden hacer directo.
- Quiere crítica honesta: si una línea de teoría es dudosa, decirlo.
- En la app las jugadas se muestran en notación inglesa (N, B, Q). Gianni a veces escribe en notación española (C = caballo, A = alfil, D = dama, T = torre, R = rey). Ejemplo: "Cc3" = Nc3, "Ac4" = Bc4.

## Comandos

```
node scripts/validate.js   # legalidad + consistencia del repertorio y de los módulos (obligatorio tras tocar src/data.js o src/school.js)
npm run check-kbn          # verifica el tutorial de alfil y caballo con el solucionador exacto (~15 s, ~1,5 GB de RAM)
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
src/school.js      const SECTIONS, SCHOOL  → secciones de Aprender y sus módulos (pasos de teoría y ejercicios)
src/app/           lógica de la app, en archivos que build.js concatena en este orden (ver Arquitectura):
  store.js         localStorage: progreso Leitner (grade, mastery, stats), racha de días, progreso de Aprender
  repertoire.js    buildIndex, IDXS, apertura actual (OP/IDX), portadas (l.key, gr.cov, op.cov)
  board.js         Board (tablero interactivo), mini tableros, overlay (marcas y flechas)
  ui.js            $, tema, íconos, toast, moveList, gameAt y piezas de HTML comunes (opBar, linesHTML, studyLayout…)
  nav.js           state, historial (nav, restore, goTab), barra inferior y render()
  home.js          Inicio
  learn.js         Aprender: menú de secciones y listas de módulos
  kbn.js           práctica libre de alfil y caballo (kbnStart, kbnDefense)
  module.js        modulePlayer: reproductor de módulos (pasos info, move, line, tap, play)
  lesson.js        pestaña Aprender de una apertura (lista de variantes y lección)
  practice.js      Práctica (estado P)
  exam.js          Examen (estado X)
  progress.js      Progreso de una apertura
  main.js          arranque y registro de la PWA (va último)
src/sw.js          service worker de la PWA (build.js completa VERSION y FONT_CSS)
src/manifest.webmanifest
vendor/chess.js    chess.js 0.10.3 (reglas, SAN, FEN). Global `Chess`. Licencia BSD en vendor/
assets/pieces/     piezas SVG cburnett (lichess, CC BY-SA 3.0) → se embeben como data URI
assets/icon.svg    ícono de la app; assets/icons/*.png se generan con `npm run icons` y se versionan
scripts/build.js   concatena todo en dist/index.html y copia lo de la PWA
scripts/validate.js
scripts/kbnk.js    solucionador exacto de KBNK (análisis retrógrado); --check verifica los módulos con kbn:true
scripts/serve.js   servidor estático mínimo para probar dist/ en localhost
.github/workflows/pages.yml  cada push a main → npm run build → publica dist/ en GitHub Pages
dist/              build final (no se versiona: lo arma el workflow)
```

## Modelo de datos (src/data.js)

```js
{ id, name, short?, cover?, level?, side: "w"|"b", first, sub, intro,   // short = nombre corto (chips); cover = plies de la portada; level:"basico" = aparece en «Para empezar»
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

## Aprender: secciones y módulos (src/school.js)

`SECTIONS` = Fundamentos, Aperturas, Táctica y Finales. Aperturas es especial: lista `OPENINGS` (repertorios y «Para empezar»). Cada módulo lleva `sec`.

```js
{ id, sec, kbn?, title, icon: "wN", desc, steps: [
  { t: "info"|"move"|"tap", h, text, fen? | moves?, marks?: { e4: "g"|"r"|"y"|"b" }, arrows?: ["e2e4"],
    sol?: ["Nf3", ...] | goal?: "mate", ok?, hint?,     // move
    targets?: ["e4"] | from?: "d4", need?: 4,            // tap (from = jugadas legales de esa pieza)
    line?: "Bb7+ Kb8 Na6#", alts?: [[...]], notes?: {} // line: el usuario juega su bando y el rival responde solo
    mode?: "kbn" } ] }                                   // play: práctica libre contra la máquina
```

En `line`, `alts[k]` son las otras jugadas igual de buenas para la jugada k del usuario: se avisa «también gana» (y si dan mate, se acepta). El tutorial de mate con alfil y caballo (`kbn:true`) está verificado con `scripts/kbnk.js`: cada jugada de blancas es óptima, cada respuesta negra es la mejor defensa y las `alts` son exactamente las demás óptimas. La práctica libre (`kbnStart`, `kbnDefense`) usa una defensa heurística (come piezas colgadas, busca espacio y se aleja de las esquinas buenas): es buena, pero no perfecta.

validate.js chequea cada paso: FEN válida con los dos reyes, que el bando que no mueve no esté en jaque, soluciones legales y al menos una jugada que cumpla el objetivo. En `move` se compara la SAN sin `+#`; la coronación es siempre a dama. Progreso en `maestro-ajedrez-school` (`{modId: {done, ex: {paso: 1}}}`).

## Arquitectura de la app (src/app/)

- **Cómo se arma:** `build.js` concatena los archivos de `src/app/` en el orden de la lista `APP` y los envuelve en una sola `(function(){ … })();`. Por eso todos comparten ámbito: una función o variable de un archivo se usa directo desde otro, sin import ni export. No hay bundler ni módulos ES.
  - **El orden importa** para lo que corre al cargar: un `const` o `let` tiene que estar definido en un archivo anterior al que lo usa al cargar. Dentro de funciones no importa, porque se ejecutan después. Las declaraciones `function` se elevan y se pueden usar desde cualquier archivo.
  - `main.js` va último porque es el que llama a `render()`.
  - Un archivo nuevo se agrega a `APP` en `build.js`.
- `buildIndex(op)` (repertoire.js) → `{ user, opp, nodes, lineNodes }`. `user[clave]` = jugada del repertorio; `opp[clave]` = Set de jugadas del rival; `nodes` = posiciones donde juega el usuario (sirven para examen y progreso). Clave = `opId|fen4`.
- **Tablero propio** (`Board`, board.js): grilla de divs con pointer events. Se mueve tocando pieza y casilla o arrastrando (pieza "fantasma" `.ghost` en `position:fixed`). `set(g,{anim:true})` desliza la última jugada. Con `canMove` el tablero lleva `.live` (`touch-action:none`); si no, `onTap` recibe los clicks. La orientación sigue a `op.side`.
- **Estilo**: look de app de juego (azul noche, acentos lima/naranja/azul/violeta, botones con relieve `.btn`). Nada de serif ni estilo Claude.
- **Navegación** (nav.js): barra inferior fija `#nav` (Inicio · Aprender · Practicar · Examen · Progreso) y, dentro de una apertura, chips `.opbar` para cambiar de apertura. `nav(patch, push)` actualiza `state` (`view`: home|learn|op, `tab`, `sec`, `sub`, `grp`, `d`) y hace `pushState`/`replaceState`, así el botón atrás de Android vuelve dentro de la app. Se apila al entrar a una apertura, a una variante o a un examen; cambiar de pestaña, de apertura o de filtro reemplaza. Inicio hace `history.go(-d)`. Al recargar se restaura desde `history.state`.
- **Selección visual** (ui.js, board.js y repertoire.js): las variantes se eligen con tarjetas de mini tablero (`mini(arr,n,orient)`, piezas como clases CSS con background). `l.key` = ply que separa la variante de las demás; `gr.cov` y `op.cov` = portada de familia y apertura (se calculan solos; `op.cover` los fuerza). `state.grp` filtra por familia con chips.
- **Inicio** (home.js): tarjeta de Aprender con el próximo módulo pendiente, y tarjeta principal con la acción del día (repasar → examen de la apertura con más pendientes; si no, seguir aprendiendo o practicar) y racha de días (`maestro-ajedrez-days`, se marca en `grade()`).
- **Aprender** (`aprender()` en learn.js, vista `learn`): menú de secciones → lista de módulos (o de aperturas) → `modulePlayer()` (module.js). La pestaña Aprender de cada apertura (`op` + `leccion`) se abre desde la sección Aperturas. Los estados viejos con `view:'school'` se convierten a `learn`. Las marcas van en `#ov` (debajo de las piezas) y las flechas en `#ov2` (encima), dos SVG de 8×8 sobre el tablero.
- **Lección** (lesson.js): recorre una línea y muestra la nota del ply y, al final, el plan. Se avanza con ▶, con las flechas del teclado o tocando la mitad derecha del tablero (la izquierda vuelve).
- **Práctica** (practice.js): el rival juega solo (480 ms). Si el usuario se equivoca dos veces, se marca la jugada correcta. El modo `__all` elige al azar entre `opp[clave]`.
- **Examen** (exam.js): 10 posiciones elegidas por prioridad de caja baja y atraso (con algo de azar), con un intento cada una. Se puede filtrar por grupo.
- **Progreso / repetición espaciada** (store.js; la pestaña en progress.js): sistema Leitner de cajas 0–6 con `INTERVAL` en milisegundos. Acertar suma 1 caja y fallar vuelve a 0. "Dominado" = caja ≥ 3.
- Persistencia (store.js): `localStorage['maestro-ajedrez-v1']`. Hay una migración de claves viejas sin prefijo hacia `caro-kann|`. El tema (auto/claro/oscuro) va en `maestro-ajedrez-theme`, la última versión vista en `maestro-ajedrez-build`, la última apertura abierta en `maestro-ajedrez-op`, la racha en `maestro-ajedrez-days` y la Escuela en `maestro-ajedrez-school`.
- En el inicio, cada apertura muestra cuántas posiciones toca repasar (`stats(keys)` → `{due, fresh}`).

## PWA y actualizaciones

- `build.js` inyecta `const BUILD={v,date}`. `v` es un hash del contenido, así que el service worker solo cambia si cambió algo. Si `v` difiere del último visto, aparece un aviso "App actualizada".
- `sw.js`: `index.html` va **red primero**, con un timeout de 3,5 s que cae a la caché; así, cada vez que se abre con internet baja lo último. Los íconos y el manifest van caché primero. Las Google Fonts se precachean en `install` (CSS + woff2), así funcionan sin conexión.
- iPhone: `head.html` tiene `apple-touch-icon` (icons/icon-180.png) y las meta `apple-mobile-web-app-*`, porque Safari no siempre toma los íconos del manifest.
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

**Para empezar (level: "basico")**, pensadas para principiantes:
- Italiana con blancas (7 variantes): Giuoco Pianissimo 4.c3 Nf6 5.d3, contra 3...Nf6 4.d3, Húngara, trampa 3...Nd4, Philidor y Petrov.
- Juego abierto 1...e5 con negras (16 variantes): Italiana con ...Bc5 (incluye 5.d4 y Evans declinado), Ruy López Cerrada y Cambio, Escocesa y Cuatro Caballos (con el truco 4.Bc4 Nxe4), Pastor, Gambito de Rey declinado con 2...Bc5, Apertura del Centro y Viena (coincide con las líneas de Viena de Gianni).
- Gambito de Dama Declinado con negras (10 variantes): Ortodoxa con la liberación de Capablanca, Cambio (Carlsbad), 4.Bf4, Catalana abierta, y ...c5 contra Londres y Colle.

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
4. Más aperturas: se agregan como un objeto nuevo en `OPENINGS` sin tocar `src/app/`.

## Publicación

- **Principal: GitHub Pages**, publicado por el workflow en cada push a `main`. El push lo hace Gianni (o Claude si se lo pide); la autenticación es con Git Credential Manager y no hay `gh` instalado.
- Requisito de única vez en GitHub: Settings → Pages → Source: «GitHub Actions».
- La versión vieja sigue como artifact de claude.ai (privado de Gianni). Desde Claude Code no se puede actualizar ese link.
