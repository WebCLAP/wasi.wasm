import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {startWasi} from '../wasi.mjs';

test('fresh memory honours the supplied memory specification', async () => {
	const previousIsolation = globalThis.crossOriginIsolated;
	globalThis.crossOriginIsolated = true;

	try {
		const bytes = await readFile(new URL('../wasi.wasm', import.meta.url));
		const module = await WebAssembly.compile(bytes);
		const wasi = await startWasi({
			module,
			seedString: 'test',
			memorySpec: {initial: 8, maximum: 8, shared: true},
		});
		const memory = wasi.initObj().memory;

		assert.ok(memory instanceof WebAssembly.Memory);
		assert.throws(() => memory.grow(1), RangeError);
	} finally {
		if (previousIsolation === undefined) delete globalThis.crossOriginIsolated;
		else globalThis.crossOriginIsolated = previousIsolation;
	}
});
