// Pure shared note-reference model. Filesystem, IPC, editor and DOM behavior live in adapters.
module.exports={...require('./syntax.cjs'),...require('./fragments.cjs'),...require('./completion.cjs')};
