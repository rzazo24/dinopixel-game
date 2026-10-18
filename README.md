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
- **Ayuda**: botón *Ayuda* del menú y de la pausa (o la tecla `H`), con controles, animales y consejos.

## Ejecutarlo en local

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

Hace falta servirlo por `http://localhost` (o HTTPS): el service worker no funciona abriendo el archivo con `file://`.

## Desplegar en Vercel

Es un sitio estático: en Vercel elige el preset **Other**, sin *Build Command* ni *Output Directory*.
[vercel.json](vercel.json) ya fija las cabeceras de caché de `sw.js` y del manifest.
El proyecto incluye **Vercel Analytics**; actívalo en la pestaña *Analytics* del proyecto.

## PWA: publicar una versión nueva

El service worker guarda los archivos en una caché con nombre. Para que los usuarios reciban un cambio y vean el
aviso **"Nueva versión"**, sube el número de `CACHE` en [sw.js](sw.js) en cada publicación:

```js
const CACHE = 'dinopixel-v23';   // -> 'dinopixel-v24', ...
```

Notas de instalación:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*. Se abre en horizontal y sin barras del navegador.
- **iPhone/iPad:** Safari → Compartir → *Añadir a pantalla de inicio*. iOS no permite fijar la orientación ni
  vibrar; si el móvil está en vertical, el juego pide girarlo.
- Si ya habías instalado una versión antigua como acceso directo, bórrala y vuelve a instalarla.

## Estructura

```
index.html      menú, escenario del juego y overlays
style.css       interfaz pixel (botones biselados, iconos, adaptación a móvil/notch)
game.js         motor: física, obstáculos, sprites, fuente pixel, iconos, desbloqueos, PWA
sw.js           service worker (caché, aviso de nueva versión)
manifest.json   datos de la PWA
icons/          iconos de la app
fonts/          Press Start 2P (licencia OFL)
docs/           capturas del README
```

Cómo está hecho, por si quieres tocarlo:

- **Sprites** definidos como texto en [game.js](game.js) (`ANIMALS`), con contorno automático y un sprite agachado
  por animal. Para añadir un animal, copia una entrada y define su cuerpo, patas y habilidad.
- **Resolución nativa**: el canvas usa los píxeles reales de la pantalla con escala entera, así que el pixel art
  se ve nítido en cualquier densidad.
- **Texto e iconos pixel** dibujados desde mapas de bits, sin imágenes.

## Créditos

- Fuente [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) de CodeMan38, bajo licencia
  [SIL Open Font License 1.1](fonts/OFL.txt).
- Inspirado en el dinosaurio sin conexión de Chrome. Todo el arte y el código de este proyecto son originales.
