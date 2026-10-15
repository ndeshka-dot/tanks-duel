const express=require('express'),http=require('http'),{WebSocketServer}=require('ws');
const app=express();app.use(express.static(__dirname+'/public'));
const srv=http.createServer(app),wss=new WebSocketServer({server:srv});
const rooms={};
const SKINS=['redgold','camo','silver'];
const send=(w,o)=>{if(w&&w.readyState===1)w.send(JSON.stringify(o))};
function tryStart(r){
  if(r.length===2&&!r.started&&r.every(w=>w.ready)){r.started=true;
    r.forEach((w,i)=>{w.ready=false;send(w,{t:'start',reload:Math.max(r[0].reload||2000,r[1].reload||2000),idx:i,opp:r[1-i].tank,oppSkin:r[1-i].skin})});}
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
  r.push(ws);ws.tank='hornet';ws.skin='redgold';ws.ready=false;
  if(r.length===2)r.forEach(w=>w!==ws&&send(w,{t:'joined'}));
  ws.on('message',m=>{let d;try{d=JSON.parse(m)}catch{return}
    if(d.t==='hello'){ws.tank=d.tank==='wasp'?'wasp':'hornet';ws.skin=SKINS.includes(d.skin)?d.skin:'redgold';ws.reload=Math.max(300,Math.min(3000,+d.reload||2000));ws.ready=true;tryStart(r);return;}
    if(d.t==='rematch'){ws.ready=true;r.started=false;if(r.length<2)send(ws,{t:'wait'});tryStart(r);return;}
    if(!r.started)return;
    const o=r.find(w=>w!==ws);if(o)send(o,d);});
  ws.on('close',()=>{const i=r.indexOf(ws);if(i>=0)r.splice(i,1);
    const o=r[0];if(o){o.ready=false;if(r.started||true){r.started=false;send(o,{t:'left'})}}
    if(!r.length&&rooms[room]===r)delete rooms[room];});
});
const P=process.env.PORT||3000;srv.listen(P,()=>console.log('tanks on :'+P));
