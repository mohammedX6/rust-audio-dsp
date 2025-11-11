// Main JavaScript for Rust/WASM Audio DSP Application
// Integrates Web Audio API with Rust WASM audio processing

// Initialize WASM module
import init, { AudioProcessor } from './pkg/audio_dsp_wasm.js';

// Global state
let wasmModule = null;
let audioContext = null;
let audioProcessor = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;
let isAudioRunning = false;

// Visualizer state
let analyser = null;
let visualizerCanvas = null;
let visualizerCtx = null;
let visualizerMode = 'waveform';
let animationId = null;
let dataArray = null;
let bufferLength = 0;

// Performance monitoring
let performanceStats = {
    lastTime: performance.now(),
    frameCount: 0,
    fps: 0,
    processingTime: 0,
    audioCallbacks: 0,
    totalDataProcessed: 0  // Total bytes sent to Rust
};

// Audio parameters
let params = {
    gain: 1.0,
    lpfCutoff: 20000,
    hpfCutoff: 20,
    distortion: 0.0,
    delayTime: 0.0,
    delayFeedback: 0.0,
    delayMix: 0.0
};

// Initialize application
async function initApp() {
    try {
        // Load WASM module
        console.log('Loading WASM module...');
        wasmModule = await init();
        console.log('WASM module loaded successfully!');
        
        // Setup event listeners
        setupAudioControls();
        setupPresets();
        setupVisualizer();
        
        console.log('✅ Audio processor ready!');
        
    } catch (error) {
        console.error('Failed to initialize:', error);
        alert('Failed to load WASM module. Please refresh the page.');
    }
}

// Setup audio control event listeners
function setupAudioControls() {
    // Start/Stop buttons
    document.getElementById('startBtn').addEventListener('click', startAudio);
    document.getElementById('stopBtn').addEventListener('click', stopAudio);
    
    // Parameter sliders
    setupSlider('gainSlider', 'gainValue', value => {
        params.gain = value / 100;
        return params.gain.toFixed(2);
    });
    
    setupSlider('lpfSlider', 'lpfValue', value => {
        params.lpfCutoff = value;
        return value + ' Hz';
    });
    
    setupSlider('hpfSlider', 'hpfValue', value => {
        params.hpfCutoff = value;
        return value + ' Hz';
    });
    
    setupSlider('distortionSlider', 'distortionValue', value => {
        params.distortion = value / 100;
        return params.distortion.toFixed(2);
    });
    
    setupSlider('delayTimeSlider', 'delayTimeValue', value => {
        params.delayTime = value / 1000; // Convert ms to seconds
        return value + ' ms';
    });
    
    setupSlider('delayFeedbackSlider', 'delayFeedbackValue', value => {
        params.delayFeedback = value / 100;
        return params.delayFeedback.toFixed(2);
    });
    
    setupSlider('delayMixSlider', 'delayMixValue', value => {
        params.delayMix = value / 100;
        return params.delayMix.toFixed(2);
    });
}

// Helper function to setup a slider with its display
function setupSlider(sliderId, valueId, transform) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);
    
    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const displayValue = transform(value);
        valueDisplay.textContent = displayValue;
    });
}

// Start audio processing
async function startAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        
        console.log(`Audio context created with sample rate: ${sampleRate} Hz`);
        
        // Create Rust audio processor
        audioProcessor = new AudioProcessor(sampleRate);
        
        // Request microphone access with noise suppression
        updateStatus('Requesting microphone access...');
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,      // Enable to reduce feedback
                noiseSuppression: true,      // Enable to remove background noise
                autoGainControl: true,       // Enable to normalize volume
                sampleRate: sampleRate
            } 
        });
        
        // Create audio nodes
        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        
        // Create ScriptProcessorNode for real-time processing
        // Buffer size: 4096 samples (balance between latency and performance)
        const bufferSize = 4096;
        processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        // Display buffer info
        document.getElementById('bufferSize').textContent = bufferSize.toLocaleString() + ' samples';
        const dataSize = (bufferSize * 4 / 1024).toFixed(1); // 4 bytes per f32
        document.getElementById('dataPerCall').textContent = dataSize + ' KB';
        
        // Display sample rate
        document.getElementById('sampleRate').textContent = audioContext.sampleRate.toLocaleString() + ' Hz';
        
        // Audio processing callback - this runs in real-time!
        processorNode.onaudioprocess = (e) => {
            const inputBuffer = e.inputBuffer.getChannelData(0);
            const outputBuffer = e.outputBuffer.getChannelData(0);
            
            // Copy input to output and apply simple noise gate
            const noiseGateThreshold = 0.001; // -60dB
            for (let i = 0; i < inputBuffer.length; i++) {
                // Simple noise gate: cut off very quiet signals
                if (Math.abs(inputBuffer[i]) < noiseGateThreshold) {
                    outputBuffer[i] = 0.0;
                } else {
                    outputBuffer[i] = inputBuffer[i];
                }
            }
            
            // Process audio with Rust/WASM
            // This is where the magic happens - high-performance DSP in Rust!
            const startTime = performance.now();
            
            audioProcessor.process(
                outputBuffer,
                params.gain,
                params.lpfCutoff,
                params.hpfCutoff,
                params.delayTime,
                params.delayFeedback,
                params.delayMix,
                params.distortion
            );
            
            // Track performance
            performanceStats.processingTime = performance.now() - startTime;
            performanceStats.audioCallbacks++;
            
            // Track total data sent to Rust (4096 samples × 4 bytes per sample)
            performanceStats.totalDataProcessed += outputBuffer.length * 4;
        };
        
        // Connect audio graph: Microphone -> Processor -> Speakers
        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);
        
        // Update UI
        isAudioRunning = true;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        updateStatus('🎵 Audio processing active', true);
        
        // Start visualizer
        startVisualizer();
        
        console.log('Audio processing started successfully!');
        
    } catch (error) {
        console.error('Failed to start audio:', error);
        updateStatus('Error: ' + error.message);
        alert('Failed to start audio. Please check microphone permissions.');
    }
}

// Stop audio processing
function stopAudio() {
    try {
        // Disconnect and cleanup audio nodes
        if (processorNode) {
            processorNode.disconnect();
            processorNode = null;
        }
        
        if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
        }
        
        // Stop media stream
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        
        // Close audio context
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        
        // Reset Rust processor
        if (audioProcessor) {
            audioProcessor.reset();
            audioProcessor = null;
        }
        
        // Update UI
        isAudioRunning = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        updateStatus('Audio stopped');
        
        // Stop visualizer
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        console.log('Audio processing stopped');
        
    } catch (error) {
        console.error('Error stopping audio:', error);
    }
}

// Update status display
function updateStatus(message, isActive = false) {
    const statusElement = document.getElementById('audioStatus');
    statusElement.textContent = message;
    
    if (isActive) {
        statusElement.classList.add('active');
    } else {
        statusElement.classList.remove('active');
    }
}

// Professional preset configurations (CLEAN - no feedback noise!)
const presets = {
    clean: {
        gain: 1.0,
        lpfCutoff: 20000,
        hpfCutoff: 20,
        distortion: 0.0,
        delayTime: 0.0,
        delayFeedback: 0.0,
        delayMix: 0.0
    },
    telephone: {
        gain: 1.3,
        lpfCutoff: 3400,
        hpfCutoff: 300,
        distortion: 0.15,
        delayTime: 0.0,
        delayFeedback: 0.0,
        delayMix: 0.0
    },
    radio: {
        gain: 1.4,
        lpfCutoff: 4500,
        hpfCutoff: 250,
        distortion: 0.35,
        delayTime: 0.0,
        delayFeedback: 0.0,
        delayMix: 0.0
    },
    space: {
        gain: 0.85,
        lpfCutoff: 15000,
        hpfCutoff: 20,
        distortion: 0.0,
        delayTime: 0.4,
        delayFeedback: 0.4,  // Reduced from 0.5
        delayMix: 0.3        // Reduced from 0.35
    },
    robot: {
        gain: 1.1,
        lpfCutoff: 6000,
        hpfCutoff: 150,
        distortion: 0.5,
        delayTime: 0.07,
        delayFeedback: 0.2,  // Reduced from 0.25
        delayMix: 0.15       // Reduced from 0.2
    },
    cave: {
        gain: 0.9,
        lpfCutoff: 10000,
        hpfCutoff: 80,
        distortion: 0.0,
        delayTime: 0.28,
        delayFeedback: 0.45, // Reduced from 0.55
        delayMix: 0.35       // Reduced from 0.4
    },
    valley: {
        gain: 0.8,
        lpfCutoff: 12000,    // Slightly filtered for natural sound
        hpfCutoff: 50,       // Remove low rumble
        distortion: 0.0,     // Clean echo
        delayTime: 0.65,     // Long delay like shouting in a valley
        delayFeedback: 0.5,  // Multiple repeats fading away
        delayMix: 0.4        // Clear echo effect
    },
    stadium: {
        gain: 1.2,
        lpfCutoff: 18000,
        hpfCutoff: 100,
        distortion: 0.05,    // Slight presence boost
        delayTime: 0.45,     // Big space feeling
        delayFeedback: 0.35,
        delayMix: 0.3
    },
    alien: {
        gain: 0.95,
        lpfCutoff: 2500,     // Weird narrow bandwidth
        hpfCutoff: 400,
        distortion: 0.25,    // Distorted alien sound
        delayTime: 0.12,     // Fast metallic echo
        delayFeedback: 0.4,
        delayMix: 0.35
    },
    underwater: {
        gain: 0.7,
        lpfCutoff: 800,      // Heavy muffling
        hpfCutoff: 20,
        distortion: 0.0,
        delayTime: 0.55,     // Slow dreamy echo
        delayFeedback: 0.45,
        delayMix: 0.4
    },
    walkietalkie: {
        gain: 1.4,
        lpfCutoff: 2800,     // Narrow radio bandwidth
        hpfCutoff: 400,
        distortion: 0.3,     // Radio distortion
        delayTime: 0.0,
        delayFeedback: 0.0,
        delayMix: 0.0
    },
    concerthall: {
        gain: 0.85,
        lpfCutoff: 16000,
        hpfCutoff: 40,
        distortion: 0.0,
        delayTime: 0.38,     // Natural hall reverb
        delayFeedback: 0.4,
        delayMix: 0.25
    },
    ghost: {
        gain: 0.75,
        lpfCutoff: 5000,     // Eerie filtering
        hpfCutoff: 200,
        distortion: 0.15,
        delayTime: 0.33,     // Spooky echo timing
        delayFeedback: 0.5,
        delayMix: 0.45
    },
    podcast: {
        gain: 1.1,
        lpfCutoff: 12000,    // Warm broadcast sound
        hpfCutoff: 80,       // Remove rumble
        distortion: 0.02,    // Subtle warmth
        delayTime: 0.0,
        delayFeedback: 0.0,
        delayMix: 0.0
    },
    psychedelic: {
        gain: 0.8,
        lpfCutoff: 8000,
        hpfCutoff: 60,
        distortion: 0.2,
        delayTime: 0.48,     // Trippy timing
        delayFeedback: 0.55, // Heavy repeats
        delayMix: 0.5        // Very wet
    }
};

// Setup preset buttons
function setupPresets() {
    const presetButtons = document.querySelectorAll('.btn-preset');
    
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const presetName = button.dataset.preset;
            const preset = presets[presetName];
            
            if (preset) {
                applyPreset(preset);
                console.log(`Applied preset: ${presetName}`);
                
                // Visual feedback
                presetButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            }
        });
    });
}

// Apply preset to sliders
function applyPreset(preset) {
    // Clear delay buffer when switching presets to prevent noise
    if (audioProcessor) {
        audioProcessor.reset();
    }
    
    // Update parameters
    params.gain = preset.gain;
    params.lpfCutoff = preset.lpfCutoff;
    params.hpfCutoff = preset.hpfCutoff;
    params.distortion = preset.distortion;
    params.delayTime = preset.delayTime;
    params.delayFeedback = preset.delayFeedback;
    params.delayMix = preset.delayMix;
    
    // Update sliders
    document.getElementById('gainSlider').value = preset.gain * 100;
    document.getElementById('gainValue').textContent = preset.gain.toFixed(2);
    
    document.getElementById('lpfSlider').value = preset.lpfCutoff;
    document.getElementById('lpfValue').textContent = preset.lpfCutoff + ' Hz';
    
    document.getElementById('hpfSlider').value = preset.hpfCutoff;
    document.getElementById('hpfValue').textContent = preset.hpfCutoff + ' Hz';
    
    document.getElementById('distortionSlider').value = preset.distortion * 100;
    document.getElementById('distortionValue').textContent = preset.distortion.toFixed(2);
    
    document.getElementById('delayTimeSlider').value = preset.delayTime * 1000;
    document.getElementById('delayTimeValue').textContent = Math.round(preset.delayTime * 1000) + ' ms';
    
    document.getElementById('delayFeedbackSlider').value = preset.delayFeedback * 100;
    document.getElementById('delayFeedbackValue').textContent = preset.delayFeedback.toFixed(2);
    
    document.getElementById('delayMixSlider').value = preset.delayMix * 100;
    document.getElementById('delayMixValue').textContent = preset.delayMix.toFixed(2);
}

// Setup visualizer
function setupVisualizer() {
    visualizerCanvas = document.getElementById('visualizer');
    visualizerCtx = visualizerCanvas.getContext('2d');
    
    // Setup viz mode buttons
    document.getElementById('vizWaveform').addEventListener('click', () => {
        setVisualizerMode('waveform');
    });
    document.getElementById('vizSpectrum').addEventListener('click', () => {
        setVisualizerMode('spectrum');
    });
    document.getElementById('vizBars').addEventListener('click', () => {
        setVisualizerMode('bars');
    });
    document.getElementById('vizCircle').addEventListener('click', () => {
        setVisualizerMode('circle');
    });
}

function setVisualizerMode(mode) {
    visualizerMode = mode;
    
    // Update button states
    document.querySelectorAll('.btn-viz').forEach(btn => btn.classList.remove('active'));
    document.getElementById('viz' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
}

function startVisualizer() {
    if (!audioContext || !isAudioRunning) return;
    
    // Create analyser node if needed
    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // Connect: source -> analyser -> processor
        sourceNode.disconnect();
        sourceNode.connect(analyser);
        analyser.connect(processorNode);
    }
    
    // Start animation
    animate();
}

function animate() {
    if (!isAudioRunning) return;
    
    animationId = requestAnimationFrame(animate);
    
    // Get audio data
    if (visualizerMode === 'waveform' || visualizerMode === 'circle') {
        analyser.getByteTimeDomainData(dataArray);
    } else {
        analyser.getByteFrequencyData(dataArray);
    }
    
    // Draw based on mode
    switch (visualizerMode) {
        case 'waveform':
            drawWaveform();
            break;
        case 'spectrum':
            drawSpectrum();
            break;
        case 'bars':
            drawBars();
            break;
        case 'circle':
            drawCircle();
            break;
    }
    
    // Update stats
    updateStats();
}

function drawWaveform() {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    // Clear with gradient
    const gradient = visualizerCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    visualizerCtx.fillStyle = gradient;
    visualizerCtx.fillRect(0, 0, width, height);
    
    // Draw grid
    visualizerCtx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
    visualizerCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        visualizerCtx.beginPath();
        visualizerCtx.moveTo(0, y);
        visualizerCtx.lineTo(width, y);
        visualizerCtx.stroke();
    }
    
    // Draw waveform
    visualizerCtx.lineWidth = 2;
    const waveGradient = visualizerCtx.createLinearGradient(0, 0, width, 0);
    waveGradient.addColorStop(0, '#6366f1');
    waveGradient.addColorStop(0.5, '#8b5cf6');
    waveGradient.addColorStop(1, '#ec4899');
    visualizerCtx.strokeStyle = waveGradient;
    
    visualizerCtx.beginPath();
    const sliceWidth = width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
            visualizerCtx.moveTo(x, y);
        } else {
            visualizerCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    visualizerCtx.lineTo(width, height / 2);
    visualizerCtx.stroke();
}

function drawSpectrum() {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    // Clear
    visualizerCtx.fillStyle = '#0f172a';
    visualizerCtx.fillRect(0, 0, width, height);
    
    // Draw spectrum
    const barWidth = width / bufferLength * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        
        // Color based on frequency
        const hue = (i / bufferLength) * 360;
        visualizerCtx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        
        visualizerCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function drawBars() {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    // Clear with gradient
    const bgGradient = visualizerCtx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#1e293b');
    bgGradient.addColorStop(1, '#0f172a');
    visualizerCtx.fillStyle = bgGradient;
    visualizerCtx.fillRect(0, 0, width, height);
    
    const bars = 64;
    const barWidth = width / bars;
    
    for (let i = 0; i < bars; i++) {
        const dataIndex = Math.floor(i * bufferLength / bars);
        const barHeight = (dataArray[dataIndex] / 255) * height * 0.8;
        
        // Gradient bar
        const barGradient = visualizerCtx.createLinearGradient(0, height, 0, height - barHeight);
        barGradient.addColorStop(0, '#6366f1');
        barGradient.addColorStop(0.5, '#8b5cf6');
        barGradient.addColorStop(1, '#ec4899');
        visualizerCtx.fillStyle = barGradient;
        
        visualizerCtx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
    }
}

function drawCircle() {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Clear
    visualizerCtx.fillStyle = '#0f172a';
    visualizerCtx.fillRect(0, 0, width, height);
    
    // Draw circular waveform
    visualizerCtx.beginPath();
    
    for (let i = 0; i < bufferLength; i++) {
        const angle = (i / bufferLength) * Math.PI * 2;
        const amplitude = (dataArray[i] - 128) / 128.0;
        const r = radius + amplitude * 50;
        
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) {
            visualizerCtx.moveTo(x, y);
        } else {
            visualizerCtx.lineTo(x, y);
        }
    }
    
    visualizerCtx.closePath();
    
    // Gradient stroke
    const gradient = visualizerCtx.createConicGradient(0, centerX, centerY);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(0.33, '#8b5cf6');
    gradient.addColorStop(0.66, '#ec4899');
    gradient.addColorStop(1, '#6366f1');
    visualizerCtx.strokeStyle = gradient;
    visualizerCtx.lineWidth = 3;
    visualizerCtx.stroke();
    
    // Fill with alpha
    visualizerCtx.fillStyle = 'rgba(99, 102, 241, 0.1)';
    visualizerCtx.fill();
}

function updateStats() {
    // Calculate peak
    let peak = 0;
    let sum = 0;
    let maxFreqIndex = 0;
    let maxFreqValue = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const value = Math.abs((dataArray[i] - 128) / 128.0);
        peak = Math.max(peak, value);
        sum += value * value;
        
        if (dataArray[i] > maxFreqValue && i < bufferLength / 2) {
            maxFreqValue = dataArray[i];
            maxFreqIndex = i;
        }
    }
    
    // RMS
    const rms = Math.sqrt(sum / bufferLength);
    
    // Convert to dB
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    
    // Dominant frequency
    const freq = maxFreqIndex * audioContext.sampleRate / analyser.fftSize;
    
    // Update audio stats display
    document.getElementById('peakLevel').textContent = 
        peakDb === -Infinity ? '-∞ dB' : peakDb.toFixed(1) + ' dB';
    document.getElementById('rmsLevel').textContent = 
        rmsDb === -Infinity ? '-∞ dB' : rmsDb.toFixed(1) + ' dB';
    document.getElementById('dominantFreq').textContent = 
        freq > 0 ? Math.round(freq) + ' Hz' : '-- Hz';
    
    // Update audio callbacks counter
    document.getElementById('audioCallbacks').textContent = 
        performanceStats.audioCallbacks.toLocaleString();
    
    // Update total data processed
    const totalMB = performanceStats.totalDataProcessed / (1024 * 1024);
    if (totalMB < 1) {
        document.getElementById('totalData').textContent = 
            (performanceStats.totalDataProcessed / 1024).toFixed(1) + ' KB';
    } else if (totalMB < 1000) {
        document.getElementById('totalData').textContent = 
            totalMB.toFixed(2) + ' MB';
    } else {
        document.getElementById('totalData').textContent = 
            (totalMB / 1024).toFixed(2) + ' GB';
    }
    
    // Calculate processing speed (how many times faster than realtime)
    if (audioContext && performanceStats.processingTime > 0) {
        const bufferSize = 4096;
        const sampleRate = audioContext.sampleRate;
        const bufferDuration = (bufferSize / sampleRate) * 1000; // ms
        const speedMultiplier = bufferDuration / performanceStats.processingTime;
        
        document.getElementById('processingSpeed').textContent = 
            speedMultiplier.toFixed(0) + 'x realtime';
    }
}

// Initialize the application when page loads
initApp();

