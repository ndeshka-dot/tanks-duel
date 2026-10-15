const express=require('express'),http=require('http'),{WebSocketServer}=require('ws');
const app=express();app.use(express.static(__dirname+'/public'));
const srv=http.createServer(app),wss=new WebSocketServer({server:srv});
const rooms={};
wss.on('connection',(ws,req)=>{
  const room=(new URL(req.url,'http://x').searchParams.get('room')||'lobby').slice(0,32);
  const r=rooms[room]=rooms[room]||[];
  if(r.length>=2){ws.send(JSON.stringify({t:'full'}));return ws.close();}
  r.push(ws);ws.tank='hornet';ws.alive=true;
  ws.on('message',m=>{let d;try{d=JSON.parse(m)}catch{return}
    if(d.t==='hello'){ws.tank=d.tank==='wasp'?'wasp':'hornet';ws.hello=true;
      if(r.length===2&&r.every(w=>w.hello)&&!r.started){r.started=true;
        r.forEach((w,i)=>w.send(JSON.stringify({t:'start',idx:i,opp:r[1-i].tank})));}
      return;}
    if(!r.started)return;
    const o=r.find(w=>w!==ws);if(o&&o.readyState===1)o.send(m.toString());});
  ws.on('close',()=>{const i=r.indexOf(ws);if(i>=0)r.splice(i,1);
    const o=r[0];if(o&&r.started)o.send(JSON.stringify({t:'left'}));
    if(!r.length)delete rooms[room];else r.started=false;});
});
const P=process.env.PORT||3000;srv.listen(P,()=>console.log('tanks on :'+P));
