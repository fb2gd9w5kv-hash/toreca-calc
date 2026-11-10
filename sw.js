// オフライン用：画面はキャッシュ優先、データは電波があれば新しいもの（4秒で諦めて前回の分）
const V="v1", SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-180.png"];
self.addEventListener("install",e=>{e.waitUntil(Promise.all([caches.open("shell-"+V).then(c=>c.addAll(SHELL)),caches.open("data").then(async c=>{for(const n of ["data.json","imgs.json"]){try{const r=await fetch(n,{cache:"no-cache"});if(r.ok)await c.put(n,r)}catch(e){}}})]).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=="shell-"+V&&k!=="data").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function timeout(ms){return new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))}
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin)return;
  const name=u.pathname.split("/").pop();
  if(name==="data.json"||name==="imgs.json"){
    e.respondWith((async()=>{
      const c=await caches.open("data");
      const net=fetch(e.request.url,{cache:"no-cache"}).then(r=>{if(r.ok)c.put(name,r.clone());return r});
      if(name==="imgs.json"){const hit=await c.match(name);if(hit){net.catch(()=>{});return hit}}
      try{return await Promise.race([net,timeout(4000)])}
      catch(err){const hit=await c.match(name);if(hit){net.catch(()=>{});return hit}return net}
    })());
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r.ok)caches.open("shell-"+V).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>hit);
    return hit||net;
  }));
});
