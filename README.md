# 福龍 Dragon Fortune Pachinko

> Japanese pachinko simulator recreated with pure web technologies — no frameworks, no custom dependencies. Just HTML5, CSS and JavaScript... and real physics.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Matter.js](https://img.shields.io/badge/Physics-Matter.js-orange?style=flat)

---

## What is this?

Pachinko is Japan's most iconic arcade machine: a mix of pinball and slot machine where steel balls fall through a board full of pins, triggering bonuses, reels and jackpots.

This project recreates that experience in the browser, with the look of a real physical cabinet, neon effects, a simulated physics system and game modes taken from authentic pachinko.

Developed as a web programming class project.

---

## Features

### Gameplay
- **Real physics system** with [Matter.js](https://brm.io/matter-js/) — balls bounce, fall and behave naturally
- **Hold SPACE** to charge the launch power; release it to fire
- **V-Zone** — high-value central zone that triggers the digital reels
- **Tulip gates** — side gates that open and close dynamically
- **Bonus gates** — lower gates with extra points
- **FEVER mode** — ×5 multiplier for 30 seconds after hitting the jackpot
- **REACH mode** — last-chance warning before the jackpot
- **Digital reels** with 8 symbols (🐉 💰 🌸 🎱 ⭐ 🔔 💎 🍀) and a spinning animation

### Scoring system
- Dynamic multipliers (×1 → ×2 → ×3 → ×5 in Fever)
- High score saved in `localStorage`
- Stackable credits through the `+¥ CRÉD` button
- Local leaderboard (top 5)
- Full game statistics: shots, accuracy, V-zones, gates, tulips, jackpots, bonuses and time

### Game options
| Option | Description |
|---|---|
| ⬡ CIRCUITO | Turns the circuit-trace visual effect in the background on/off |
| 🔊 SONIDO | Turns the Web Audio API sound effects on/off |
| ↓ BAJA G | Lowers gravity for a gentler fall |
| 🤖 AUTO | Continuous automatic launching |
| LEVEL | Switches between EASY / NORMAL / HARD difficulty |

> Option names are shown exactly as they appear in the game interface.

### Look and feel
- Full arcade cabinet with decorative side panels
- Animated marquee with looping text
- Speakers with a vibration animation
- Animated neon signs (PACHINKO / FEVER)
- LED dot-matrix panels on both sides
- Attract screen with a real-time jackpot counter and demo reels
- Game Over screen with leaderboard and game summary
- Floating ambient kanji: 福 (luck), 龍 (dragon), 運 (fortune), 宝 (treasure), 金 (gold)

---

## Installation and usage

There are no dependencies to install and no build steps. Just clone and open:

```bash
git clone https://github.com/misteralva/Pachinko.git
cd Pachinko
# Open index.html in your browser
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

Or, if you prefer a local server:

```bash
# With Python
python -m http.server 8000

# With Node.js (npx)
npx serve .
```

Then open `http://localhost:8000` in your browser.

---

## Controls

| Action | Keyboard | Mouse / Screen |
|---|---|---|
| Charge power | Hold `SPACE` | Hold the LAUNCH button |
| Fire ball | Release `SPACE` | Release the LAUNCH button |
| Add credit | — | `+¥ CRÉD` button |
| Spin reels | — | `GIRAR` button |
| Insert coin (start) | Any key | Click on screen |

---

## Project structure

```
Pachinko/
├── index.html      # Full cabinet structure and overlays (628 lines)
├── style.css       # Cabinet styles, neon effects, animations (~48% of the code)
└── script.js       # Game logic, Matter.js physics, audio (~34% of the code)
```

The project has no extra folders or local dependencies. Matter.js is loaded from a CDN.

---

## Technologies used

- **HTML5** — semantic structure of the cabinet and all the game overlays
- **CSS3** — `@keyframes` animations, CSS variables, neon effects, `backdrop-filter`, responsive design
- **JavaScript (ES6+)** — game logic, event system, state management, `localStorage`
- **Matter.js 0.20** — 2D physics engine for realistic ball simulation
- **Web Audio API** — procedurally generated sound effects with no external audio files

---

## License

Academic project. Free to use for educational purposes.

---

*Developed for a web programming class · 2025*
