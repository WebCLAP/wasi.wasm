# `wasi.wasm`: WASI functions implemented as a WASM module

The goal is to provide a WASM implementation with stdout/stderr, and an in-memory VFS.

## WASM module

The module imports its (shared) memory, and some functions which help it manipulate the memory of the (soon to be instantiated) module it's providing WASI imports for.

Multiple modules can use the same WASI setup (with a shared VFS etc.) by creating new instances which use the same shared memory but different imports.

The `wasi.wasm` module *also* has a couple of WASI-P1 imports itself - but it shouldn't ever actually call these, so you can just provide stubs that do nothing (or throw).

## JS loader

There's an ES6 module `wasi.mjs` (or `wasi-bundled.mjs` which includes the WASM inline), with the exports `getWasi()` (which compiles the module and `Promise`-resolves to an init object), and `startWasi(optionalInitObj)`.

The Wasi object obtained with `startWasi()` provides a `.importObj` property, which can be used to supply the imports for one other module.  You must bind to that module's memory using `bindToOtherMemory()` when it's available.

```js
let wasi = await startWasi();
Object.assign(otherModuleImports, wasi.importObj);

wasi.bindToOtherMemory(otherModuleMemory);
```

To use the same WASI context for multiple other instances, create copies with `.copyForRebinding()` (if on the same thread/context), or `.initObj()` when sending to a Worker/Worklet (and then pass it to `startWasi()`).  The difference is that `copyForRebinding()` always shares the same memory, but if the page isn't cross-origin isolated then `.initObj()` only includes the precompiled module, since the actual WASI context/data can't be shared in that case.

```js
let wasi2 = await wasi.copyForRebinding();
Object.assign(module2Imports, wasi2.importObj);

wasi2.bindToOtherMemory(module2Memory);
// Both modules will now share the same WASI VFS
```

## Development

The C++ code is in `dev/`.  Assuming `WASI_SDK` points to a [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) release:

```sh
cmake . -B cmake-build -DCMAKE_TOOLCHAIN_FILE=$(WASI_SDK)/share/cmake/wasi-sdk-pthread.cmake  -DCMAKE_BUILD_TYPE=Release
# outputs ../wasi.wasm
cmake --build cmake-build --target wasi --config Release
```

To update the bundled version, run `node make-bundled.js`.
