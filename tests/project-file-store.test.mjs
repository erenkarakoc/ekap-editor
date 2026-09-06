import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {writeProject,digest,fileDigest} from '../desktop/src/project-file-store.ts';

test('disk create, overwrite, different copy and stale conflict preserve content',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'icmal-file-test-'));
 try {
  const target=path.join(dir,'original.icmal'), copy=path.join(dir,'copy.icmal');
  const first=Buffer.from('first'), next=Buffer.from('next');
  const hash=await writeProject(target,first,null);assert.equal(hash,await fileDigest(target));
  await writeProject(target,next,hash);assert.deepEqual(await fs.readFile(target),next);
  await writeProject(copy,next,null);assert.deepEqual(await fs.readFile(copy),next);
  await assert.rejects(writeProject(target,first,hash),/dışarıdan/);assert.deepEqual(await fs.readFile(target),next);
  await assert.rejects(writeProject(target,first,null),/dışarıdan/);
  assert.deepEqual((await fs.readdir(dir)).sort(),['copy.icmal','original.icmal']);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('invalid extension and unavailable parent fail without replacing existing file',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'icmal-file-test-'));
 try {const target=path.join(dir,'existing.txt');await fs.writeFile(target,'keep');
 await assert.rejects(writeProject(target,Buffer.from('bad'),digest(Buffer.from('keep'))));assert.equal(await fs.readFile(target,'utf8'),'keep');
 await assert.rejects(writeProject(path.join(dir,'missing','new.icmal'),Buffer.from('x'),null));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
