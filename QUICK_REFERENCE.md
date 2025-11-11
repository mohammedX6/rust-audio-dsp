# Quick Reference Card

## 🚀 Commands

```bash
# Build WASM
wasm-pack build --target web

# Start server
python3 -m http.server 8000

# Open browser
http://localhost:8000
```

## 📁 File Structure

```
rust_wasm/
├── src/lib.rs              ← Rust code (DSP, simulations)
├── index.html              ← UI structure
├── style.css               ← Styling
├── main.js                 ← JS glue code
├── Cargo.toml              ← Rust dependencies
└── pkg/                    ← Generated WASM (after build)
    ├── audio_dsp_wasm.js
    └── audio_dsp_wasm_bg.wasm
```

## 🔑 Key Rust Syntax

```rust
// Variables
let x = 5;              // Immutable
let mut y = 10;         // Mutable

// Functions
fn add(a: i32, b: i32) -> i32 {
    a + b  // Return (no semicolon)
}

// Struct
struct Point {
    x: f32,
    y: f32,
}

// Impl (methods)
impl Point {
    fn new(x: f32, y: f32) -> Point {
        Point { x, y }
    }
}

// References
&x          // Borrow (read)
&mut x      // Borrow mutable (write)
*x          // Dereference

// WASM export
#[wasm_bindgen]
pub fn my_function() { }
```

## 🔗 Rust ↔ JavaScript

### **Calling Rust from JS**

```javascript
// Import
import init, { AudioProcessor } 
  from './pkg/audio_dsp_wasm.js';

// Initialize
await init();

// Create instance
const proc = new AudioProcessor(44100);

// Call method
proc.process(buffer, gain, cutoff);
```

### **Type Mappings**

| Rust | JavaScript |
|------|------------|
| `f32, f64` | `number` |
| `i32, u32` | `number` |
| `bool` | `boolean` |
| `String` | `string` |
| `Vec<T>` | `Array` |
| `&[T]` | View |
| `&mut [T]` | View (mutable) |

## 🎯 Common Patterns

### **Process Array**
```rust
pub fn process(&mut self, buffer: &mut [f32]) {
    for sample in buffer.iter_mut() {
        *sample = *sample * 2.0;
    }
}
```

### **Circular Buffer**
```rust
let pos = (pos + 1) % buffer.len();
```

### **Clamp Value**
```rust
let x = value.max(min).min(max);
```

### **Iterator**
```rust
for i in 0..10 { }           // 0 to 9
for item in vec.iter() { }   // Read
for item in vec.iter_mut() { } // Write
```

## 🐛 Debugging

```rust
// Console log (in Rust)
use web_sys::console;
console::log_1(&"Debug".into());

// Console log (in JS)
console.log("Debug", value);

// Browser DevTools: F12
// Check Console tab for errors
```

## 📊 Our Components

### **AudioProcessor**
- Filters (low-pass, high-pass)
- Distortion (soft clipping)
- Delay/Echo (circular buffer)

### **WaveSimulation**
- Wave equation solver
- Finite difference method
- Interactive impulses

### **monte_carlo_pi()**
- Random sampling
- π estimation
- Performance benchmark

## ⚡ Performance Tips

1. **Pass by reference** (`&[T]`) = zero-copy
2. **Return Vec** = copies data (but safer)
3. **Use iterators** = compiler optimizes
4. **Avoid allocations** in hot loops
5. **State in struct fields** = persistent

## 🎓 Learning Path

1. ✅ Understand the stack
2. ✅ Read `RUST_GUIDE.md`
3. ✅ Study `src/lib.rs` line by line
4. 📝 Modify parameters (e.g., filter cutoff)
5. 🔨 Add new effect (e.g., reverb)
6. 📚 Read [The Rust Book](https://doc.rust-lang.org/book/)

## 🎵 Audio DSP Concepts

### **Biquad Filter**
```
y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2]
       - a1*y[n-1] - a2*y[n-2]
```
- Second-order IIR filter
- Used for EQ, low-pass, high-pass
- Requires state variables

### **Circular Buffer**
```
[0] [1] [2] [3] [4]
     ↑           ↑
   read        write
```
- For delay/echo effects
- Wraps around: `pos = (pos + 1) % size`
- Constant memory usage

### **Sample Rate**
- 44100 Hz = 44,100 samples/second
- 1 second delay = 44,100 samples buffer
- Buffer size 4096 = ~93ms @ 44.1kHz

## 🌊 Physics Simulation

### **Wave Equation**
```
d²u/dt² = c² * d²u/dx²
```
- Models wave propagation
- c = wave speed
- Finite difference method for solving

### **Finite Difference**
```
u(t+dt) = 2*u(t) - u(t-dt) 
          + c²*(u(x+dx) - 2*u(x) + u(x-dx))
```
- Discrete approximation
- Stable when c < 0.5
- Needs previous and current state

## 💡 Tips

- **Rust errors are helpful** - read them!
- **Compiler is strict** - for your safety
- **WASM is sandboxed** - secure by default
- **Zero-cost abstractions** - high-level = fast
- **Immutable by default** - explicit `mut` needed

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `cargo: command not found` | Install Rust: `brew install rust` |
| `wasm32 target not found` | `rustup target add wasm32-unknown-unknown` |
| WASM not loading | Check browser console (F12) |
| Audio not working | Check mic permissions |
| Wave not drawing | Refresh browser after rebuild |

## 📝 Next Steps

1. Modify `src/lib.rs` (change algorithms)
2. Run `wasm-pack build --target web`
3. Refresh browser (Cmd+R or Ctrl+R)
4. Test your changes!

---

**Remember:** The browser caches files, so:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
- Or open DevTools and check "Disable cache"

