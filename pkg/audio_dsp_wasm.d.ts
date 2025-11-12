/* tslint:disable */
/* eslint-disable */
export class AudioProcessor {
  free(): void;
  [Symbol.dispose](): void;
  get_buffer_size(): number;
  get_memory_usage(): number;
  constructor(sample_rate: number);
  reset(): void;
  process(buffer: Float32Array, gain: number, lpf_cutoff: number, hpf_cutoff: number, delay_time: number, delay_feedback: number, delay_mix: number, distortion: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_audioprocessor_free: (a: number, b: number) => void;
  readonly audioprocessor_get_buffer_size: (a: number) => number;
  readonly audioprocessor_get_memory_usage: (a: number) => number;
  readonly audioprocessor_new: (a: number) => number;
  readonly audioprocessor_process: (a: number, b: number, c: number, d: any, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
  readonly audioprocessor_reset: (a: number) => void;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
