import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startWasi as sourceStart} from '../../wasi.mjs';
import {startWasi as bundledStart} from '../../wasi-bundled.mjs';
const module=await WebAssembly.compile(await readFile(new URL('../../wasi.wasm',import.meta.url)));
for(const [name,startWasi] of [['source',sourceStart],['bundled',bundledStart]]){
 for(const [kind,make] of [
  ['ArrayBuffer',()=>new Uint8Array([4,5]).buffer],
  ['Uint8Array subarray',()=>new Uint8Array([99,4,5,88]).subarray(1,3)],
  ['DataView',()=>new DataView(new Uint8Array([99,4,5,88]).buffer,1,2)],
  ['empty subarray',()=>new Uint8Array([99,88]).subarray(1,1)]
 ])test(`${name}: loadFiles respects ${kind} range`,async()=>{
  const wasi=await startWasi({module,maximumMemoryPages:256});
  const input=make(),expected=ArrayBuffer.isView(input)?new Uint8Array(input.buffer,input.byteOffset,input.byteLength):new Uint8Array(input);
  wasi.loadFiles({'/fixture.bin':input});
  const memory=new WebAssembly.Memory({initial:1});wasi.bindToOtherMemory(memory);
  const u8=new Uint8Array(memory.buffer),view=new DataView(memory.buffer),api=wasi.importObj.wasi_snapshot_preview1;
  const path=new TextEncoder().encode('fixture.bin');u8.set(path,256);
  assert.equal(api.path_open(3,0,256,path.length,0,2n,0n,0,32),0);
  const fd=view.getUint32(32,true);
  try{view.setUint32(64,1024,true);view.setUint32(68,8192,true);assert.equal(api.fd_read(fd,64,1,40),0);assert.deepEqual(u8.slice(1024,1024+view.getUint32(40,true)),expected);}finally{api.fd_close(fd);}
 });
}
