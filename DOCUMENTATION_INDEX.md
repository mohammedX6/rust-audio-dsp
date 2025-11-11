# 📚 Documentation Index

Welcome! Here's your complete guide to understanding the Rust + WASM audio DSP project.

## 📖 Documentation Files

### 1. **RUST_GUIDE.md** - Complete Rust & WASM Tutorial
   - **What to read:** The full stack explanation, Rust syntax, how everything connects
   - **Who it's for:** Anyone learning Rust, WASM, or audio DSP
   - **Topics covered:**
     - Technology stack breakdown
     - How Rust connects to JavaScript
     - Reading Rust code step by step
     - Complete syntax cheat sheet
     - WASM-specific concepts
     - Memory management
     - Type mappings

### 2. **ARCHITECTURE.md** - Visual Diagrams & Data Flow
   - **What to read:** Visual representation of how data flows through the system
   - **Who it's for:** Visual learners, system architects
   - **Topics covered:**
     - Three-layer architecture diagram
     - Complete data flow (microphone → WASM → speakers)
     - Audio processing pipeline in detail
     - Monte Carlo simulation flow
     - Wave simulation flow
     - Build process step by step
     - Memory model diagram
     - Performance comparisons

### 3. **QUICK_REFERENCE.md** - Cheat Sheet
   - **What to read:** Quick lookup for commands and syntax
   - **Who it's for:** Everyone (keep it handy!)
   - **Topics covered:**
     - Common commands
     - File structure
     - Key Rust syntax patterns
     - Rust ↔ JavaScript mappings
     - Debugging tips
     - Troubleshooting guide

### 4. **README.md** - Project Overview
   - **What to read:** Project description, features, how to build and run
   - **Who it's for:** First-time users, GitHub visitors
   - **Topics covered:**
     - Feature list
     - Installation instructions
     - Usage guide
     - Technology stack
     - Performance benefits

## 🎯 Where to Start?

### **If you're new to Rust:**
1. Start with **QUICK_REFERENCE.md** (syntax basics)
2. Read **RUST_GUIDE.md** sections 1-4
3. Study **ARCHITECTURE.md** (see the big picture)
4. Open `src/lib.rs` and follow along with the guide

### **If you know Rust but new to WASM:**
1. Read **RUST_GUIDE.md** section 5 (WASM-specific)
2. Check **ARCHITECTURE.md** (build process)
3. Look at the generated `pkg/` files after building

### **If you want to understand the algorithms:**
1. Read **ARCHITECTURE.md** (audio processing details)
2. Study the biquad filter section in **RUST_GUIDE.md**
3. Read the commented code in `src/lib.rs`

### **If you just want to get it running:**
1. Read **QUICK_REFERENCE.md** (commands section)
2. Follow the build steps
3. Open browser to localhost:8000

## 🗺️ Code Tour

### **Start here: `src/lib.rs`**

```
Lines 1-5:    Imports
Lines 7-22:   AudioProcessor struct definition
Lines 24-142: AudioProcessor implementation
  - new() constructor
  - process() main DSP loop
  - calculate_lowpass_coeffs()
  - calculate_highpass_coeffs()
  - apply_biquad_filter()
  - reset()
Lines 147-163: monte_carlo_pi() function
Lines 168-245: WaveSimulation struct & implementation
```

### **Then: `main.js`**

```
Lines 1-11:   Imports
Lines 13-23:  Global state
Lines 28-74:  Audio controls setup
Lines 77-158: Audio start/stop functions
Lines 161-204: Monte Carlo simulation
Lines 207-270: Wave simulation setup
Lines 273-340: Wave simulation controls
Lines 343-418: Drawing functions
Lines 421:     App initialization
```

### **UI: `index.html`**

```
Lines 1-9:    HTML head, meta tags
Lines 11-15:  Header section
Lines 17-103: Audio processor panel
Lines 105-132: Monte Carlo panel
Lines 134-156: Wave simulation panel
Lines 158-163: Footer
Lines 165-167: Script loading
```

## 🎓 Learning Resources

### **Rust**
- [The Rust Book](https://doc.rust-lang.org/book/) - Official guide
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) - Learn by doing

### **WebAssembly**
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/) - Rust ↔ JS bridge
- [wasm-pack Book](https://rustwasm.github.io/wasm-pack/) - Build tool

### **Audio DSP**
- [Circles, Sines and Signals](https://jackschaedler.github.io/circles-sines-signals/) - Visual DSP
- [Web Audio API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### **Our Code Comments**
The best resource is the code itself! Every function has detailed comments explaining:
- What it does
- Why it's needed
- How the algorithm works
- References to state variables

## 🔍 Key Concepts to Understand

### **1. The Stack** (See RUST_GUIDE.md)
```
HTML/CSS (UI) → JavaScript (Glue) → WASM (Computation) → Rust (Source)
```

### **2. Ownership** (See RUST_GUIDE.md)
- Each value has one owner
- Values are dropped when owner goes out of scope
- Borrowing allows temporary access

### **3. Real-Time Audio** (See ARCHITECTURE.md)
- Callback runs ~100 times/second
- Must process 4096 samples per callback
- No allocations in hot path (real-time safe)

### **4. Zero-Copy** (See RUST_GUIDE.md)
- Pass references (`&mut [f32]`) instead of copying
- WASM and JS share memory
- Direct buffer modification

### **5. State Management** (See src/lib.rs)
- Filter state (x1, x2, y1, y2) persists between calls
- Circular buffer write position tracks location
- Each instance has independent state

## 💡 Common Questions

**Q: Why use Rust instead of JavaScript?**
A: 10x+ faster execution, memory safety, no GC pauses

**Q: How does JavaScript call Rust?**
A: Through wasm-bindgen generated bindings in `pkg/`

**Q: Can I use this in production?**
A: Yes! WASM is supported in all modern browsers

**Q: How big is the WASM file?**
A: ~25KB optimized (smaller than most images!)

**Q: Is it secure?**
A: Yes, WASM runs in a sandbox like JavaScript

**Q: Can I debug Rust in the browser?**
A: Yes, with source maps (add to Cargo.toml)

## 🛠️ Modification Guide

### **Change audio effect parameters:**
Edit `src/lib.rs`, rebuild with `wasm-pack build --target web`

### **Add new UI controls:**
Edit `index.html` (add slider), `main.js` (handle events), `src/lib.rs` (add parameter)

### **Add new DSP effect:**
1. Add state variables to `AudioProcessor` struct
2. Add processing code in `process()` method
3. Add parameters to `process()` function signature
4. Update JavaScript to pass new parameters
5. Rebuild and test

### **Improve visualization:**
Edit `main.js` `drawWave()` function and `style.css`

## 📊 Project Stats

- **Lines of Rust:** ~345
- **Lines of JavaScript:** ~437
- **Lines of HTML:** ~168
- **Lines of CSS:** ~402
- **WASM size:** ~25KB (optimized)
- **Compilation time:** ~1-2 seconds
- **Total documentation:** ~2000+ lines!

## 🎯 Challenge Yourself

1. **Easy:** Change the default wave speed
2. **Medium:** Add a new slider for reverb time
3. **Hard:** Implement a reverb effect in Rust
4. **Expert:** Add FFT visualization of audio spectrum

## 📞 Getting Help

1. Read the relevant documentation file
2. Check the commented code in `src/lib.rs`
3. Look at browser console (F12) for errors
4. Read Rust compiler error messages (they're helpful!)
5. Search [The Rust Book](https://doc.rust-lang.org/book/)

---

**Happy learning! 🦀⚡🎵**

Remember: The best way to learn is by doing. Don't be afraid to modify the code and see what happens!
