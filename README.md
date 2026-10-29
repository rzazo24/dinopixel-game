# DinoPixel

*Español · [English](README.en.md)*

**[Juega ahora: dinopixel-game.vercel.app](https://dinopixel-game.vercel.app/)**

Un juego de correr y saltar al estilo del dinosaurio de Chrome, en pixel art a color, con **9 animales
desbloqueables**, cada uno con su propia habilidad. Se juega en el navegador y se puede instalar como **PWA**
(funciona sin conexión). Sin dependencias ni paso de compilación: HTML, CSS y JavaScript puros.

| Menú | Partida |
|---|---|
| ![Menú](docs/menu.png) | ![Partida](docs/game.png) |

## Cómo se juega

| Acción | Teclado | Táctil |
|---|---|---|
| Saltar | `Espacio` / `↑` / `W` | Toca la pantalla |
| Salto más corto | Suelta la tecla pronto | Toque corto |
| Caer rápido (en el aire) | `↓` / `S` | Desliza hacia abajo |
| Pausa | `P` / `Esc` | Botón ⏸ |
| Pantalla completa | `F` | Se activa al pulsar JUGAR |
| Efectos de sonido | `M` | Botón del menú |
| Música | `N` | Botón del menú |

Solo hay una acción: **saltar** (mantén para saltar más alto), y en el aire puedes **caer rápido**. Si pulsas saltar un
instante antes de aterrizar, el salto se guarda y sale al tocar el suelo. Pasar **muy cerca** de un obstáculo sin tocarlo da
**+20 puntos** (*¡Cerca!*), y la pantalla tiembla al romperse un escudo o al chocar. Salta los obstáculos del suelo y los pájaros bajos y medios
(estos, un poco más alto); por debajo de los pájaros altos se pasa sin hacer nada. Cada 700 puntos cambia
entre día y noche, y la velocidad aumenta con la puntuación: rápido al principio y cada vez más despacio, acercándose al máximo hacia
los cuatro minutos de partida (la mitad del aumento llega hacia el minuto y medio).

**Obstáculos que se mueven:** desde 800 puntos, alrededor de 1 de cada 4 obstáculos de suelo se mueve más rápido que
el suelo, así que llega antes: una **planta rodadora** que bota (desierto), una **bola de nieve** (nieve) un
**coche** (ciudad), un **coco** que bota (selva) y una **roca** rodando (volcán). Nunca son más altos que un cactus pequeño, y el juego limita su velocidad para que no alcancen al
obstáculo de delante y formen un combo imposible.

**Monedas y objetos:** las monedas dan 10 puntos y salen en arco sobre algunos cactus (se cogen al saltarlos) o en
fila tras un obstáculo, a ras de suelo o en alto. Desde 400 puntos aparecen, de vez en cuando, un **escudo** (aguanta
un golpe, con cualquier animal; se acumulan) y un **imán** (atrae las monedas cercanas durante 6 s; si coges otro, el tiempo se suma). Un contador bajo la
puntuación muestra las monedas de la partida, y el **monedero** de la esquina del menú, las monedas que puedes gastar.

**Tienda:** las monedas se gastan en la **Tienda** (botón del menú, o tocando el monedero): desbloquear un animal antes
de llegar a su puntuación (cuesta su puntuación entre 10: gato 100, …, tortuga 800) comprar **colores** (Dorado,
Sombra, Hielo, Chicle; 300 cada uno) o **sombreros** (Gorra 150, Chistera 250, Vaquero 300, Papá Noel 400, Corona 600).
**Accesorios con poderes** (uno por animal): **Botas con muelles** (500, saltas un 15 % más alto),
**Bufanda magnética** (400, el imán dura 10 s y atrae desde más lejos), **Collar de la suerte** (600, salen monedas
tras muchos más obstáculos) y **Gafas de aviador** (700, los pájaros salen más lejos y un **!** rojo en el borde avisa
de que vienen). En el ranking (global y por animal), las puntuaciones hechas con un accesorio llevan su icono junto al animal, un
**\*** y van en naranja, con una leyenda debajo.
Colores, sombreros y accesorios se compran una vez, sirven para todos los animales y se elige cuál lleva cada uno; se ven en la
partida y en el menú. El monedero
muestra el saldo; lo gastado no resta progreso a los logros de monedas.

**Reto del día:** cada día hay un reto distinto (el mismo todo el día, se renueva a medianoche): llegar a X puntos
con un animal, recoger X monedas, esquivar X pájaros u obstáculos, o aguantar X segundos, siempre en una
partida. Da 50–70 monedas, +10 por cada día seguido de racha (hasta +50). Se ve en el botón **Reto** del menú y en la
pantalla de inicio de partida. Las monedas de premio se pueden gastar, pero no cuentan para los logros de monedas.

**Estadísticas:** pestaña dentro de **Logros** con partidas, tiempo jugado, mejor puntuación, saltos, esquivas,
monedas recogidas y gastadas, y el récord de cada animal.

**Zonas:** cada 1500 puntos cambias de escenario, con transición de colores y aviso: **Desierto** (cactus),
**Nieve** (muñecos de nieve y pinos) y **Ciudad** (conos y bocas de incendio, con edificios al fondo), **Selva** (arbustos y tocones) y **Volcán**
(rocas y rocas de lava). Después vuelve
al desierto. Todos los obstáculos del suelo tienen el mismo tamaño, así que cambia el paisaje, no la dificultad.

## Halloween (del 24 de octubre al 2 de noviembre)

Durante esos días el juego se disfraza solo, sin tocar nada:

- **Ambiente:** los pájaros son **murciélagos**, las monedas son **caramelos**, salen **calabazas** entre los cactus,
  la noche llega antes (a los 350 puntos) y es morada, con luna llena naranja. El menú se tiñe de morado y naranja,
  con murciélagos, calabazas y un *¡Feliz Halloween!*.
- **Zona Cementerio:** sexta zona después del volcán, con lápidas y calabazas, un **fantasma** flotante como obstáculo
  que se mueve y su propia canción tétrica.
- **Tienda de temporada:** sombreros **Bruja** (250) y **Calabaza** (350), y colores **Zombi** y **Fantasma** (300).
  Solo se venden esos días, pero lo que compres se queda para siempre.
- **Reto especial el 31:** *Truco o trato*, recoge 31 caramelos en una partida (100 monedas).
- **Logro *Truco o trato*:** recoge 100 caramelos en Halloween.

Para probarlo fuera de fecha: `?season=halloween` en la URL (y `?season=off` para quitarlo).

## Animales y habilidades

Empiezas con el dino; el resto se desbloquea con tu **mejor puntuación** (con cualquier animal): uno nuevo cada 1000 puntos.

| Animal | Puntos | Habilidad |
|---|---|---|
| Dino | 0 | Clásico, sin habilidad |
| Gato | 1000 | **Salto doble**: un segundo salto en el aire |
| Perro | 2000 | **Escudo**: empieza cada partida con un escudo (se suma a los que recoja); solo ese cuenta para el logro *Escudo de hierro* |
| Conejo | 3000 | **Salto alto** |
| Gallina | 4000 | **Planeo**: mantén pulsado al caer |
| Pingüino | 5000 | **Patinador**: suma un 50 % más de puntos |
| Rana | 6000 | **Supersalto**: se carga sola mientras corre por el suelo; tras ~¾ s sin saltar, el siguiente salto es mucho más alto (una barra amarilla encima avisa) |
| Zorro | 7000 | **Esquiva**: el primer pájaro que le toca lo atraviesa; luego se recarga en 8 s (barra naranja = lista) |
| Tortuga | 8000 | **Caparazón**: los pájaros no le hacen daño |

Los récords se guardan por animal en el navegador (`localStorage`).

## Logros

25 logros con aviso en pantalla al conseguirlos y una pantalla **Logros** (botón del menú) con el progreso de cada
uno. Entre ellos: puntuaciones (500 a 7000), partidas jugadas, saltos, obstáculos y pájaros esquivados, monedas (100 y 1000), aguantar 2 minutos, uno por habilidad (doble salto del gato, escudo del perro, planeo de la gallina, deslizar del
pingüino), 1500 con cada animal, desbloquear los 9, entrar en el top 3 del ranking, ser el número 1 de la semana, completar 7 retos diarios, compartir y recoger 100 caramelos en Halloween. Se guardan en el
navegador (`localStorage`); los que ya cumplas al abrir el juego se marcan solos, sin avisos.

## Ajustes

- **Pausa**: Seguir, velocidad, volumen, pantalla completa, ranking, logros, ayuda y volver al menú.
- **Velocidad** (60–100 %): ralentiza todo el juego por igual. Por defecto 100 % en móvil y 80 % en PC.
- **Volumen** (botón del menú y de la pausa): 25, 50, 75 o 100 %, para música y efectos a la vez, con un pitido para
  oír el nivel. Se recuerda.
- **Efectos** (`M`): sonidos generados con WebAudio (no hay archivos de audio). Un tic suave cada 500 puntos (con un
  parpadeo del marcador), un arpegio al conseguir un logro y una fanfarria al desbloquear un animal.
- **Música** (`N`): chiptune generado en directo, sin archivos de audio, así que funciona sin conexión. Cada zona tiene su canción,
  con versión de día y de noche: el desierto en tono mayor (menor de noche), la nieve tranquila y con melodía de
  campanita, y la ciudad más rápida, con bajo en corcheas y bombo en cada tiempo; la selva
  alegre, con melodía de marimba, y el volcán grave y oscuro, el más rápido. El tempo sube con la velocidad del juego (y con el ajuste de
  velocidad), y al ir más rápido entran el charles y el bombo. Se pausa con la pausa y se corta al morir; el menú
  es silencioso. Los efectos y la música se activan por separado y se recuerdan.
- **Vibración**: solo en Android (en iPhone no aparece el botón: Safari no permite vibrar desde una web).
- **Idioma**: español o inglés. Se elige solo según el idioma del navegador y se cambia con el botón *English* / *Español* del menú.
- **Ranking**: botón *Ranking* del menú y de la pausa (ver más abajo), con opción de borrar tus datos.
- **Ayuda**: botón *Ayuda* del menú y de la pausa (o la tecla `H`), con controles, animales y consejos.

## Guardado en el servidor

Botón **Guardado** (nube) en el menú. Al activarlo, el servidor da un **código de recuperación** (`XXXXX-XXXXX`):
con él recuperas tu partida en otro móvil o después de borrar los datos del navegador. Sin cuentas ni contraseñas.

- **Qué se guarda:** récords, monedas, compras, colores, logros, estadísticas, la racha del reto diario, el apodo y
  tu identidad en el ranking. No se guardan los ajustes del dispositivo (velocidad, volumen, música, efectos, vibración, idioma).
- **Cuándo:** solo, al terminar cada partida, al comprar en la tienda, al cambiar de apodo y al cerrar la app; y con
  *Guardar ahora*.
- **Recuperar** sustituye el progreso del dispositivo (con doble confirmación). Si juegas en dos móviles a la vez con
  el mismo código, vale la última partida guardada.
- **Privacidad y seguridad:** el servidor no guarda el código, solo una huella (hash) de él; la carga está limitada a 20
  intentos por hora e IP para que los códigos no se puedan adivinar; *Borrar copia del servidor* la elimina, y si no
  se usa caduca a los ~13 meses.

Endpoints: `POST /api/save` (`{ data }` crea, `{ code, data }` actualiza, `{ code, delete: true }` borra) y
`POST /api/load` (`{ code }`).

## Ranking global

Ranking online con **apodo**, en dos periodos: **Semana** (se reinicia sola cada lunes a las 00:00 UTC, con cuenta atrás) e **Histórico**. Cada uno tiene tablero global y uno por animal (top 20 y tu posición), y cada fila muestra el icono del animal con el que se logró la puntuación. Se abre desde el botón
*Ranking* del menú o de la pausa; al morir, el juego muestra tu puesto.

- **Cómo funciona:** funciones de Vercel en [api/](api/) (sin dependencias) guardan las puntuaciones en
  [Upstash Redis](https://upstash.com/) usando su API REST. Solo se guarda tu apodo (siempre en mayúsculas), un id aleatorio y tu mejor
  puntuación (la IP se usa un momento para limitar envíos y no se almacena).
- **Sin conexión:** la puntuación se guarda y se envía cuando vuelva la red. Si el ranking no está configurado,
  el juego funciona igual y la pantalla de ranking avisa de que no está disponible.
- **Trampas:** no hay protección perfecta en un juego de navegador. El servidor firma cada partida al empezar,
  comprueba que el tiempo transcurrido cuadre con la puntuación, acepta cada partida una sola vez, limita los
  envíos por jugador e IP y filtra apodos. Frena las trampas casuales, no a alguien decidido.

**Activarlo en Vercel** (una sola vez):

1. En el proyecto de Vercel: *Storage → Create Database → Upstash (Redis)*. El plan **Free** basta de sobra.
2. Conéctalo al proyecto. Vercel crea las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`
   (también valen `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`).
3. Vuelve a desplegar. Opcional: define `SCORE_SECRET` para firmar las partidas con tu propia clave.

Endpoints: `GET /api/start`, `POST /api/score`, `GET /api/ranking?board=all|dino|cat|dog|bunny|chick|peng`,
`POST /api/name`, `POST /api/delete`. `ranking` acepta `period=week|all`.

**Privacidad:** solo se guardan tu apodo (en mayúsculas), tu mejor puntuación y un id aleatorio generado en tu
dispositivo. El botón *Borrar mis datos* de la pantalla de ranking (con doble confirmación) elimina tu apodo y tus
puntuaciones de todos los tableros y genera un id nuevo. La consulta del ranking está limitada por IP para acotar el
gasto.

## Tests

Sin dependencias: Node 22+ y Chrome/Chromium.

```bash
node tests/run.mjs        # sintaxis + tests de la API + tests del juego en Chrome (~1 min)
node tests/api.test.mjs   # solo la API (validaciones, anti-trampas, ranking semanal, borrado, límites)
node tests/ui.test.mjs    # solo el juego (menú, partida, habilidades, logros, ranking, PWA)
```

Los tests arrancan un Redis simulado y un servidor local que ejecuta `api/*.js` como Vercel, y manejan Chrome por
DevTools. El juego expone `window.__dp` solo si la URL lleva `?test=1`. Si Chrome no está en el `PATH`, define
`CHROME_BIN`. GitHub Actions ([.github/workflows/test.yml](.github/workflows/test.yml)) los ejecuta en cada subida.

## Compartir

Al morir aparece el botón **Compartir**: abre el menú de compartir del móvil (o copia el texto y el enlace al
portapapeles en escritorio). El enlace al juego muestra una vista previa con imagen en WhatsApp, Telegram y redes
(`og-image.png`, generada a partir del propio juego).

## Ejecutarlo en local

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

Hace falta servirlo por `http://localhost` (o HTTPS): el service worker no funciona abriendo el archivo con `file://`.
Con este servidor el ranking aparece como no disponible; para probarlo en local hace falta `vercel dev` con las
variables de Upstash.

## Desplegar en Vercel

Es un sitio estático: en Vercel elige el preset **Other**, sin *Build Command* ni *Output Directory*.
[vercel.json](vercel.json) ya fija las cabeceras de caché de `sw.js` y del manifest.
El proyecto incluye **Vercel Analytics**; actívalo en la pestaña *Analytics* del proyecto.

## PWA: publicar una versión nueva

El service worker guarda los archivos en una caché con nombre. Para que los usuarios reciban un cambio y vean el
aviso **"Nueva versión"**, sube el número de `CACHE` en [sw.js](sw.js) en cada publicación:

```js
const CACHE = 'dinopixel-v76';   // -> 'dinopixel-v77', ...
```

Notas de instalación:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*. Se abre en horizontal y sin barras del navegador.
- **iPhone/iPad:** Safari → Compartir → *Añadir a pantalla de inicio*. iOS no permite fijar la orientación ni
  vibrar; si el móvil está en vertical, el juego pide girarlo.
- Si ya habías instalado una versión antigua como acceso directo, bórrala y vuelve a instalarla.

## Estructura

```
index.html      menú, escenario del juego, overlays y etiquetas de vista previa (Open Graph)
style.css       interfaz pixel (botones biselados, iconos, adaptación a móvil/notch)
js/             el juego, dividido por temas y cargado en este orden:
  i18n.js         idioma (español/inglés) y traducción de la página
  sprites.js      constantes, sprites de animales y obstáculos
  helpers.js      utilidades, paletas de día/noche y zonas
  canvas.js       canvas a resolución nativa y márgenes del notch
  audio.js        efectos, música chiptune y vibración
  progress.js     desbloqueos, logros y habilidades
  engine.js       estado, obstáculos, física y colisiones
  render.js       dibujo del juego y fuente pixel
  controls.js     iconos, volumen, velocidad, bucle, pausa y entrada
  screens.js      ayuda, compartir y logros
  ranking.js      ranking online
  daily.js        reto del día
  cloud.js        guardado en el servidor (código de recuperación)
  menu.js         menú, ajustes, instalación, PWA y gancho de tests
sw.js           service worker (caché, aviso de nueva versión)
api/            funciones del ranking (Vercel Functions + Upstash Redis)
tests/          tests automáticos (API y navegador)
manifest.json   datos de la PWA
icons/          iconos de la app
fonts/          Press Start 2P (licencia OFL)
docs/           capturas del README y del manifest
og-image.png    imagen de vista previa al compartir el enlace (1200x630)
```

Cómo está hecho, por si quieres tocarlo:

- **Sprites** definidos como texto en [js/sprites.js](js/sprites.js) (`ANIMALS`), con contorno automático. Para añadir un animal, copia una entrada y define su cuerpo, patas y habilidad.
- **Resolución nativa**: el canvas usa los píxeles reales de la pantalla con escala entera, así que el pixel art
  se ve nítido en cualquier densidad.
- **Texto e iconos pixel** dibujados desde mapas de bits, sin imágenes.

## Licencia

El código y el arte de este proyecto se publican bajo la licencia [MIT](LICENSE). La fuente Press Start 2P
(en `fonts/`) mantiene su propia licencia, la [SIL OFL 1.1](fonts/OFL.txt).

## Créditos

- Fuente [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) de CodeMan38, bajo licencia
  [SIL Open Font License 1.1](fonts/OFL.txt).
- Inspirado en el dinosaurio sin conexión de Chrome. Todo el arte y el código de este proyecto son originales.
