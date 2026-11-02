const test=require('node:test'),assert=require('node:assert/strict');
const {checkSamples,checkSampleText}=require('../scripts-check-samples.cjs');

test('bundled sample files and decoded drawing scenes use safe fictional endpoints',async()=>{
 const result=await checkSamples();assert.ok(result.files>=70);assert.ok(result.drawings>=4);
});
test('sample policy rejects operational destinations, credentials and home paths',()=>{
 for(const text of ['https://private.internal/review','person@private.internal','https://user:password@example.invalid','/Users/sample-person/notes','C:\\Users\\sample-person\\notes'])assert.throws(()=>checkSampleText(text));
 for(const text of ['https://example.invalid/lumen/beacon','https://example.org/evidence','person@example.invalid','http://www.w3.org/2000/svg'])assert.doesNotThrow(()=>checkSampleText(text));
});
