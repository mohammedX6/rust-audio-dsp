# DSP Technical Guide

## Overview

This document explains how Digital Signal Processing (DSP) works in this audio application.
DSP transforms audio signals in real-time by applying mathematical operations to each sample.

## What is DSP?

Digital Signal Processing is the manipulation of audio data using mathematical algorithms.
Audio is converted from analog waves into digital samples.
Each sample represents the sound wave amplitude at a specific moment in time.

## Audio Signal Flow

The audio travels through these stages:

1. **Input:** Microphone captures sound waves
2. **Conversion:** Browser converts analog to digital samples
3. **Processing:** Rust/WASM applies effects to each sample
4. **Output:** Processed audio plays through speakers

## Sample Basics

### Sample Rate
- This application uses 48,000 samples per second (48 kHz)
- Each sample represents 1/48000th of a second
- Higher sample rates capture more detail

### Buffer Size
- Audio is processed in chunks of 4096 samples
- This equals about 85 milliseconds of audio
- Larger buffers are more efficient but add latency

### Bit Depth
- Uses 32-bit floating point numbers
- Each sample ranges from -1.0 to +1.0
- Provides maximum precision and dynamic range

## DSP Effects

### 1. Gain Control

Gain multiplies each sample by a volume factor.

**How it works:**
```
output_sample = input_sample * gain_factor
```

**Example:**
- Input sample: 0.5
- Gain: 2.0
- Output sample: 1.0 (louder)

### 2. Distortion

Distortion adds harmonic overtones using a hyperbolic tangent function.
This creates warmth and saturation like analog equipment.

**How it works:**
```
1. Multiply sample by drive amount (amplify)
2. Apply tanh() function (soft clipping)
3. Normalize by dividing by tanh(drive)
```

**Why tanh?**
- Smoothly compresses loud signals
- Preserves quiet signals
- Creates natural-sounding harmonics

### 3. Biquad Filters

Biquad filters are second-order IIR (Infinite Impulse Response) filters.
They use past inputs and outputs to shape frequency response.

**Filter Equation:**
```
output = b0*input + b1*x1 + b2*x2 - a1*y1 - a2*y2
```

**Variables:**
- `b0, b1, b2`: Feed-forward coefficients
- `a1, a2`: Feedback coefficients
- `x1, x2`: Previous input samples
- `y1, y2`: Previous output samples

#### Low-Pass Filter (LPF)

Allows low frequencies to pass through.
Reduces high frequencies above the cutoff.

**Use cases:**
- Remove hiss and noise
- Create muffled effect
- Simulate distance

#### High-Pass Filter (HPF)

Allows high frequencies to pass through.
Reduces low frequencies below the cutoff.

**Use cases:**
- Remove rumble and bass
- Create thin, tinny sound
- Simulate telephone or radio

### 4. Delay Effect

Delay stores past audio samples in a circular buffer.
It plays them back after a specified time with optional feedback.

**How it works:**
```
1. Write current sample to delay buffer
2. Read sample from buffer at delay_time ago
3. Mix delayed signal with current signal
4. Add feedback (delayed signal feeds back into buffer)
```

**Circular Buffer:**
- Fixed-size array (1 second capacity)
- Write position wraps around when it reaches the end
- Read position is behind write position by delay_time

**Parameters:**
- **Delay Time:** How long to wait before playback (in seconds)
- **Feedback:** How much delayed signal feeds back (creates repeating echoes)
- **Mix:** Balance between original and delayed signal

## Filter Coefficient Calculation

Filters use the Audio EQ Cookbook formulas.
These convert frequency and Q factor into biquad coefficients.

### Steps:

1. **Calculate omega (w0):**
   ```
   w0 = 2 * PI * cutoff_frequency / sample_rate
   ```

2. **Calculate sine and cosine:**
   ```
   cos_w0 = cos(w0)
   sin_w0 = sin(w0)
   ```

3. **Calculate alpha (bandwidth parameter):**
   ```
   alpha = sin_w0 / (2 * Q)
   ```
   Q = 0.707 provides a flat Butterworth response

4. **Calculate coefficients (depends on filter type)**

5. **Normalize by dividing by a0**

## Processing Pipeline

Each buffer of 4096 samples goes through this sequence:

```
For each sample in buffer:
    1. Apply gain
    2. Apply distortion (if enabled)
    3. Apply low-pass filter
    4. Apply high-pass filter
    5. Apply delay effect (if enabled)
    6. Clamp output to valid range (-0.95 to +0.95)
```

## Performance Optimization

### Why Rust?

Rust provides:
- Zero-cost abstractions
- No garbage collection pauses
- Predictable performance
- Memory safety without runtime overhead

### Optimizations Used:

1. **In-place processing:** Modifies buffer directly (no copying)
2. **Pre-calculated coefficients:** Filter coefficients computed once per buffer
3. **Minimal branching:** Reduces CPU pipeline stalls
4. **Stack allocation:** All state variables on stack (fast access)
5. **SIMD potential:** Rust compiler can auto-vectorize loops

## State Variables

The processor maintains state between buffer calls:

### Filter State:
- `x1, x2`: Last 2 input samples
- `y1, y2`: Last 2 output samples

These are needed because biquad filters depend on previous values.

### Delay State:
- `delay_buffer`: Circular buffer storing past samples
- `delay_write_pos`: Current write position in buffer

## Stability and Safety

### Preventing Instability:

1. **Clamping:** Output limited to [-0.95, +0.95]
2. **Coefficient limits:** Cutoff frequencies bounded to valid range
3. **Feedback limiting:** Delay feedback capped at 0.6 (60%)
4. **Numeric stability:** Uses f32 for good precision/performance balance

### Why -0.95 instead of -1.0?

Leaves headroom to prevent clipping in the audio chain.
Digital clipping sounds harsh and distorted.

## Memory Usage

**Total memory per processor instance:**
- State variables: ~80 bytes
- Delay buffer: 48,000 samples * 4 bytes = 192 KB
- Total: ~192 KB

This is efficient for real-time processing.

## Latency

**Total system latency:**
- Buffer processing time: ~0.5 ms (with Rust optimization)
- Buffer duration: ~85 ms (inherent to buffer size)
- Browser audio latency: ~10-50 ms (varies by browser)

The DSP processing itself adds negligible latency.

## Mathematical Foundations

### Frequency Domain

Filters work in the frequency domain.
Each frequency component is amplified or attenuated.

**Frequency Response:**
- Low-pass filter: Attenuates high frequencies
- High-pass filter: Attenuates low frequencies
- Cutoff frequency: Point where attenuation begins (-3 dB)

### Time Domain

Delay works in the time domain.
It shifts audio samples forward in time.

**Delay formula:**
```
delay_samples = delay_time_seconds * sample_rate
```

Example: 0.5 seconds delay at 48 kHz = 24,000 samples

## Common DSP Concepts

### Aliasing
- Occurs when sampling rate is too low for frequency content
- Nyquist theorem: Sample rate must be 2x highest frequency
- 48 kHz can represent frequencies up to 24 kHz

### Quantization
- Converting continuous values to discrete levels
- Using 32-bit float minimizes quantization error
- More bits = less noise

### IIR vs FIR
- **IIR (Infinite Impulse Response):** Uses feedback, efficient, used here
- **FIR (Finite Impulse Response):** No feedback, always stable, more CPU intensive

## Preset Examples

### Telephone Effect
- High-pass filter: 300 Hz (removes bass)
- Low-pass filter: 3400 Hz (removes treble)
- Slight distortion (simulates line compression)

### Cave Effect
- Moderate delay time: 350 ms
- Medium feedback: 0.4 (multiple echoes)
- Balanced mix: 0.5

## Further Reading

**Digital Signal Processing:**
- "The Scientist and Engineer's Guide to Digital Signal Processing"
- Understanding sample rate and bit depth
- Fourier transforms and frequency analysis

**Audio Filters:**
- Audio EQ Cookbook (Robert Bristow-Johnson)
- Biquad filter implementations
- Z-transform fundamentals

**Web Audio:**
- Web Audio API specification
- ScriptProcessor and AudioWorklet nodes
- Browser audio timing and latency

## Summary

DSP transforms audio by applying mathematical operations to digital samples.
This application uses efficient algorithms in Rust for real-time processing.
Each effect modifies the audio signal in a specific way to create the desired sound.

The combination of Rust's performance and WebAssembly's browser compatibility enables professional-quality audio processing in the browser.

