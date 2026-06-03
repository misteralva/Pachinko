# 福龍 Dragon Fortune Pachinko

> Simulador de pachinko japonés recreado con tecnologías web puras — sin frameworks, sin dependencias propias. Solo HTML5, CSS y JavaScript... y física real.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Matter.js](https://img.shields.io/badge/Physics-Matter.js-orange?style=flat)

---

## ¿Qué es esto?

El pachinko es la máquina arcade más icónica de Japón: una mezcla de pinball y tragaperras en la que bolas de acero caen por un tablero repleto de pines, desencadenando bonificaciones, carretes y jackpots.

Este proyecto recrea esa experiencia en el navegador, con estética de gabinete físico real, efectos de neón, sistema de física simulada y modos de juego propios del pachinko auténtico.

Desarrollado como proyecto de clase de programación web.

---

## Características

### Jugabilidad
- **Sistema de física real** con [Matter.js](https://brm.io/matter-js/) — las bolas rebotan, caen y se comportan de forma natural
- **Mantén pulsado SPACE** para cargar la potencia de lanzamiento; suéltalo para disparar
- **V-Zone** — zona central de alto valor que activa los carretes digitales
- **Tulip gates** — compuertas laterales que se abren y cierran dinámicamente
- **Bonus gates** — puertas inferiores con puntuación adicional
- **Modo FEVER** — multiplicador ×5 durante 30 segundos al conseguir jackpot
- **Modo REACH** — aviso de última oportunidad antes del jackpot
- **Carretes digitales** con 8 símbolos (🐉 💰 🌸 🎱 ⭐ 🔔 💎 🍀) y animación de giro

### Sistema de puntuación
- Multiplicadores dinámicos (×1 → ×2 → ×3 → ×5 en Fever)
- Récord guardado en `localStorage`
- Créditos acumulables mediante el botón `+¥ CRÉD`
- Tabla de clasificación local (top 5)
- Estadísticas completas de partida: tiros, precisión, V-zones, gates, tulips, jackpots, bonuses y tiempo

### Opciones de juego
| Opción | Descripción |
|---|---|
| ⬡ CIRCUITO | Activa/desactiva el efecto visual de trazado de circuito en el fondo |
| 🔊 SONIDO | Activa/desactiva los efectos de sonido Web Audio API |
| ↓ BAJA G | Reduce la gravedad para una caída más suave |
| 🤖 AUTO | Lanzamiento automático continuo |
| LEVEL | Alterna entre dificultades EASY / NORMAL / HARD |

### Estética
- Gabinete de arcade completo con paneles laterales decorativos
- Marquesina animada con texto en bucle
- Altavoces con animación de vibración
- Signos de neón animados (PACHINKO / FEVER)
- Paneles de matriz de puntos LED en ambos laterales
- Pantalla de atracción con contador de jackpot en tiempo real y carretes demo
- Pantalla de Game Over con ranking y resumen de partida
- Kanji flotantes de ambiente: 福 (suerte), 龍 (dragón), 運 (fortuna), 宝 (tesoro), 金 (oro)

---

## Instalación y uso

No hay dependencias que instalar ni pasos de compilación. Simplemente clona y abre:

```bash
git clone https://github.com/misteralva/Pachinko.git
cd Pachinko
# Abre index.html en tu navegador
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

O si prefieres un servidor local:

```bash
# Con Python
python -m http.server 8000

# Con Node.js (npx)
npx serve .
```

Luego abre `http://localhost:8000` en tu navegador.

---

## Controles

| Acción | Teclado | Ratón / Pantalla |
|---|---|---|
| Cargar potencia | Mantener `SPACE` | Mantener botón LAUNCH |
| Disparar bola | Soltar `SPACE` | Soltar botón LAUNCH |
| Añadir crédito | — | Botón `+¥ CRÉD` |
| Girar carretes | — | Botón `GIRAR` |
| Insertar moneda (inicio) | Cualquier tecla | Clic en pantalla |

---

## Estructura del proyecto

```
Pachinko/
├── index.html      # Estructura completa del gabinete y overlays (628 líneas)
├── style.css       # Estilos del gabinete, efectos neón, animaciones (~48% del código)
└── script.js       # Lógica del juego, física Matter.js, audio (~34% del código)
```

El proyecto no tiene carpetas adicionales ni dependencias locales. Matter.js se carga desde CDN.

---

## Tecnologías utilizadas

- **HTML5** — estructura semántica del gabinete y todos los overlays del juego
- **CSS3** — animaciones `@keyframes`, variables CSS, efectos de neón, `backdrop-filter`, diseño responsivo
- **JavaScript (ES6+)** — lógica de juego, sistema de eventos, gestión de estado, `localStorage`
- **Matter.js 0.20** — motor de física 2D para la simulación realista de las bolas
- **Web Audio API** — efectos de sonido generados proceduralmente sin archivos de audio externos

---

## Licencia

Proyecto académico. Uso libre para fines educativos.

---

*Desarrollado para clase de programación web · 2025*
