const BASE=import.meta.env.VITE_API_URL||'http://localhost:5000/api';
export async function api(path,options={}){
 const token=localStorage.getItem('civicfix_token');
 const headers={...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(options.headers||{})};
 if(token)headers.Authorization=`Bearer ${token}`;
 const r=await fetch(BASE+path,{...options,headers});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.message||'Request failed'),{data,status:r.status});
 return data;
}
