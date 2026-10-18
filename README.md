# DinoPixel

**[Juega ahora: dinopixel-game.vercel.app](https://dinopixel-game.vercel.app/)**

Un juego de correr y saltar al estilo del dinosaurio de Chrome, en pixel art a color, con **6 animales
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
| Agacharse | `↓` / `S` | Mantén pulsada la parte baja |
| Pausa | `P` / `Esc` | Botón ⏸ |
| Pantalla completa | `F` | Se activa al pulsar JUGAR |
| Sonido | `M` | Botón del menú |

Esquiva cactus (salta) y pájaros (agáchate o salta, según la altura). Cada 700 puntos cambia entre día y noche,
y la velocidad aumenta con la puntuación.

## Animales y habilidades

Empiezas con el dino; el resto se desbloquea con tu **mejor puntuación** (con cualquier animal).

| Animal | Puntos | Habilidad |
|---|---|---|
| Dino | 0 | Clásico, sin habilidad |
| Gato | 300 | **Salto doble**: un segundo salto en el aire |
| Perro | 600 | **Escudo**: sobrevive a un golpe por partida |
| Conejo | 1000 | **Salto alto** |
| Gallina | 1500 | **Planeo**: mantén pulsado al caer |
| Pingüino | 2000 | **Deslizar**: agachado en el suelo, puntos x2 |

Los récords se guardan por animal en el navegador (`localStorage`).

## Ajustes

- **Velocidad** (60–100 %): ralentiza todo el juego por igual. Por defecto 100 % en móvil y 80 % en PC.
- **Sonido**: efectos generados con WebAudio (no hay archivos de audio).
- **Vibración**: solo en dispositivos que la soportan (Android).
- **Ranking**: botón *Ranking* del menú y de la pausa (ver más abajo), con opción de borrar tus datos.
- **Ayuda**: botón *Ayuda* del menú y de la pausa (o la tecla `H`), con controles, animales y consejos.

## Ranking global

Ranking online con **apodo** y tableros **global y por animal** (top 20 y tu posición). Se abre desde el botón
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
`POST /api/name`, `POST /api/delete`.

**Privacidad:** solo se guardan tu apodo (en mayúsculas), tu mejor puntuación y un id aleatorio generado en tu
dispositivo. El botón *Borrar mis datos* de la pantalla de ranking (con doble confirmación) elimina tu apodo y tus
puntuaciones de todos los tableros y genera un id nuevo. La consulta del ranking está limitada por IP para acotar el
gasto.

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
const CACHE = 'dinopixel-v28';   // -> 'dinopixel-v29', ...
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
game.js         motor: física, obstáculos, sprites, fuente pixel, iconos, desbloqueos, PWA
sw.js           service worker (caché, aviso de nueva versión)
api/            funciones del ranking (Vercel Functions + Upstash Redis)
manifest.json   datos de la PWA
icons/          iconos de la app
fonts/          Press Start 2P (licencia OFL)
docs/           capturas del README y del manifest
og-image.png    imagen de vista previa al compartir el enlace (1200x630)
```

Cómo está hecho, por si quieres tocarlo:

- **Sprites** definidos como texto en [game.js](game.js) (`ANIMALS`), con contorno automático y un sprite agachado
  por animal. Para añadir un animal, copia una entrada y define su cuerpo, patas y habilidad.
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
