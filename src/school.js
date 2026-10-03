// Escuela para principiantes: módulos con pasos de teoría y ejercicios.
// Paso: { t:"info"|"move"|"tap", h:título, text, fen? | moves? (desde la inicial; sin nada = posición inicial),
//         marks?:{casilla:"g"|"r"|"y"|"b"}, arrows?:["e2e4", ...],
//   move: sol:[SAN aceptadas] o goal:"mate"; ok: texto al acertar; hint: pista
//   tap:  targets:[casillas] o from:casilla (= sus jugadas legales); need: cuántas hay que tocar (por defecto, todas) }
// Siempre con los dos reyes en el tablero (chess.js los necesita). validate.js chequea todo.
const SCHOOL = [
{id:"tablero", title:"El tablero", icon:"wP", desc:"Casillas, coordenadas y cómo se arma la posición inicial.",
 steps:[
  {t:"info", h:"El tablero", text:"El ajedrez se juega en un tablero de 8×8: 64 casillas claras y oscuras. Cada jugador tiene 16 piezas: las blancas abajo y las negras arriba. Siempre empiezan las blancas y se juega por turnos, una jugada cada uno.", marks:{h1:"g"}},
  {t:"info", h:"Para armarlo bien", text:"La casilla de la esquina inferior derecha (h1) siempre es clara. Si te queda oscura, el tablero está girado.", marks:{h1:"g",a1:"r"}},
  {t:"info", h:"Coordenadas", text:"Las columnas van de la a a la h (de izquierda a derecha) y las filas del 1 al 8, desde el lado de las blancas. Cada casilla se nombra con su columna y su fila: el rey blanco empieza en e1 y el negro en e8.", marks:{e1:"y",e8:"y"}},
  {t:"tap", h:"Tocá la casilla e4", text:"Columna e, fila 4.", targets:["e4"], ok:"¡Bien! e4 es una de las cuatro casillas centrales."},
  {t:"tap", h:"Ahora tocá d5", text:"Columna d, fila 5.", targets:["d5"], ok:"Perfecto."},
  {t:"info", h:"La posición inicial", text:"En la fila 1: torres en las esquinas, después caballos y alfiles, y en el medio la dama y el rey. En la fila 2, ocho peones. Las negras, igual pero enfrente. La dama empieza en su color: la blanca en d1 (clara), la negra en d8 (oscura).", marks:{d1:"y",d8:"y"}},
  {t:"tap", h:"¿Dónde está la dama blanca?", text:"Tocá su casilla.", targets:["d1"], ok:"Exacto: la dama blanca empieza en d1, una casilla clara."}
 ]},
{id:"piezas", title:"Cómo mueve cada pieza", icon:"wN", desc:"Torre, alfil, dama, rey, caballo y peón, con ejercicios.",
 steps:[
  {t:"info", h:"La torre", text:"Se mueve en línea recta, en horizontal o en vertical, tantas casillas como quiera. No puede saltar por encima de otras piezas.", fen:"k7/8/8/8/3R4/8/8/7K w - - 0 1", arrows:["d4d8","d4d1","d4a4","d4h4"]},
  {t:"tap", h:"Movimientos de la torre", text:"Tocá 4 casillas a las que pueda ir la torre de d4.", fen:"k7/8/8/8/3R4/8/8/7K w - - 0 1", from:"d4", need:4, ok:"¡Bien! La torre controla toda su fila y su columna."},
  {t:"info", h:"El alfil", text:"Se mueve en diagonal, tantas casillas como quiera. Nunca cambia de color: cada jugador tiene un alfil de casillas claras y uno de casillas oscuras.", fen:"k7/8/8/8/3B4/8/8/7K w - - 0 1", arrows:["d4h8","d4a7","d4a1","d4g1"]},
  {t:"tap", h:"Movimientos del alfil", text:"Tocá 4 casillas a las que pueda ir el alfil.", fen:"k7/8/8/8/3B4/8/8/7K w - - 0 1", from:"d4", need:4, ok:"Correcto. Fijate que todas son del mismo color."},
  {t:"info", h:"La dama", text:"Combina la torre y el alfil: se mueve en línea recta y en diagonal. Es la pieza más fuerte.", fen:"k7/8/8/8/3Q4/8/8/7K w - - 0 1", arrows:["d4d8","d4d1","d4a4","d4h4","d4h8","d4a7","d4a1","d4g1"]},
  {t:"tap", h:"Movimientos de la dama", text:"Tocá 6 casillas a las que pueda ir la dama.", fen:"k7/8/8/8/3Q4/8/8/7K w - - 0 1", from:"d4", need:6, ok:"¡Eso! Desde el centro, la dama controla 27 casillas."},
  {t:"info", h:"El rey", text:"Se mueve una sola casilla, en cualquier dirección. Nunca puede ir a una casilla atacada por el rival, y los dos reyes nunca pueden quedar pegados.", fen:"8/8/8/8/3K4/8/8/7k w - - 0 1"},
  {t:"tap", h:"Movimientos del rey", text:"Tocá todas las casillas a las que puede ir el rey (son 8).", fen:"8/8/8/8/3K4/8/8/7k w - - 0 1", from:"d4", ok:"Perfecto: el rey se mueve poco, pero en todas las direcciones."},
  {t:"info", h:"El caballo", text:"Se mueve en L: dos casillas en una dirección y una de costado. Es la única pieza que salta por encima de las demás. Siempre cae en una casilla de otro color.", fen:"k7/8/8/8/3N4/8/8/7K w - - 0 1", marks:{e6:"g",c6:"g",f5:"g",b5:"g",f3:"g",b3:"g",e2:"g",c2:"g"}},
  {t:"tap", h:"Movimientos del caballo", text:"Tocá las 8 casillas a las que puede saltar el caballo.", fen:"k7/8/8/8/3N4/8/8/7K w - - 0 1", from:"d4", ok:"¡Muy bien! El caballo es la pieza más difícil de ver: practicalo."},
  {t:"move", h:"Capturá con el caballo", text:"Las piezas capturan yendo a la casilla de la pieza rival. Comé la torre negra.", fen:"4k3/8/8/3r4/8/2N5/8/4K3 w - - 0 1", sol:["Nxd5"], ok:"¡Torre ganada!", hint:"El caballo de c3 salta en L hasta d5."},
  {t:"info", h:"El peón", text:"Avanza hacia adelante, una casilla. Desde su casilla inicial puede avanzar dos. Nunca retrocede y no puede avanzar si tiene una pieza delante.", fen:"4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", arrows:["e2e3","e2e4"]},
  {t:"move", h:"Avanzá el peón dos casillas", text:"Desde e2.", fen:"4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", sol:["e4"], ok:"Bien: el salto doble solo vale en la primera jugada de cada peón."},
  {t:"move", h:"El peón captura en diagonal", text:"El peón no come hacia adelante: captura una casilla en diagonal. Acá puede comer el peón de d5 o el caballo de f5. ¿Cuál conviene?", fen:"4k3/8/8/3p1n2/4P3/8/8/4K3 w - - 0 1", sol:["exf5"], ok:"¡Bien visto! El caballo vale bastante más que un peón.", hint:"Elegí la pieza más valiosa."}
 ]},
{id:"jaque", title:"Jaque, mate y ahogado", icon:"bK", desc:"Cómo se gana una partida y la trampa del empate.",
 steps:[
  {t:"info", h:"Jaque", text:"Cuando una pieza ataca al rey, es jaque. El jugador en jaque está obligado a salir, de una de tres formas: mover el rey, tapar el ataque con otra pieza o capturar la pieza que da jaque.", fen:"4k3/8/8/8/8/8/8/4R1K1 b - - 0 1", marks:{e8:"r"}, arrows:["e1e8"]},
  {t:"move", h:"Capturá la pieza que da jaque", text:"La torre de e1 le da jaque a tu rey. Sacala del tablero.", fen:"4k3/8/8/8/8/8/3b4/4R1K1 b - - 0 1", sol:["Bxe1"], ok:"¡Bien! Salir del jaque capturando es lo mejor: ganás material.", hint:"Tu alfil de d2 ataca e1."},
  {t:"move", h:"Tapá el jaque", text:"Ahora no podés capturar la torre. Poné una pieza en el medio.", fen:"4k3/8/8/8/8/8/8/2b1R1K1 b - - 0 1", sol:["Be3"], ok:"Correcto: el alfil en e3 bloquea la columna e.", hint:"El alfil puede llegar a la columna e."},
  {t:"info", h:"Jaque mate", text:"Jaque mate: el rey está en jaque y no tiene ninguna forma de salir. Ahí termina la partida. Este es el mate del pasillo: el rey quedó encerrado por sus propios peones.", fen:"4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1", marks:{g8:"r"}, arrows:["e8g8"]},
  {t:"move", h:"Dá jaque mate en una jugada", text:"El rey negro no tiene escapatoria por delante.", fen:"6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", goal:"mate", ok:"¡Mate del pasillo!", hint:"La torre puede llegar a la última fila."},
  {t:"move", h:"Otro mate del pasillo", text:"Ahora con la dama.", fen:"6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1", goal:"mate", ok:"¡Mate! Antes de enrocar y olvidarte, dale al rey una salida (por ejemplo h3 o g3).", hint:"La dama recorre la columna d."},
  {t:"info", h:"Ahogado", text:"Ahogado: el rey NO está en jaque, pero el jugador no tiene ninguna jugada legal. Es tablas (empate). Le pasa mucho al que va ganando y se apura.", fen:"7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", marks:{h8:"y",g8:"r",h7:"r",g7:"r"}},
  {t:"move", h:"Dá mate (¡sin ahogar!)", text:"Juegan blancas. Hay una sola jugada que da mate; varias ahogan.", fen:"k7/8/2K5/8/8/8/8/1Q6 w - - 0 1", goal:"mate", ok:"¡Mate! La dama pegada al rey y protegida por el tuyo.", hint:"Llevá la dama pegada al rey negro, donde tu rey la proteja."}
 ]},
{id:"reglas", title:"Reglas especiales", icon:"wK", desc:"Enroque, coronación, captura al paso y tablas.",
 steps:[
  {t:"info", h:"El enroque", text:"El rey se mueve dos casillas hacia una torre y la torre salta al otro lado del rey. Es la única jugada en la que movés dos piezas. Sirve para poner el rey a salvo y sacar la torre al juego.", fen:"r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", arrows:["e1g1","h1f1"]},
  {t:"move", h:"Enrocá corto", text:"Mové el rey dos casillas hacia la derecha.", fen:"r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", sol:["O-O"], ok:"¡Enroque corto! El rey quedó en g1 y la torre en f1."},
  {t:"info", h:"Cuándo se puede enrocar", text:"Solo si: el rey y esa torre nunca se movieron, no hay piezas en el medio, el rey no está en jaque y no pasa ni cae en una casilla atacada. Acá no se puede enrocar corto: el alfil negro controla f1.", fen:"r3k2r/pppppppp/8/8/2b5/8/PPPP1PPP/R3K2R w KQkq - 0 1", marks:{f1:"r"}, arrows:["c4f1"]},
  {t:"move", h:"Enrocá largo", text:"Hacia el otro lado sí se puede: el rey va a c1.", fen:"r3k2r/pppppppp/8/8/2b5/8/PPPP1PPP/R3K2R w KQkq - 0 1", sol:["O-O-O"], ok:"Enroque largo: rey en c1, torre en d1."},
  {t:"info", h:"Coronación", text:"Si un peón llega a la última fila, corona: se transforma en dama, torre, alfil o caballo. Casi siempre se elige dama (en esta app se corona dama automáticamente). Así podés tener dos damas.", fen:"7k/4P3/8/8/8/8/8/K7 w - - 0 1", arrows:["e7e8"]},
  {t:"move", h:"Coroná el peón", text:"Llevá el peón a la última fila.", fen:"7k/4P3/8/8/8/8/8/K7 w - - 0 1", sol:["e8=Q"], ok:"¡Dama nueva! Y encima da jaque."},
  {t:"info", h:"Captura al paso", text:"Si un peón avanza dos casillas y queda al lado de un peón rival, ese peón puede capturarlo como si hubiera avanzado una sola. Solo vale en la jugada inmediata. Acá las negras van a jugar d7-d5.", fen:"4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1", arrows:["d7d5"]},
  {t:"move", h:"Capturá al paso", text:"Las negras acaban de jugar d7-d5. Tu peón de e5 puede comerlo yendo a d6.", fen:"4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", marks:{d7:"y",d5:"y"}, sol:["exd6"], ok:"¡Al paso! El peón de d5 desaparece aunque tu peón fue a d6."},
  {t:"info", h:"Tablas", text:"La partida termina en tablas (empate) por: ahogado; acuerdo entre los jugadores; la misma posición repetida tres veces; 50 jugadas de cada lado sin capturas ni movimientos de peón; o material insuficiente para dar mate, como acá: rey y alfil contra rey.", fen:"8/8/4k3/8/8/2KB4/8/8 w - - 0 1"}
 ]},
{id:"valor", title:"Valor de las piezas", icon:"wQ", desc:"Cuánto vale cada pieza y cómo decidir un cambio.",
 steps:[
  {t:"info", h:"Los valores", text:"Para decidir cambios, usá estos valores: peón 1, caballo 3, alfil 3, torre 5 y dama 9. El rey no tiene valor: si lo perdés, perdés la partida. Un cambio es bueno si recibís más de lo que das."},
  {t:"move", h:"¿Qué conviene capturar?", text:"El caballo puede comer un peón o una torre.", fen:"4k3/8/2p5/5r2/3N4/8/8/4K3 w - - 0 1", sol:["Nxf5"], ok:"¡Claro! La torre vale 5 y el peón, 1.", hint:"Contá el valor de cada pieza."},
  {t:"move", h:"Ganá la calidad", text:"La torre de b4 está defendida por el peón de c5. ¿Conviene tomarla con el alfil?", fen:"4k3/8/8/2p5/1r6/8/3B4/4K3 w - - 0 1", sol:["Bxb4"], ok:"Sí: das un alfil (3) y recibís una torre (5). Eso se llama ganar la calidad.", hint:"Comparás 3 contra 5."},
  {t:"info", h:"Piezas colgadas", text:"Una pieza colgada es una pieza atacada y sin defensa: el rival la come gratis. Antes de cada jugada, mirá si alguna de tus piezas queda colgada y si el rival dejó alguna."}
 ]},
{id:"etapas", title:"Las etapas del juego", icon:"wB", desc:"Apertura, medio juego y final: qué buscar en cada una.",
 steps:[
  {t:"info", h:"Tres etapas", text:"Una partida tiene tres etapas. La apertura: las primeras 10 a 15 jugadas, para sacar las piezas. El medio juego: planes, ataques y táctica. El final: quedan pocas piezas y el rey se vuelve protagonista. En cada una se piensa distinto."},
  {t:"info", h:"La apertura: tres objetivos", text:"1) Controlar el centro (e4, d4, e5 y d5) con peones y piezas. 2) Desarrollar: sacar caballos y alfiles. 3) Enrocar para poner el rey a salvo. Quien cumple esto primero, suele llegar mejor al medio juego.", moves:"e4 e5 Nf3 Nc6 Bc4 Bc5", marks:{d4:"g",e4:"g",d5:"g",e5:"g"}},
  {t:"move", h:"Ocupá el centro", text:"Primera jugada: poné un peón en el centro.", sol:["e4","d4"], ok:"¡Bien! Ese peón controla casillas centrales y abre camino a tus piezas."},
  {t:"move", h:"Desarrollá una pieza", text:"Después de 1.e4 e5, sacá un caballo o un alfil.", moves:"e4 e5", sol:["Nf3","Nc3","Bc4","Bb5"], ok:"Correcto: caballos y alfiles primero. Nf3 además ataca el peón de e5.", hint:"Caballos y alfiles, no la dama ni más peones."},
  {t:"info", h:"Errores típicos de apertura", text:"Sacar la dama muy temprano (el rival la persigue ganando tiempo, como acá), mover la misma pieza varias veces, mover demasiados peones y dejar el rey en el centro sin enrocar.", moves:"e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6", arrows:["f3h5"]},
  {t:"move", h:"Enrocá", text:"Las piezas menores ya salieron: es momento de poner el rey a salvo.", moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6", sol:["O-O"], ok:"Rey seguro y torre lista para entrar en juego."},
  {t:"info", h:"El medio juego: hace falta un plan", text:"Preguntas útiles: ¿cuál es mi peor pieza y cómo la mejoro? ¿Dónde está débil el rival? ¿Hay columnas abiertas para mis torres? ¿Dónde está su rey? Un plan simple y bueno vale más que jugadas sueltas.", moves:"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3"},
  {t:"info", h:"Antes de cada jugada", text:"Buscá en este orden: jaques, capturas y amenazas, tuyas y del rival. Preguntate siempre qué quiere hacer el rival con su última jugada. Y fijate que la pieza que movés no quede colgada.", moves:"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3"},
  {t:"move", h:"Torre a la columna abierta", text:"La columna d no tiene peones: es una columna abierta. Llevá una torre ahí.", fen:"2r2rk1/pp3ppp/4p3/8/8/4P3/PPP2PPP/R4RK1 w - - 0 1", sol:["Rad1","Rfd1"], ok:"Las torres rinden mucho en columnas abiertas: desde ahí pueden entrar a la séptima fila.", hint:"Cualquiera de las dos torres puede llegar a d1."},
  {t:"info", h:"El final", text:"Con pocas piezas, el rey deja de esconderse: es una pieza fuerte y va al centro. Los peones pasados (sin peones rivales delante ni en las columnas vecinas) valen oro: hay que empujarlos. Si vas ganando material, cambiá piezas, no peones.", fen:"8/8/4k3/3p4/3P4/2K5/8/8 w - - 0 1"},
  {t:"move", h:"Activá el rey", text:"En el final, el rey va adelante. Acercalo al centro de la acción.", fen:"8/8/4k3/3p4/3P4/2K5/8/8 w - - 0 1", sol:["Kd3","Kb4"], ok:"¡Bien! El rey activo es la clave de los finales.", hint:"Acercá el rey hacia los peones."}
 ]},
{id:"tactica", title:"Táctica básica", icon:"bN", desc:"Horquilla, clavada, ataque doble, descubierto y enfilada.",
 steps:[
  {t:"info", h:"¿Qué es la táctica?", text:"Golpes de una o pocas jugadas que ganan material o dan mate. Entre principiantes, casi todas las partidas se deciden por táctica. Los patrones más comunes: horquilla, clavada, ataque doble, ataque descubierto y enfilada."},
  {t:"info", h:"Horquilla", text:"Una pieza ataca dos piezas a la vez: el rival solo puede salvar una. El caballo es el rey de las horquillas.", fen:"r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", marks:{a8:"r",e8:"r"}},
  {t:"move", h:"Hacé una horquilla", text:"Encontrá la casilla donde el caballo ataca al rey y a la torre.", fen:"r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", sol:["Nc7"], ok:"¡Jaque y ataque a la torre! El rey tiene que moverse y la torre cae.", hint:"Buscá una casilla en la fila 7."},
  {t:"move", h:"Horquilla de peón", text:"Los peones también hacen horquillas. Atacá la torre y el caballo a la vez.", fen:"4k3/8/8/2r1n3/8/3P4/8/4K3 w - - 0 1", sol:["d4"], ok:"¡Bien! Un peón (1) ataca una torre (5) y un caballo (3).", hint:"El peón de d3 puede avanzar."},
  {t:"info", h:"Clavada", text:"Una pieza no se puede mover (o no le conviene) porque dejaría al descubierto algo más valioso detrás. Acá el caballo de c6 no puede moverse: el rey quedaría en jaque.", fen:"4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1", arrows:["b5e8"], marks:{c6:"r"}},
  {t:"move", h:"Aprovechá la clavada", text:"El caballo no puede escapar. Atacalo.", fen:"4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1", sol:["d5"], ok:"El caballo clavado se pierde: no puede moverse sin dejar al rey en jaque.", hint:"Atacá la pieza clavada con un peón."},
  {t:"move", h:"Ataque doble con la dama", text:"Buscá una jugada de la dama que dé jaque y ataque la torre a la vez.", fen:"r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1", sol:["Qd5"], ok:"¡Jaque y la torre de a8 queda colgada!", hint:"Pensá en la casilla d5: mirá sus diagonales."},
  {t:"move", h:"Ataque descubierto", text:"Si el alfil se corre, la torre da jaque. Elegí bien adónde va el alfil.", fen:"1q2k3/8/8/4B3/8/8/8/4R1K1 w - - 0 1", sol:["Bxb8"], ok:"¡Jaque descubierto y te comiste la dama!", hint:"El alfil puede capturar algo mientras destapa la torre."},
  {t:"move", h:"Enfilada", text:"Atacás una pieza valiosa que, al moverse, deja expuesta otra detrás. Dale jaque al rey de forma que la dama quede detrás.", fen:"8/8/8/3k2q1/8/8/8/R6K w - - 0 1", sol:["Ra5"], ok:"El rey tiene que salir de la fila 5 y la torre come la dama.", hint:"El rey y la dama están en la misma fila."}
 ]},
{id:"mates", title:"Mates básicos", icon:"bQ", desc:"El pastor (y cómo evitarlo) y cómo dar mate con dama o torre.",
 steps:[
  {t:"info", h:"El mate del pastor", text:"Dama y alfil atacan f7, la casilla más débil de las negras: al principio solo la defiende el rey. Es la trampa más común entre principiantes.", moves:"e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#", marks:{f7:"r"}},
  {t:"move", h:"Defendete del pastor", text:"Las blancas amenazan Qxf7#. Defendé f7.", moves:"e4 e5 Qh5 Nc6 Bc4", sol:["g6","Qe7","Qf6","Nh6"], ok:"f7 está a salvo. Después podés atacar la dama con ...Nf6 y ganar tiempo.", hint:"Tapá la diagonal de la dama o defendé f7."},
  {t:"move", h:"Mate con dama y rey", text:"Tu rey ya está cerca. Dá mate.", fen:"k7/8/1K6/8/8/8/8/6Q1 w - - 0 1", goal:"mate", ok:"¡Mate! La dama cubre la fila 8 y tu rey, la 7.", hint:"Con el rey en b6, el negro no puede ir a la fila 7."},
  {t:"info", h:"La técnica con dama", text:"Con rey y dama contra rey se gana siempre: con la dama encerrás al rey rival en una caja cada vez más chica (moviéndola a salto de caballo de él), lo llevás al borde y recién ahí acercás tu rey para dar mate. Ojo con el ahogado: dejale siempre al menos una casilla.", fen:"8/8/3k4/8/8/8/8/Q3K3 w - - 0 1"},
  {t:"move", h:"Mate con torre y rey", text:"Rey contra rey enfrentados: la torre da el golpe.", fen:"k7/8/1K6/8/8/8/8/7R w - - 0 1", goal:"mate", ok:"¡Mate! Tu rey cubre la fila 7 y la torre, la 8.", hint:"La torre a la última fila."},
  {t:"move", h:"La escalera con dos torres", text:"Una torre corta la fila 7. La otra da el mate.", fen:"6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1", goal:"mate", ok:"¡Mate de la escalera! Las torres se turnan para empujar al rey hasta el borde.", hint:"La torre de b1 sube hasta la fila 8."}
 ]},
{id:"finales", title:"Finales clave", icon:"wP", desc:"Regla del cuadrado, oposición y torres detrás del peón.",
 steps:[
  {t:"info", h:"La regla del cuadrado", text:"Para saber si un rey alcanza a un peón pasado: imaginá un cuadrado desde el peón hasta la fila de coronación. Si el rey rival puede entrar al cuadrado en su turno, lo alcanza; si no, el peón corona solo.", fen:"8/8/8/8/P7/8/7k/K7 w - - 0 1", marks:{a5:"g",d5:"g",a8:"g",d8:"g"}},
  {t:"move", h:"Corré el peón", text:"El rey negro está fuera del cuadrado. ¡Avanzá!", fen:"8/8/8/8/P7/8/7k/K7 w - - 0 1", sol:["a5"], ok:"El rey negro no llega: el peón corona solo."},
  {t:"info", h:"La oposición", text:"Los reyes enfrentados con una casilla de por medio: el que tiene que mover cede terreno. Acá juegan las negras y tienen que apartarse; el rey blanco avanza y el peón corona.", fen:"4k3/8/4K3/4P3/8/8/8/8 b - - 0 1", marks:{e6:"g",e8:"r"}},
  {t:"move", h:"Rey delante del peón", text:"En los finales de rey y peón, el rey va adelante del peón, no atrás. Avanzá el rey.", fen:"4k3/8/8/4K3/4P3/8/8/8 w - - 0 1", sol:["Ke6","Kd6","Kf6"], ok:"¡Eso! Con el rey delante del peón, las negras tienen que ceder paso.", hint:"El rey sube a la fila 6."},
  {t:"info", h:"Torres detrás del peón pasado", text:"En los finales de torres, la torre va detrás del peón pasado, sea propio o rival. Desde atrás lo empuja (o lo frena) y gana actividad a medida que el peón avanza.", fen:"6k1/8/8/P7/8/8/5PPP/R5K1 w - - 0 1", arrows:["a1a5"]},
  {t:"info", h:"¿Y ahora?", text:"Ya tenés lo básico. Próximo paso: aprendé una apertura con blancas y una con negras (en la Escuela tenés tres para empezar), jugá partidas y, después de cada una, buscá dónde perdiste material. Así se mejora."}
 ]}
];
