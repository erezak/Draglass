const test=require('node:test'),assert=require('node:assert/strict');
const {findMatches,replacementChanges}=require('../core/document-search.cjs');
test('document matching supports literal punctuation, case, Unicode whole words and multiline regex',()=>{
 assert.equal(findMatches('A.b a.b axb',{query:'a.b'}).matches.length,2);
 assert.equal(findMatches('A.b a.b',{query:'a.b',caseSensitive:true}).matches.length,1);
 assert.equal(findMatches('café décafé café_ café!',{query:'café',wholeWord:true}).matches.length,2);
 assert.equal(findMatches('one\ntwo\none',{query:'^one$',regex:true}).matches.length,2);
 assert.match(findMatches('text',{query:'[',regex:true}).error,/Invalid/);assert.equal(findMatches('text',{query:''}).matches.length,0);
});
test('zero-width expressions terminate at Unicode code points and match limits are explicit',()=>{
 assert.deepEqual(findMatches('😀a',{query:'(?=.)',regex:true}).matches.map(m=>m.from),[0,2]);
 const result=findMatches('aaa',{query:'a'},2);assert.equal(result.matches.length,2);assert.equal(result.truncated,true);assert.throws(()=>replacementChanges('aaa',result,'b'),/Narrow/);
});
test('replacement plans use literal replacement text or standard regex capture expansion',()=>{
 const text='Dana 12; Mara 34',result=findMatches(text,{query:'(?<name>\\w+) (\\d+)',regex:true});
 assert.deepEqual(replacementChanges(text,result,'$<name>:$2 $$ $&',true).map(c=>c.insert),['Dana:12 $ Dana 12','Mara:34 $ Mara 34']);
 assert.equal(replacementChanges('a',findMatches('a',{query:'a'}),'$&')[0].insert,'$&');
 assert.throws(()=>replacementChanges('a',findMatches('a',{query:'a'}),'b'.repeat(8*1024*1024+1)),/8 MiB/);
});
