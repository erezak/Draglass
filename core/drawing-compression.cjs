// Bounded LZ-String Base64 decoding, compatible with lz-string 1.5.0.
// Algorithm attribution: Pieroxy; MIT license in docs/licenses/LZ_STRING_LICENSE.txt.
function decompress(input,limit=8*1024*1024){
 if(typeof input!=='string')throw new Error('Could not decompress this Excalidraw scene.');input=input.replace(/\s/g,'');if(!input||input.length>8*1024*1024||!/^[A-Za-z0-9+/]+={0,3}$/.test(input))throw new Error('Could not decompress this Excalidraw scene.');
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',dictionary=[null,null,null],result=[];let index=0,mask=32,value=alphabet.indexOf(input[0]),size=4,width=3,remaining=4,total=0,dictionaryChars=0;
 function bits(count){let out=0,power=1;for(let i=0;i<count;i++){if(index>=input.length||value<0)throw new Error('Could not decompress this Excalidraw scene.');if(value&mask)out+=power;power*=2;mask>>=1;if(!mask){mask=32;value=alphabet.indexOf(input[++index]);}}return out;}
 const initial=bits(2);if(initial===2)return '';if(initial>1)throw new Error('Could not decompress this Excalidraw scene.');let previous=String.fromCharCode(bits(initial===0?8:16));dictionary[3]=previous;result.push(previous);total=1;
 while(true){let code=bits(width);if(code===2)return result.join('');if(code===0||code===1){dictionary[size++]=String.fromCharCode(bits(code===0?8:16));code=size-1;dictionaryChars++;remaining--;}
  if(!remaining){remaining=2**width;width++;}const entry=dictionary[code]??(code===size?previous+previous[0]:null);if(!entry)throw new Error('Could not decompress this Excalidraw scene.');total+=entry.length;if(total>limit)throw new Error('Drawing is too large (8 MiB limit).');result.push(entry);const next=previous+entry[0];dictionaryChars+=next.length;if(dictionaryChars>Math.max(1024,limit*4)||size>limit+4)throw new Error('Compressed drawing exceeds the decoding memory budget.');dictionary[size++]=next;remaining--;previous=entry;if(!remaining){remaining=2**width;width++;}if(width>25)throw new Error('Compressed drawing exceeds the decoding budget.');
 }
}
module.exports={decompress};
