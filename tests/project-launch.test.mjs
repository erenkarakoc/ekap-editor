import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {projectPathFromArgv} from '../desktop/src/project-launch.ts';

test('a packaged launch picks up the double-clicked file',()=>{
 assert.equal(projectPathFromArgv(['C:\App\İcmal.exe','C:\isler\butce.icmal']),
  path.resolve('C:\isler\butce.icmal'));
});

test('a development launch skips the script path',()=>{
 assert.equal(projectPathFromArgv(['electron','.','butce.icmal']),path.resolve('butce.icmal'));
});

test('switches are not mistaken for a file',()=>{
 assert.equal(projectPathFromArgv(['İcmal.exe','--inspect','--user-data-dir=x']),null);
});

test('an unrelated file is ignored',()=>{
 assert.equal(projectPathFromArgv(['İcmal.exe','rapor.pdf']),null);
});

test('the extension match is case insensitive',()=>{
 assert.equal(projectPathFromArgv(['İcmal.exe','BUTCE.ICMAL']),path.resolve('BUTCE.ICMAL'));
});

test('a plain launch hands over nothing',()=>{
 assert.equal(projectPathFromArgv(['İcmal.exe']),null);
});
