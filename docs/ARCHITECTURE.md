# Architecture & Code Flow Diagrams

## System Architecture

### **Three-Layer Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   HTML       │  │     CSS      │  │   Canvas     │    │
│  │              │  │              │  │              │    │
│  │  • Buttons   │  │  • Styling   │  │  • Graphics  │    │
│  │  • Sliders   │  │  • Layout    │  │  • Wave viz  │    │
│  │  • Display   │  │  • Colors    │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              JavaScript (main.js)                     │  │
│  │                                                       │  │
│  │  • Event handling (clicks, slider changes)          │  │
│  │  • Web Audio API (microphone, speakers)             │  │
│  │  • Canvas rendering (wave visualization)            │  │
│  │  • WASM module loading and initialization           │  │
│  │  • Type conversion (JS ↔ WASM)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                     COMPUTATION LAYER                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WebAssembly (audio_dsp_wasm_bg.wasm)         │  │
│  │                                                       │  │
│  │  Rust Code (compiled to WASM):                      │  │
│  │  • Audio DSP algorithms (filters, effects)          │  │
│  │  • Monte Carlo simulation (π estimation)            │  │
│  │  • Wave equation solver (physics simulation)        │  │
│  │  • Memory-safe, high-performance computation        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Data Flow

### **Audio Processing Pipeline**

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER ACTION                              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                   Clicks "Start Microphone"
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ JavaScript: navigator.mediaDevices.getUserMedia()                │
│ • Request microphone permissions                                 │
│ • Create MediaStream                                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ JavaScript: Web Audio API Setup                                  │
│                                                                   │
│   AudioContext ─┬─→ MediaStreamSource (microphone)              │
│                 │                                                 │
│                 ├─→ ScriptProcessorNode (our processor)          │
│                 │                                                 │
│                 └─→ Destination (speakers)                       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Rust: Create AudioProcessor Instance                             │
│                                                                   │
│   let processor = new AudioProcessor(44100);                     │
│                                                                   │
│   AudioProcessor {                                               │
│     sample_rate: 44100,                                          │
│     lpf_x1: 0.0,    ← State variables initialized               │
│     lpf_x2: 0.0,                                                 │
│     delay_buffer: [0.0; 44100],  ← 1 second of delay           │
│     ...                                                          │
│   }                                                              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│              REAL-TIME LOOP (runs ~100 times/second)            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. ScriptProcessorNode.onaudioprocess() fires        │    │
│  │     • Buffer size: 4096 samples (~93ms at 44.1kHz)   │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  2. JavaScript: Copy input to output buffer           │    │
│  │     inputBuffer → outputBuffer (Float32Array)         │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  3. Call Rust WASM: processor.process()               │    │
│  │                                                        │    │
│  │     processor.process(                                │    │
│  │       outputBuffer,    ← Modified in place!          │    │
│  │       gain,            ← 1.0                          │    │
│  │       lpf_cutoff,      ← 20000 Hz                     │    │
│  │       hpf_cutoff,      ← 20 Hz                        │    │
│  │       delay_time,      ← 0.5 seconds                  │    │
│  │       delay_feedback,  ← 0.5                          │    │
│  │       delay_mix,       ← 0.3                          │    │
│  │       distortion       ← 0.2                          │    │
│  │     )                                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  4. Inside Rust (HIGH-SPEED PROCESSING)               │    │
│  │                                                        │    │
│  │  for each sample in buffer:                           │    │
│  │    ├─→ Apply gain                                     │    │
│  │    ├─→ Apply distortion (tanh)                        │    │
│  │    ├─→ Apply low-pass filter (biquad)                 │    │
│  │    ├─→ Apply high-pass filter (biquad)                │    │
│  │    └─→ Apply delay/echo (circular buffer)             │    │
│  │                                                        │    │
│  │  All state variables updated (filter history, etc.)   │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  5. Buffer modified in place (zero-copy!)             │    │
│  │     outputBuffer now contains processed audio         │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  6. Web Audio API sends buffer to speakers            │    │
│  │     User hears the processed audio!                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│                    Loop repeats...                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Audio Processing Details

### **Inside the `process()` Method**

```
Input: buffer = [sample0, sample1, sample2, ..., sample4095]
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Calculate Filter Coefficients (once per buffer)           │
│                                                             │
│  lpf_coeffs = calculate_lowpass_coeffs(20000 Hz)          │
│  hpf_coeffs = calculate_highpass_coeffs(20 Hz)            │
│                                                             │
│  Result: [b0, b1, b2, a1, a2] for each filter             │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Process Each Sample (loop 4096 times)                     │
│                                                             │
│  for sample in buffer.iter_mut():                          │
│    ┌─────────────────────────────────────────────────┐   │
│    │  Sample 0: -0.1234                               │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    ┌─────────────────────────────────────────────────┐   │
│    │  1. Apply Gain                                   │   │
│    │     x = sample * gain                            │   │
│    │     x = -0.1234 * 1.0 = -0.1234                 │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    ┌─────────────────────────────────────────────────┐   │
│    │  2. Apply Distortion                             │   │
│    │     drive = 1.0 + distortion * 10.0              │   │
│    │     x = tanh(x * drive) / tanh(drive)            │   │
│    │     (Soft clipping - adds harmonics)             │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    ┌─────────────────────────────────────────────────┐   │
│    │  3. Apply Low-Pass Filter (Biquad)               │   │
│    │                                                   │   │
│    │  y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2]         │   │
│    │         - a1*y[n-1] - a2*y[n-2]                 │   │
│    │                                                   │   │
│    │  Uses state: lpf_x1, lpf_x2, lpf_y1, lpf_y2    │   │
│    │  Updates state for next sample                   │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    ┌─────────────────────────────────────────────────┐   │
│    │  4. Apply High-Pass Filter (Biquad)              │   │
│    │     (Same structure, different coefficients)     │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    ┌─────────────────────────────────────────────────┐   │
│    │  5. Apply Delay/Echo                             │   │
│    │                                                   │   │
│    │  Circular Buffer:                                │   │
│    │  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐                         │   │
│    │  │ │ │ │ │↑│ │ │ │ │ │  write_pos = 4          │   │
│    │  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘                         │   │
│    │          ↑                                       │   │
│    │       read_pos (delayed)                        │   │
│    │                                                   │   │
│    │  delayed = buffer[read_pos]                      │   │
│    │  buffer[write_pos] = x + delayed * feedback     │   │
│    │  x = x * (1-mix) + delayed * mix                │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    ┌─────────────────────────────────────────────────┐   │
│    │  Write Back to Buffer                            │   │
│    │     *sample = x                                  │   │
│    │     buffer[0] = -0.0987  (processed)            │   │
│    └─────────────────────────────────────────────────┘   │
│                      ↓                                     │
│    Repeat for samples 1, 2, 3, ..., 4095                  │
└─────────────────────────────────────────────────────────────┘
                     ↓
Output: buffer = [processed0, processed1, ..., processed4095]
```

---

## Monte Carlo Simulation Flow

```
User clicks "Run Simulation"
         ↓
JavaScript: Get iterations value (e.g., 10,000,000)
         ↓
JavaScript: Start timer
         ↓
Call WASM: monte_carlo_pi(10000000)
         ↓
┌──────────────────────────────────────────────┐
│  Rust Function (runs in WASM)                │
│                                               │
│  for i in 0..10,000,000:                     │
│    ┌──────────────────────────────────────┐ │
│    │ 1. Generate random x (-1 to 1)       │ │
│    │ 2. Generate random y (-1 to 1)       │ │
│    │ 3. Check if x²+y² ≤ 1 (in circle)   │ │
│    │ 4. Increment counter if inside       │ │
│    └──────────────────────────────────────┘ │
│                                               │
│  Return: 4.0 * (inside / total)              │
│  Example: 4.0 * (7853982/10000000) = 3.1416 │
└──────────────────────────────────────────────┘
         ↓
JavaScript: Stop timer (e.g., 23.5 ms)
         ↓
JavaScript: Calculate error
         ↓
JavaScript: Update UI with results
```

**Why WASM is Fast:**
- 10 million iterations in ~20-50ms
- JavaScript would take 200-500ms
- **10x faster** due to compiled code!

---

## Wave Simulation Flow

```
User clicks "Start Simulation"
         ↓
JavaScript: Start animation loop
         ↓
┌──────────────────────────────────────────────────────────┐
│  requestAnimationFrame() Loop (~60 FPS)                  │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  1. Call WASM: waveSimulation.step()            │   │
│  │                                                  │   │
│  │     Rust computes wave equation:                │   │
│  │     d²u/dt² = c² * d²u/dx²                      │   │
│  │                                                  │   │
│  │     For each point (1 to 798):                  │   │
│  │       laplacian = u[i+1] - 2*u[i] + u[i-1]     │   │
│  │       u_next[i] = 2*u[i] - u_prev[i]           │   │
│  │                   + c²*laplacian                │   │
│  │                                                  │   │
│  │     State updated: current → previous           │   │
│  │                    next → current                │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  2. Call WASM: waveSimulation.get_data()        │   │
│  │                                                  │   │
│  │     Returns: [0.0, 0.1, 0.5, 0.8, ...]         │   │
│  │     (800 float values)                          │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  3. JavaScript: Draw on canvas                   │   │
│  │                                                  │   │
│  │     Clear canvas                                 │   │
│  │     Draw grid lines                              │   │
│  │     Draw wave line:                              │   │
│  │       for i in 0..800:                           │   │
│  │         x = i / 800 * canvas.width               │   │
│  │         y = center - waveData[i] * scale         │   │
│  │         lineTo(x, y)                             │   │
│  │     Stroke path                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                              │
│                    Loop continues...                    │
└──────────────────────────────────────────────────────────┘

User clicks on canvas
         ↓
JavaScript: Calculate position
         ↓
Call WASM: waveSimulation.add_impulse(position, 1.0)
         ↓
Rust: current[position] += 1.0
         ↓
Wave starts propagating!
```

---

## Build Process Detailed

```
┌────────────────────────────────────────────────────────────┐
│  STEP 1: Write Rust Code                                  │
│                                                            │
│  src/lib.rs:                                              │
│    use wasm_bindgen::prelude::*;                         │
│                                                            │
│    #[wasm_bindgen]                                        │
│    pub struct AudioProcessor { ... }                      │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  STEP 2: Compile to WASM                                  │
│                                                            │
│  Command: wasm-pack build --target web                    │
│                                                            │
│  What happens:                                            │
│  1. rustc compiles Rust → WASM bytecode                  │
│  2. wasm-bindgen generates JS bindings                    │
│  3. wasm-opt optimizes WASM (smaller, faster)            │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  STEP 3: Generated Files in pkg/                          │
│                                                            │
│  ├── audio_dsp_wasm.js                                    │
│  │   • JavaScript wrapper                                 │
│  │   • Imports/exports                                    │
│  │   • Type conversions                                   │
│  │   • Memory management                                  │
│  │                                                         │
│  ├── audio_dsp_wasm_bg.wasm                               │
│  │   • Compiled binary                                    │
│  │   • Your Rust code                                     │
│  │   • ~25KB (optimized)                                  │
│  │                                                         │
│  ├── audio_dsp_wasm.d.ts                                  │
│  │   • TypeScript definitions                             │
│  │   • Type safety for TS users                           │
│  │                                                         │
│  └── package.json                                          │
│      • NPM package metadata                                │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  STEP 4: Import in JavaScript                             │
│                                                            │
│  main.js:                                                 │
│    import init, { AudioProcessor }                        │
│      from './pkg/audio_dsp_wasm.js';                     │
│                                                            │
│    await init();  // Load WASM                            │
│    const processor = new AudioProcessor(44100);           │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  STEP 5: Browser Execution                                │
│                                                            │
│  1. Fetch WASM file                                        │
│  2. Compile WASM → native code                            │
│  3. Initialize WASM instance                               │
│  4. Ready to call Rust functions!                          │
└────────────────────────────────────────────────────────────┘
```

---

## Memory Model

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Heap (managed by V8)                           │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │ DOM Elements  │  │ JS Objects    │  │ Event Listeners│ │
│  └───────────────┘  └───────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             ↕
              (Function calls, data passing)
                             ↕
┌─────────────────────────────────────────────────────────────┐
│  WASM Linear Memory (managed by Rust)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │  STACK (function calls, local variables)         │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │     │
│  │  │ Frame 1  │ │ Frame 2  │ │ Frame 3  │         │     │
│  │  └──────────┘ └──────────┘ └──────────┘         │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │  HEAP (allocated data)                            │     │
│  │                                                    │     │
│  │  ┌────────────────────────────────────┐          │     │
│  │  │  AudioProcessor {                  │          │     │
│  │  │    sample_rate: 44100              │          │     │
│  │  │    lpf_x1: 0.0                     │          │     │
│  │  │    lpf_x2: 0.0                     │          │     │
│  │  │    ...                              │          │     │
│  │  │    delay_buffer: [ptr: 0x1000]  ───┼─┐       │     │
│  │  │  }                                  │ │       │     │
│  │  └────────────────────────────────────┘ │       │     │
│  │                                          ↓       │     │
│  │  ┌──────────────────────────────────────────┐  │     │
│  │  │  Delay Buffer (44100 floats)             │  │     │
│  │  │  [0x1000]: [0.0, 0.0, 0.0, ..., 0.0]    │  │     │
│  │  │  Size: 176KB (44100 * 4 bytes)           │  │     │
│  │  └──────────────────────────────────────────┘  │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

Key Points:
• WASM memory is separate from JS memory
• Data passed by copy (primitives) or reference (arrays)
• Rust manages WASM memory (automatic cleanup)
• No garbage collection pauses in WASM!
```

---

## Performance Comparison

```
Task: Process 10 million random numbers

┌─────────────────────────────────────────────────────┐
│  JavaScript:                                        │
│  ████████████████████████████████████████ 250ms    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Rust/WASM:                                         │
│  ████ 25ms                                          │
└─────────────────────────────────────────────────────┘

10x faster! 

Why?
• WASM is compiled ahead of time
• Better optimization by LLVM compiler
• No type checking at runtime
• No garbage collection overhead
• SIMD instructions (on supported hardware)
```

---

This architecture enables:
- **Real-time audio processing** (low latency)
- **Fast simulations** (10x+ faster than pure JS)
- **Memory safety** (no segfaults, no memory leaks)
- **Portable** (runs in any modern browser)
- **Maintainable** (clear separation of concerns)

