// Basic API smoke test. Start the server first, then run:
// node smoke-test.mjs
const base='http://localhost:5000';
const r=await fetch(base+'/api/health');
if(!r.ok) throw new Error('Health check failed');
console.log(await r.json());
