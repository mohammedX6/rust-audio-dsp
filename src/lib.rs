use wasm_bindgen::prelude::*;

// Real-time Audio DSP Processor
// Clean, simple, and works reliably
#[wasm_bindgen]
pub struct AudioProcessor {
    sample_rate: f32,
    
    // Filter state variables
    lpf_x1: f32,
    lpf_x2: f32,
    lpf_y1: f32,
    lpf_y2: f32,
    
    hpf_x1: f32,
    hpf_x2: f32,
    hpf_y1: f32,
    hpf_y2: f32,
    
    // Delay buffer
    delay_buffer: Vec<f32>,
    delay_write_pos: usize,
}

#[wasm_bindgen]
impl AudioProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> AudioProcessor {
        AudioProcessor {
            sample_rate,
            lpf_x1: 0.0,
            lpf_x2: 0.0,
            lpf_y1: 0.0,
            lpf_y2: 0.0,
            hpf_x1: 0.0,
            hpf_x2: 0.0,
            hpf_y1: 0.0,
            hpf_y2: 0.0,
            delay_buffer: vec![0.0; sample_rate as usize],
            delay_write_pos: 0,
        }
    }
    
    pub fn process(
        &mut self,
        buffer: &mut [f32],
        gain: f32,
        lpf_cutoff: f32,
        hpf_cutoff: f32,
        delay_time: f32,
        delay_feedback: f32,
        delay_mix: f32,
        distortion: f32,
    ) {
        // Calculate filter coefficients
        let lpf_coeffs = self.calc_lpf(lpf_cutoff);
        let hpf_coeffs = self.calc_hpf(hpf_cutoff);
        
        // Calculate delay samples
        let delay_samples = ((delay_time * self.sample_rate) as usize)
            .min(self.delay_buffer.len() - 1)
            .max(1);
        
        // Process each sample
        for sample in buffer.iter_mut() {
            let mut x = *sample * gain;
            
            // Distortion
            if distortion > 0.01 {
                let drive = 1.0 + distortion * 8.0;
                x = (x * drive).tanh() / drive.tanh();
            }
            
            // Filters
            x = Self::biquad(x, &lpf_coeffs, &mut self.lpf_x1, &mut self.lpf_x2, &mut self.lpf_y1, &mut self.lpf_y2);
            x = Self::biquad(x, &hpf_coeffs, &mut self.hpf_x1, &mut self.hpf_x2, &mut self.hpf_y1, &mut self.hpf_y2);
            
            // Delay - SIMPLE AND CLEAN
            if delay_time > 0.001 && delay_mix > 0.001 {
                let read_pos = if self.delay_write_pos >= delay_samples {
                    self.delay_write_pos - delay_samples
                } else {
                    self.delay_buffer.len() + self.delay_write_pos - delay_samples
                };
                
                let delayed = self.delay_buffer[read_pos];
                
                // SIMPLE feedback - just reduce it A LOT
                let fb = (delay_feedback * 0.25).min(0.6);
                self.delay_buffer[self.delay_write_pos] = x + delayed * fb;
                
                // Mix
                x = x * (1.0 - delay_mix * 0.5) + delayed * delay_mix * 0.5;
                
                self.delay_write_pos = (self.delay_write_pos + 1) % self.delay_buffer.len();
            } else {
                // No delay - write silence
                self.delay_buffer[self.delay_write_pos] = 0.0;
                self.delay_write_pos = (self.delay_write_pos + 1) % self.delay_buffer.len();
            }
            
            // Soft limit
            x = x.clamp(-0.95, 0.95);
            
            *sample = x;
        }
    }
    
    fn calc_lpf(&self, cutoff: f32) -> [f32; 5] {
        let cutoff = cutoff.max(100.0).min(self.sample_rate * 0.45);
        let q = 0.707;
        let w0 = 2.0 * std::f32::consts::PI * cutoff / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);
        
        let b0 = (1.0 - cos_w0) / 2.0;
        let b1 = 1.0 - cos_w0;
        let b2 = (1.0 - cos_w0) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;
        
        [b0/a0, b1/a0, b2/a0, a1/a0, a2/a0]
    }
    
    fn calc_hpf(&self, cutoff: f32) -> [f32; 5] {
        let cutoff = cutoff.max(20.0).min(self.sample_rate * 0.45);
        let q = 0.707;
        let w0 = 2.0 * std::f32::consts::PI * cutoff / self.sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);
        
        let b0 = (1.0 + cos_w0) / 2.0;
        let b1 = -(1.0 + cos_w0);
        let b2 = (1.0 + cos_w0) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;
        
        [b0/a0, b1/a0, b2/a0, a1/a0, a2/a0]
    }
    
    fn biquad(input: f32, c: &[f32; 5], x1: &mut f32, x2: &mut f32, y1: &mut f32, y2: &mut f32) -> f32 {
        let out = c[0] * input + c[1] * *x1 + c[2] * *x2 - c[3] * *y1 - c[4] * *y2;
        *x2 = *x1;
        *x1 = input;
        *y2 = *y1;
        *y1 = out;
        out
    }
    
    pub fn reset(&mut self) {
        self.lpf_x1 = 0.0;
        self.lpf_x2 = 0.0;
        self.lpf_y1 = 0.0;
        self.lpf_y2 = 0.0;
        self.hpf_x1 = 0.0;
        self.hpf_x2 = 0.0;
        self.hpf_y1 = 0.0;
        self.hpf_y2 = 0.0;
        for s in self.delay_buffer.iter_mut() {
            *s = 0.0;
        }
        self.delay_write_pos = 0;
    }
    
    // Get delay buffer size in bytes (for memory monitoring)
    pub fn get_buffer_size(&self) -> usize {
        self.delay_buffer.len() * std::mem::size_of::<f32>()
    }
    
    // Get total memory used by this struct
    pub fn get_memory_usage(&self) -> usize {
        std::mem::size_of::<Self>() + self.delay_buffer.capacity() * std::mem::size_of::<f32>()
    }
}
