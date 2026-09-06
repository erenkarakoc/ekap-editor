import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createProject, encodeProject, decodeProject, MAX_PROJECT_BYTES } from '../src/features/projects/lib/icmal-file.ts';
const row = (id) => ({id, pozNo:'15.100', description:'İmalat – ölçü', unit:'m³', quantity:'1234567890.1234567890123456789', unitPrice:'-0.000000000000123456789', source:{versionId:'v1',priceId:null,priceType:'unit_price',priceAmount:'123.4500000000001',currency:'TRY',unit:'m³',institution:'ÇŞİDB',period:'2026-01',book:'İnşaat',url:null,page:6}});
async function archive(value, extra=false) { const zip=new JSZip();zip.file('project.json', JSON.stringify(value));if(extra)zip.file('attachment.txt','keep me');return zip.generateAsync({type:'uint8array'}); }
test('50 rows and both tables retain exact decimals, Unicode, source and order',async()=>{
 const project=createProject('Deneme');project.costRows=Array.from({length:50},(_,i)=>row(String(i)));
 project.percentageRows=[{...row('p1'),percentageLow:'15.23456789',percentageHigh:'25',useRange:true}];
 assert.deepEqual(await decodeProject(await encodeProject(project)),project);
});
test('missing price and actual zero remain distinct',async()=>{const p=createProject('Fiyat');p.costRows=[{...row('a'),unitPrice:null},{...row('b'),unitPrice:'0'}];assert.deepEqual((await decodeProject(await encodeProject(p))).costRows,p.costRows);});
test('duplicate ids, invalid decimal and unknown fields cannot be saved',async()=>{
 const p=createProject('Hatalı');p.costRows=[row('a'),row('a')];await assert.rejects(encodeProject(p));
 p.costRows=[{...row('a'),quantity:'NaN'}];await assert.rejects(encodeProject(p));
 p.costRows=[];await assert.rejects(encodeProject({...p,subscription:'paid'}));
});
test('future versions and extra archive contents are rejected without data loss',async()=>{
 await assert.rejects(decodeProject(await archive({...createProject('Yeni'),version:2})),/sürümü desteklenmiyor/);
 await assert.rejects(decodeProject(await archive(createProject('Ek'),true)),/Geçersiz/);
});
test('invalid ZIP and malformed project data are rejected',async()=>{
 await assert.rejects(decodeProject(new Uint8Array([1,2,3])),/Geçersiz/);
 await assert.rejects(decodeProject(await archive({format:'icmal',version:1})),/Geçersiz/);
});
test('compressed large content and oversized input are bounded',async()=>{
 const zip=new JSZip();zip.file('project.json',' '.repeat(MAX_PROJECT_BYTES+1));
 await assert.rejects(decodeProject(await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})),/boyut sınırını/);
 await assert.rejects(decodeProject(new Uint8Array(MAX_PROJECT_BYTES+1)),/boyut sınırını/);
});
test('normalized traversal entry is rejected',async()=>{const zip=new JSZip();zip.file('../project.json',JSON.stringify(createProject('Yol')));await assert.rejects(decodeProject(await zip.generateAsync({type:'uint8array'})),/Geçersiz/);});
