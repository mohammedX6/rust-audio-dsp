# Rust + WASM Cheat Sheet & Implementation Guide

## 📚 Table of Contents
1. [The Stack - What Technologies Are We Using?](#the-stack)
2. [How Everything Connects](#how-everything-connects)
3. [Reading the Rust Code](#reading-the-rust-code)
4. [Rust Syntax Cheat Sheet](#rust-syntax-cheat-sheet)
5. [WASM-Specific Concepts](#wasm-specific-concepts)

---

## 🏗️ The Stack - What Technologies Are We Using?

### **Frontend Layer (What Users See)**
```
┌─────────────────────────────────────┐
│         HTML + CSS                  │  ← User Interface
│  (index.html + style.css)           │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│         JavaScript                  │  ← Glue Code
│  (main.js)                          │  • Web Audio API
│                                     │  • Canvas rendering
│                                     │  • Event handling
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│    WASM (WebAssembly)              │  ← Compiled Binary
│  (pkg/audio_dsp_wasm_bg.wasm)      │  • Fast execution
│                                     │  • Near-native speed
└─────────────────────────────────────┘
                ↑
┌─────────────────────────────────────┐
│         Rust Code                   │  ← Source Code
│  (src/lib.rs)                       │  • DSP algorithms
│                                     │  • Simulations
└─────────────────────────────────────┘
```

### **Technology Breakdown**

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **Rust** | Systems programming language | Memory safe, fast, compiles to WASM |
| **WebAssembly (WASM)** | Binary instruction format | Near-native performance in browser |
| **wasm-bindgen** | Rust ↔ JavaScript bridge | Allows Rust to call JS and vice versa |
| **wasm-pack** | Build tool | Compiles Rust to WASM with JS bindings |
| **JavaScript** | Browser scripting | UI interaction, Web APIs |
| **Web Audio API** | Audio processing | Microphone input, audio output |
| **Canvas API** | Graphics rendering | Wave visualization |
| **HTML/CSS** | Structure & styling | User interface |

---

## 🔗 How Everything Connects

### **1. Build Process Flow**

```bash
# Step 1: Write Rust code
src/lib.rs (Rust source code)
    ↓
# Step 2: Compile with wasm-pack
wasm-pack build --target web
    ↓
# Step 3: Generate WASM + JS bindings
pkg/
  ├── audio_dsp_wasm.js          ← JS wrapper (auto-generated)
  ├── audio_dsp_wasm_bg.wasm     ← Compiled binary
  └── audio_dsp_wasm.d.ts        ← TypeScript definitions
    ↓
# Step 4: Load in browser
main.js imports from pkg/
    ↓
# Step 5: HTML loads main.js
index.html runs the app
```

### **2. Runtime Flow - Audio Processing**

```
User clicks "Start Microphone"
    ↓
JavaScript: Request microphone access (Web Audio API)
    ↓
JavaScript: Create AudioContext and nodes
    ↓
Rust: Create AudioProcessor instance
    ↓
┌─────────────────────────────────────────────┐
│  REAL-TIME AUDIO LOOP (runs 100s/second)   │
│                                             │
│  Microphone → JavaScript (inputBuffer)     │
│        ↓                                    │
│  Rust WASM: process() function             │
│    • Apply filters                          │
│    • Apply distortion                       │
│    • Apply delay/echo                       │
│        ↓                                    │
│  JavaScript (outputBuffer) → Speakers      │
└─────────────────────────────────────────────┘
```

### **3. Data Flow Diagram**

```
┌──────────────┐
│   HTML       │  User clicks button
│   Button     │────────────────┐
└──────────────┘                │
                                ↓
                    ┌───────────────────────┐
                    │   JavaScript          │
                    │   Event Handler       │
                    └───────────────────────┘
                                │
                                ↓
                    ┌───────────────────────┐
                    │   WASM Module         │
                    │   Rust Function       │
                    │   (exposed via        │
                    │    #[wasm_bindgen])   │
                    └───────────────────────┘
                                │
                                ↓
                    ┌───────────────────────┐
                    │   Return Value        │
                    └───────────────────────┘
                                │
                                ↓
                    ┌───────────────────────┐
                    │   JavaScript          │
                    │   Updates UI          │
                    └───────────────────────┘
```

---

## 📖 Reading the Rust Code

### **File Structure: `src/lib.rs`**

```rust
// 1. IMPORTS - Bring in functionality
use wasm_bindgen::prelude::*;

// 2. DATA STRUCTURES - Define our types
#[wasm_bindgen]
pub struct AudioProcessor {
    // Fields (data)
}

// 3. IMPLEMENTATIONS - Define behavior
#[wasm_bindgen]
impl AudioProcessor {
    // Methods (functions)
}

// 4. STANDALONE FUNCTIONS
#[wasm_bindgen]
pub fn monte_carlo_pi(iterations: u32) -> f64 {
    // Function body
}
```

### **Key Rust Concepts in Our Code**

#### **1. Structs (Data Structures)**

```rust
// Struct = collection of related data
#[wasm_bindgen]  // ← Makes this available to JavaScript
pub struct AudioProcessor {  // ← "pub" = public (visible to JS)
    sample_rate: f32,  // ← Field: 32-bit float
    lpf_x1: f32,       // ← Field: previous sample
    delay_buffer: Vec<f32>,  // ← Field: dynamic array
}
```

**What it means:**
- `struct` = a custom data type (like a class in other languages)
- `pub` = public (accessible from JavaScript)
- `f32` = 32-bit floating point number (like "float" in C)
- `Vec<f32>` = growable array of f32 values

#### **2. Impl Blocks (Methods)**

```rust
#[wasm_bindgen]
impl AudioProcessor {
    // Constructor - creates new instance
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> AudioProcessor {
        AudioProcessor {
            sample_rate,  // Set field
            lpf_x1: 0.0,  // Initialize to 0
            // ... more fields
        }
    }
    
    // Method - operates on instance
    pub fn process(&mut self, buffer: &mut [f32]) {
        // &mut self = mutable reference to this instance
        // &mut [f32] = mutable slice (array view)
    }
}
```

**What it means:**
- `impl` = implementation block (adds methods to a struct)
- `new()` = constructor (creates instances)
- `&mut self` = mutable reference to the current instance
- `&mut [f32]` = mutable reference to an array slice

#### **3. Ownership & Borrowing (Core Rust Concept)**

```rust
// OWNERSHIP
let x = vec![1.0, 2.0, 3.0];  // x owns the vector
let y = x;  // Ownership moved to y (x is now invalid!)

// BORROWING (References)
let x = vec![1.0, 2.0, 3.0];
let y = &x;  // y borrows x (x still valid)

// MUTABLE BORROWING
let mut x = vec![1.0, 2.0, 3.0];
let y = &mut x;  // y can modify x
y[0] = 5.0;  // Changes x
```

**Rules:**
1. Each value has ONE owner
2. When owner goes out of scope, value is dropped (freed)
3. You can have EITHER:
   - Multiple immutable references (`&x`)
   - ONE mutable reference (`&mut x`)

#### **4. Functions**

```rust
// Function signature breakdown
pub fn calculate_lowpass_coeffs(
    &self,              // Borrows self (can read fields)
    cutoff: f32         // Parameter: takes f32
) -> [f32; 5] {        // Returns: fixed array of 5 f32s
    // Function body
    [b0, b1, b2, a1, a2]  // Last expression = return value
}
```

**What it means:**
- `pub fn` = public function
- `&self` = immutable reference to struct instance
- `-> [f32; 5]` = returns array of 5 floats
- No semicolon on last line = that value is returned

---

## 🎯 Rust Syntax Cheat Sheet

### **Variables**

```rust
let x = 5;              // Immutable variable (cannot change)
let mut y = 10;         // Mutable variable (can change)
y = 15;                 // OK because mut

const PI: f32 = 3.14;   // Constant (compile-time)
```

### **Data Types**

```rust
// Integers
let a: i32 = -42;       // 32-bit signed integer
let b: u32 = 42;        // 32-bit unsigned integer
let c: usize = 100;     // Architecture-dependent (pointer size)

// Floats
let x: f32 = 3.14;      // 32-bit float
let y: f64 = 3.14159;   // 64-bit float (default)

// Boolean
let flag: bool = true;

// Arrays (fixed size)
let arr: [f32; 5] = [1.0, 2.0, 3.0, 4.0, 5.0];

// Vectors (dynamic size)
let vec: Vec<f32> = vec![1.0, 2.0, 3.0];

// Slices (view into array/vector)
let slice: &[f32] = &arr[1..3];  // Elements 1 and 2
```

### **Control Flow**

```rust
// If/else
if x > 0 {
    println!("Positive");
} else if x < 0 {
    println!("Negative");
} else {
    println!("Zero");
}

// For loop
for i in 0..10 {        // 0 to 9 (exclusive end)
    println!("{}", i);
}

for item in vec.iter() { // Iterator over collection
    println!("{}", item);
}

// While loop
while x < 10 {
    x += 1;
}

// Loop (infinite, use break to exit)
loop {
    if condition {
        break;
    }
}
```

### **References & Pointers**

```rust
let x = 5;
let r = &x;             // Immutable reference
println!("{}", *r);     // Dereference with *

let mut y = 10;
let mr = &mut y;        // Mutable reference
*mr = 15;               // Modify through reference

// Pointer (for WASM FFI)
let ptr: *const f32 = arr.as_ptr();  // Raw pointer (unsafe)
```

### **Pattern Matching**

```rust
let x = 5;
match x {
    1 => println!("One"),
    2 | 3 => println!("Two or three"),
    4..=10 => println!("Four through ten"),
    _ => println!("Something else"),
}

// Destructuring
let [b0, b1, b2, a1, a2] = coeffs;  // Unpack array
```

### **Common Methods**

```rust
// Vec methods
vec.push(1.0);          // Add to end
vec.len();              // Length
vec.clear();            // Remove all
vec.as_ptr();           // Get raw pointer

// Math functions
x.abs();                // Absolute value
x.sqrt();               // Square root
x.sin();                // Sine
x.cos();                // Cosine
x.tanh();               // Hyperbolic tangent
x.max(y);               // Maximum
x.min(y);               // Minimum

// Conversions
x as f64;               // Cast to f64
x.floor();              // Round down
x.ceil();               // Round up
```

---

## 🌐 WASM-Specific Concepts

### **1. The `#[wasm_bindgen]` Attribute**

```rust
// Makes Rust visible to JavaScript
#[wasm_bindgen]
pub struct MyStruct { }

#[wasm_bindgen]
pub fn my_function() { }
```

**What it does:**
- Generates JavaScript bindings automatically
- Handles type conversions between Rust and JS
- Creates wrapper functions in the `.js` file

### **2. Type Mappings (Rust ↔ JavaScript)**

| Rust Type | JavaScript Type | Notes |
|-----------|----------------|-------|
| `bool` | `boolean` | Direct mapping |
| `i32, u32` | `number` | 32-bit integers |
| `f32, f64` | `number` | Floating point |
| `String` | `string` | UTF-8 text |
| `Vec<T>` | `Array` | When returned |
| `&[T]` | View into memory | Slice reference |
| `&mut [T]` | View into memory | Mutable slice |
| `*const T` | `number` | Raw pointer (address) |

### **3. Memory Layout**

```
JavaScript Side                 WASM Linear Memory
┌──────────────┐               ┌────────────────────┐
│              │               │  Stack             │
│  Variables   │               ├────────────────────┤
│              │               │  Heap              │
└──────────────┘               │  ┌──────────────┐ │
       ↓                       │  │ delay_buffer │ │
   Call WASM                   │  └──────────────┘ │
       ↓                       │  ┌──────────────┐ │
┌──────────────┐               │  │ AudioProc    │ │
│ WASM Module  │←──────────────┤  └──────────────┘ │
│ Functions    │               └────────────────────┘
└──────────────┘                        ↑
       ↓                                │
   Return value              Direct memory access
       ↓                      (for array slices)
┌──────────────┐
│   Result     │
└──────────────┘
```

### **4. Calling Rust from JavaScript**

```javascript
// In main.js

// Import the WASM module
import init, { 
    AudioProcessor,      // Class
    monte_carlo_pi,      // Function
    WaveSimulation       // Class
} from './pkg/audio_dsp_wasm.js';

// Initialize WASM
await init();

// Create instance (calls Rust constructor)
const processor = new AudioProcessor(44100);

// Call method (calls Rust method)
processor.process(
    buffer,           // JavaScript Float32Array
    1.0,              // Passed to Rust as f32
    20000,            // Passed as f32
    // ... more parameters
);

// Call standalone function
const pi = monte_carlo_pi(10000000);  // Returns f64 as JS number
```

### **5. Performance Considerations**

```rust
// FAST: Passing references (no copy)
pub fn process(&mut self, buffer: &mut [f32]) {
    // Modifies buffer in place
    // Zero-copy operation!
}

// SLOWER: Returning new data (copies)
pub fn get_data(&self) -> Vec<f32> {
    self.current.clone()  // Copies data
    // But safer and easier to use
}

// FASTEST: Raw pointers (but unsafe in JS)
pub fn get_data_ptr(&self) -> *const f32 {
    self.current.as_ptr()  // Just returns address
    // Requires manual memory management in JS
}
```

---

## 🎓 How to Read Our Implementation

### **Audio DSP Algorithm Example**

Let's break down the biquad filter implementation:

```rust
// 1. Calculate filter coefficients (math setup)
fn calculate_lowpass_coeffs(&self, cutoff: f32) -> [f32; 5] {
    // Constrain input to valid range
    let cutoff = cutoff.max(20.0).min(self.sample_rate * 0.45);
    
    // DSP math (standard formulas)
    let q = 0.707;  // Quality factor
    let w0 = 2.0 * std::f32::consts::PI * cutoff / self.sample_rate;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();
    let alpha = sin_w0 / (2.0 * q);
    
    // Return array of 5 coefficients
    [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
}

// 2. Apply filter to each sample (per-sample processing)
fn apply_biquad_filter(
    input: f32,           // Current sample
    coeffs: &[f32; 5],    // Filter coefficients
    x1: &mut f32,         // Previous input 1 (state)
    x2: &mut f32,         // Previous input 2 (state)
    y1: &mut f32,         // Previous output 1 (state)
    y2: &mut f32,         // Previous output 2 (state)
) -> f32 {
    // Unpack coefficients
    let [b0, b1, b2, a1, a2] = *coeffs;
    
    // Apply difference equation
    let output = b0 * input + b1 * *x1 + b2 * *x2 - a1 * *y1 - a2 * *y2;
    
    // Update state (shift delay line)
    *x2 = *x1;      // x[n-2] = x[n-1]
    *x1 = input;    // x[n-1] = x[n]
    *y2 = *y1;      // y[n-2] = y[n-1]
    *y1 = output;   // y[n-1] = y[n]
    
    output  // Return filtered sample
}

// 3. Process entire buffer (main loop)
pub fn process(&mut self, buffer: &mut [f32], /* ... params */) {
    // Calculate coefficients once per buffer
    let lpf_coeffs = self.calculate_lowpass_coeffs(lpf_cutoff);
    
    // Process each sample
    for sample in buffer.iter_mut() {
        let mut x = *sample;
        
        // Apply effects in order
        x = Self::apply_biquad_filter(
            x, 
            &lpf_coeffs,
            &mut self.lpf_x1,  // Pass state variables
            &mut self.lpf_x2,
            &mut self.lpf_y1,
            &mut self.lpf_y2,
        );
        
        // Write back to buffer
        *sample = x;
    }
}
```

**Key Points:**
1. **State variables** (`lpf_x1`, `lpf_y1`, etc.) persist between calls
2. **Mutable references** (`&mut`) allow in-place modification
3. **No allocations** in the hot path (real-time safe)
4. **Iterator** (`buffer.iter_mut()`) is efficient and safe

---

## 🚀 Quick Reference

### **Common Patterns in Our Code**

```rust
// Pattern 1: Initialize struct
AudioProcessor {
    sample_rate,           // Shorthand (same as sample_rate: sample_rate)
    lpf_x1: 0.0,          // Explicit initialization
    delay_buffer: vec![0.0; size],  // Create vector of size with all 0.0
}

// Pattern 2: Iterate and modify
for sample in buffer.iter_mut() {
    *sample = *sample * gain;  // Dereference to read/write
}

// Pattern 3: Constrain values
let x = value.max(min_val).min(max_val);  // Clamp to range

// Pattern 4: Circular buffer
let pos = (pos + 1) % buffer.len();  // Wrap around

// Pattern 5: Conditional compilation
#[cfg(test)]  // Only compiled for tests
mod tests { }
```

### **Debugging Tips**

```rust
// Print to console (use for debugging)
use web_sys::console;
console::log_1(&"Debug message".into());

// Assert conditions (panics if false)
assert!(x > 0.0);
debug_assert!(x > 0.0);  // Only in debug builds
```

---

## 📚 Next Steps

1. **Experiment**: Modify parameters in the Rust code
2. **Add features**: Try implementing new DSP effects
3. **Learn more Rust**: [The Rust Book](https://doc.rust-lang.org/book/)
4. **WASM deep dive**: [wasm-bindgen guide](https://rustwasm.github.io/wasm-bindgen/)

---

**Remember:** 
- Rust is about **safety** (compiler catches bugs)
- WASM is about **speed** (near-native performance)
- Together they make **reliable, fast web apps**!

Happy coding! 🦀⚡

