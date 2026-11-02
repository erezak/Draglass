const channels={email:'Email',chats:'Chats and groups',calendar:'Calendar',transcripts:'Meeting transcripts',linkedFiles:'Linked files'};
const statuses=['searched','partial','unavailable','not-searched','unknown'];
function readCoverage(value){const report={};for(const key of Object.keys(channels))report[key]=value&&typeof value==='object'&&statuses.includes(value[key])?value[key]:'unknown';return report;}
function remaining(report){return Object.keys(channels).filter(key=>report[key]==='not-searched');}
module.exports={channels,readCoverage,remaining};
