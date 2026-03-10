# Deutsch Algorithm — Quantum Computer Simulator

![](screenshot1.png)

An interactive, educational visualization of the **Deutsch Algorithm** running entirely in the browser. No frameworks, no build tools, no dependencies beyond CDN-loaded MathJax and marked.js.

## What is the Deutsch Algorithm?

The Deutsch Algorithm (1985) is the simplest quantum algorithm to demonstrate **quantum advantage**: it determines whether a hidden function f(x) is *constant* (same output for all inputs) or *balanced* (different outputs for different inputs) using **one oracle call** — something a classical computer cannot do with fewer than two.

It's not practically useful on its own, but it's the conceptual seed of more powerful algorithms like Deutsch–Jozsa, Simon's Algorithm, and Shor's Algorithm.

## Features

- **Animated quantum circuit** — gates illuminate sequentially as the algorithm executes
- **Dual Bloch sphere visualization** — canvas-rendered state vectors rotate in real time for both the input and ancilla qubits
- **Live state vector panel** — amplitude bars and probability percentages update after each gate, with sign-coded colors (positive / negative amplitudes)
- **Floating gate tooltips** — hover any gate to see its matrix in LaTeX, transformation rules, and a plain-English explanation of its role
- **Step-by-step narration** — synchronized explanation text walks through superposition, phase kickback, interference, and measurement collapse
- **Four oracle functions** — simulate all four valid oracles: f(x)=0, f(x)=1, f(x)=x, f(x)=1−x

## Algorithm Steps Visualized

| Step | Operation | What Happens |
|------|-----------|--------------|
| 0 | Initialization | System prepared as \|0⟩\|1⟩ |
| 1 | Hadamard ⊗ Hadamard | Both qubits enter superposition |
| 2 | Oracle U_f | Phase kickback encodes f(x) as ±1 phases |
| 3 | Hadamard on input | Interference amplifies the correct answer |
| 4 | Measurement | First qubit collapses — constant or balanced |

![](screenshot2.png)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, canvas, animations) |
| Logic | Vanilla JavaScript (ES2017 async/await) |
| Math rendering | MathJax 3 (via CDN) |
| Markdown | marked.js (via CDN) |
| Graphics | HTML Canvas (Bloch spheres) |

No npm. No build step. Open the file and it runs.

## Usage
```bash
git clone https://github.com/your-username/deutsch-algorithm-simulator
cd deutsch-algorithm-simulator
open deutsch-algorithm.html   # or just double-click the file
```

1. Select one of the four oracle functions
2. Press **Run Quantum Computer**
3. Watch the algorithm execute step by step
4. Hover the gate boxes (H, U_f, M) to inspect their matrices and explanations

## Quantum Concepts Covered

- **Superposition** — representing multiple inputs simultaneously
- **Quantum parallelism** — evaluating f(0) and f(1) in a single oracle call
- **Phase kickback** — encoding function information as a phase rather than a bit flip
- **Interference** — constructive/destructive amplitude cancellation revealing the answer
- **Measurement collapse** — the Born rule and why the result is deterministic here

## License

MIT
