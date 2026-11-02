const definition={name:'get_current_time',description:'Fresh device time in UTC and local timezone. Optional time_zone: IANA zone or UTC. Use for today/relative dates.',parameters:{type:'object',properties:{time_zone:{type:'string'}},required:[],additionalProperties:false}};

function getCurrentTime(args={},runtime={}){
 if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>k!=='time_zone'))throw new Error('Use an empty object or a time_zone.');
 const systemZone=(runtime.systemZone||(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'))();
 const zone=args.time_zone??systemZone;
 if(typeof zone!=='string'||!zone.trim()||zone.length>128||/^[+-]/.test(zone))throw new Error('Use an IANA timezone such as Asia/Jerusalem, or UTC.');
 let formatter;
 try{formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',weekday:'long',hourCycle:'h23'});}catch{throw new Error('Unknown timezone. Use an IANA timezone such as Asia/Jerusalem, or UTC.');}
 // Capture once so UTC, local date and offset refer to exactly the same instant.
 const now=(runtime.now||(()=>new Date()))();if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('The device clock could not be read.');
 const parts=Object.fromEntries(formatter.formatToParts(now).map(p=>[p.type,p.value]));
 const date=parts.year+'-'+parts.month+'-'+parts.day;
 const offset=Math.round((Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second))-Math.floor(now.getTime()/1000)*1000)/60000);
 const pad=value=>String(value).padStart(2,'0'),suffix=(offset<0?'-':'+')+pad(Math.floor(Math.abs(offset)/60))+':'+pad(Math.abs(offset)%60);
 return {utc_time:now.toISOString(),local_time:date+'T'+parts.hour+':'+parts.minute+':'+parts.second+'.'+String(now.getUTCMilliseconds()).padStart(3,'0')+suffix,local_date:date,weekday:parts.weekday,time_zone:formatter.resolvedOptions().timeZone,utc_offset_minutes:offset,system_time_zone:systemZone,source:'device clock'};
}
module.exports={definition,getCurrentTime};
