const express=require('express'),http=require('http'),{WebSocketServer}=require('ws');
const app=express();app.use(express.static(__dirname+'/public',{maxAge:'1h',setHeaders:(res,f)=>{if(/\/models\/paints\/i.*\.webp$/.test(f))res.setHeader('Cache-Control','public, max-age=604800, immutable')}}));
const srv=http.createServer(app),wss=new WebSocketServer({server:srv});
const rooms={};
const ZT=['speed','repair','defense','damage'];
function stopDrops(r){clearTimeout(r.dt);(r.exp||[]).forEach(clearTimeout);r.exp=[];r.drops={}}
function scheduleDrop(r,first){r.dt=setTimeout(()=>{if(!r.started)return;
  const free=[0,1,2,3].filter(z=>!Object.values(r.drops).some(d=>d.zone===z));
  if(free.length){const zone=free[Math.floor(Math.random()*free.length)],id=r.nid=(r.nid||0)+1;r.drops[id]={zone};
    r.forEach(w=>send(w,{t:'drop',id,zone,ts:Date.now()}));
    r.exp.push(setTimeout(()=>{if(r.drops[id]){delete r.drops[id];r.forEach(w=>send(w,{t:'dropgone',id}))}},30000));}
  scheduleDrop(r,false)},first?4000:15000+Math.random()*5000)}const PAINTS=['p0','p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12','p13','p14'];
const send=(w,o)=>{if(w&&w.readyState===1)w.send(JSON.stringify(o))};
function tryStart(r){
  if(r.length===2&&!r.started&&r.every(w=>w.ready)){r.started=true;stopDrops(r);scheduleDrop(r,true);
    r.forEach((w,i)=>{w.ready=false;send(w,{t:'start',idx:i,opp:r[1-i].tank,oppPaint:r[1-i].paint||'',oppSkin:(['xt','20'].includes(r[1-i].skin)?r[1-i].skin:'lg'),oppRz:r[1-i].rz===true,oppJug:r[1-i].jug===true})});}
}
wss.on('connection',(ws,req)=>{
  const q=new URL(req.url,'http://x').searchParams;
  const room=(q.get('room')||'lobby').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)||'LOBBY';
  const mode=q.get('mode')||'auto';
  let r=rooms[room];
  const fail=e=>{send(ws,{t:'err',e});ws.close()};
  if(mode==='create'){if(r&&r.length)return fail('exists');r=rooms[room]=[];}
  else if(mode==='join'){if(!r||!r.length)return fail('notfound');if(r.length>=2)return fail('full');}
  else{r=rooms[room]=rooms[room]||[];if(r.length>=2)return fail('full');}
  r.push(ws);ws.tank='hornet';ws.ready=false;
  if(r.length===2)r.forEach(w=>w!==ws&&send(w,{t:'joined'}));
  ws.on('message',m=>{let d;try{d=JSON.parse(m)}catch{return}
    if(d.t==='hello'){ws.tank=d.tank==='wasp'?'wasp':'hornet';ws.paint=PAINTS.includes(d.paint)?d.paint:'';ws.skin=(['xt','20'].includes(d.skin)?d.skin:'lg');ws.rz=d.rz===true;ws.jug=d.jug===true;ws.ready=true;tryStart(r);return;}
    if(d.t==='pickup'){if(!r.started||!r.drops)return;const dr=r.drops[d.id];if(!dr)return;delete r.drops[d.id];const by=r.indexOf(ws);r.forEach(w=>send(w,{t:'taken',id:d.id,by,type:ZT[dr.zone]}));return}
    if(d.t==='rematch'){ws.ready=true;r.started=false;stopDrops(r);if(r.length<2)send(ws,{t:'wait'});tryStart(r);return;}
    if(!r.started)return;
    if(d.t==='lz'||d.t==='msl'){const n=v=>Math.max(-500,Math.min(500,Number.isFinite(v)?v:0)),c=d.t==='lz'?{t:'lz',on:d.on?1:0,ox:n(d.ox),oy:n(d.oy),oz:n(d.oz),tx:n(d.tx),ty:n(d.ty),tz:n(d.tz),p:Math.max(0,Math.min(1,+d.p||0))}:{t:'msl',ox:n(d.ox),oy:n(d.oy),oz:n(d.oz),dx:n(d.dx),dz:n(d.dz),seed:Math.max(0,Math.min(1,+d.seed||0))};
      const o2=r.find(w=>w!==ws);if(o2)send(o2,c);return}
    const o=r.find(w=>w!==ws);if(o)send(o,d);});
  ws.on('close',()=>{const i=r.indexOf(ws);if(i>=0)r.splice(i,1);stopDrops(r);
    const o=r[0];if(o){o.ready=false;if(r.started||true){r.started=false;send(o,{t:'left'})}}
    if(!r.length&&rooms[room]===r)delete rooms[room];});
});
const P=process.env.PORT||3000;srv.listen(P,()=>console.log('tanks on :'+P));
