const {setup,applyAction,validateAction}=window.ChaosAmin54;
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false}),shell=$('gameShell');
const words={ready:'A WORLD WORTH GETTING LOST IN',saved:'JOURNEY SAVED',connecting:'CONNECTING TO YOUR JOURNEY',offline:'CONNECTION LOST · RECONNECTING',controls:'A / D MOVE · SPACE JUMP · J SLASH · K DASH · ESC PAUSE',zones:['THE SHATTERED SANCTUARY','ECHOING SKYBRIDGE','THRONE OF THE HOLLOW'],events:{seal:'AN ANCIENT SEAL AWAKENS',checkpoint:'SANCTUARY REACHED · HEALTH RESTORED',bossdown:'THE HOLLOW KNIGHT HAS FALLEN',fall:'THE WIND CARRIES YOU BACK',shrine:'NOVA SUPREME\'S BLESSING · FULL HEALTH & BRIEF IMMORTALITY'},lostTitle:'Not the end.',wonTitle:'The light returns.',lostText:'Even the brightest blade can falter. Take a breath, then rise again.',wonText:'The three seals awaken. The hollow crown is broken. Your kingdom has a tomorrow.',portal:'THE PORTAL NEEDS ALL THREE SEALS',boss:'THE HOLLOW KNIGHT AWAKENS'};
let room,player;
try{room=localStorage.getItem('rb-room')||crypto.randomUUID();player=localStorage.getItem('rb-player')||crypto.randomUUID();localStorage.setItem('rb-room',room);localStorage.setItem('rb-player',player);}catch{room=crypto.randomUUID();player=crypto.randomUUID();}
const suppliedRoom=new URLSearchParams(location.search).get('room');if(suppliedRoom&&/^[\w-]{1,64}$/.test(suppliedRoom))room=suppliedRoom;
let state=setup([player]),screen='title',ws=null,networkReady=false,initialSync=false,pending=[],resetting=false,assetsReady=false;
let W=1280,H=720,camera=0,time=0,acc=0,last=0,eventSeen=-1,toastTimer=0,shake=0,hitstop=0,bursts=[],reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let frames=0,totalFrameTime=0,drawCalls=0,cpuMs=0,wasBoss=false;
const images={};
const sources={vista:'assets/vista.jpg',vistaSky:'assets/vista_sky.jpg',vistaThrone:'assets/vista_throne.jpg',title:'assets/title.jpg',titleAmin:'assets/title_amin.jpg',titleCrimson:'assets/title_crimson.jpg',hero:'assets/hero.png',heroAmin:'assets/hero_amin.png',heroCrimson:'assets/hero_crimson.png',boss:'assets/boss.png',hound:'assets/hound.png',sentinel:'assets/sentinel.png',wraith:'assets/wraith.png',chak:'assets/chak.png',clat:'assets/clat.png',spid:'assets/spid.png',beast:'assets/beast.png',shrine:'assets/shrine.png',platform:'assets/platform.png'};
function currentZone(x){return x<2000?0:x<4620?1:2;}
const ENEMY_VIS={hound:{h:78,bob:1.8},sentinel:{h:104,bob:1.8},wraith:{h:92,bob:7},chak:{h:82,bob:1.8},clat:{h:74,bob:1.8},spid:{h:78,bob:1.8},beast:{h:88,bob:1.8}};
const HERO_SKINS={default:'hero',amin:'heroAmin',crimson:'heroCrimson'};
const TITLE_SKINS={default:'title',amin:'titleAmin',crimson:'titleCrimson'};
let skin='default';try{skin=localStorage.getItem('rb-skin')||'default';}catch{}
function heroImg(){return images[HERO_SKINS[skin]]||images.hero;}
function titleImg(){return images[TITLE_SKINS[skin]]||images.title;}
Promise.all(Object.entries(sources).map(([key,url])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{images[key]=im;resolve()};im.onerror=resolve;im.src=url}))).then(()=>{assetsReady=true; $('playLabel').textContent=state.tick>0?'CONTINUE YOUR JOURNEY':'BEGIN YOUR JOURNEY';});
function resize(){const r=shell.getBoundingClientRect();W=Math.max(550,H*r.width/r.height);const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);}
new ResizeObserver(resize).observe(shell);
function toggle(id,on){$(id).classList.toggle('hidden',!on)}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function sendFrames(){pending=[];try{localStorage.setItem('rb-save',JSON.stringify(state))}catch{}}
networkReady=true;initialSync=true;
try{const saved=JSON.parse(localStorage.getItem('rb-save')||'null');if(saved&&saved.version===1&&saved.players){state=saved;camera=Math.max(0,state.p.x-W*.35);}}catch{}
$('connection').textContent=words.saved;
let muted=true;
const music=new Audio('assets/music.mp3');music.loop=true;music.volume=.27;
const slashSounds=Array.from({length:3},()=>{const a=new Audio('assets/slash.mp3');a.volume=.4;return a;});let soundIndex=0;
function syncSound(){document.querySelector('.sound-slash').style.display=muted?'block':'none';$('soundBtn').setAttribute('aria-label',muted?'Enable sound':'Mute sound');$('soundBtn').title=muted?'Sound off':'Sound on';if(!muted&&screen==='playing')music.play().catch(()=>{});else music.pause();}
$('soundBtn').onclick=()=>{muted=!muted;syncSound()};
function sfx(){if(muted)return;const a=slashSounds[soundIndex++%3];a.currentTime=0;a.play().catch(()=>{});}
const held=new Set(),touched=new Set();let jumpEdge=false,dashEdge=false;
const keys={left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],jump:['Space','KeyW','ArrowUp'],attack:['KeyJ','KeyX'],dash:['KeyK','ShiftLeft','ShiftRight'],pause:['Escape','KeyP']};
function isHeld(verb){return touched.has(verb)||keys[verb]?.some(k=>held.has(k));}
function release(){held.clear();touched.clear();jumpEdge=false;dashEdge=false;}
addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]'))return;
 if(e.code==='Enter'&&screen==='title'){e.preventDefault();start();return;}
 if(keys.pause.includes(e.code)&&!e.repeat){e.preventDefault();screen==='playing'?pause():screen==='paused'?resume():null;return;}
 if(screen!=='playing')return;
 if(Object.values(keys).some(a=>a.includes(e.code))){e.preventDefault();if(!held.has(e.code)){if(keys.jump.includes(e.code))jumpEdge=true;if(keys.dash.includes(e.code))dashEdge=true;}held.add(e.code);}
});
addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',()=>{release();if(screen==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='playing')pause()});
for(const b of document.querySelectorAll('[data-control]')){const action=b.dataset.control;b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touched.add(action);if(action==='jump')jumpEdge=true;if(action==='dash')dashEdge=true;};const up=e=>{e.preventDefault();touched.delete(action)};b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=()=>touched.delete(action);}
function input(){const a={move:Number(isHeld('right'))-Number(isHeld('left')),jump:jumpEdge,jumpHeld:isHeld('jump'),attack:!!isHeld('attack'),dash:dashEdge};jumpEdge=false;dashEdge=false;return a;}
function start(){if(!assetsReady){toast('THE KINGDOM IS TAKING SHAPE · PLEASE WAIT');return;}if(!networkReady){toast('CONNECTING TO YOUR JOURNEY · PLEASE WAIT');return;}if(state.phase!=='playing'){restart();return;}screen='playing';shell.classList.add('playing');for(const id of ['intro','sceneCaption','sceneIndex','endPanel','pausePanel'])toggle(id,false);toggle('hud',true);toggle('touchControls',matchMedia('(pointer:coarse)').matches);$('bottomHint').textContent=words.controls;release();canvas.focus({preventScroll:true});syncSound();updateHUD();toast(state.tick?'YOUR JOURNEY CONTINUES':'FOLLOW THE GOLDEN SEALS · SPACE TO DOUBLE JUMP');}
function pause(){if(screen!=='playing')return;sendFrames();screen='paused';release();toggle('pausePanel',true);syncSound();}
function resume(){screen='playing';toggle('pausePanel',false);release();canvas.focus({preventScroll:true});syncSound();}
function restart(){pending=[];state=setup([player]);eventSeen=-1;wasBoss=false;camera=0;bursts=[];hitstop=0;sendFrames();for(const id of ['endPanel','pausePanel'])toggle(id,false);start();}
function title(){sendFrames();screen='title';shell.classList.remove('playing');for(const id of ['intro','sceneCaption','sceneIndex'])toggle(id,true);for(const id of ['hud','touchControls','endPanel','pausePanel','bossHud'])toggle(id,false);$('playLabel').textContent='BEGIN YOUR JOURNEY';syncSound();}
function finish(){sendFrames();screen='ended';toggle('endPanel',true);toggle('touchControls',false);toggle('bossHud',false);const won=state.phase==='won';$('endKicker').textContent=won?'CHAPTER COMPLETE':'A FALL IS NOT A FAILURE';$('endTitle').textContent=won?words.wonTitle:words.lostTitle;$('endText').textContent=(won?words.wonText:words.lostText)+(won?` ${state.score.toLocaleString()} points · ${Math.floor(state.tick/3600)}:${String(Math.floor(state.tick/60)%60).padStart(2,'0')}.`:'');$('retryBtn').firstChild.textContent=won?'PLAY AGAIN ':'RISE AGAIN ';syncSound();}
$('playBtn').onclick=start;$('pauseBtn').onclick=pause;$('resumeBtn').onclick=resume;$('retryBtn').onclick=restart;$('restartBtn').onclick=restart;$('backBtn').onclick=title;$('worldBtn').onclick=()=>shell.scrollIntoView({behavior:reduceMotion?'instant':'smooth',block:'center'});
$('fullBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else shell.requestFullscreen?.().catch(()=>toast('Fullscreen is not available in this browser.'))};
$('motionToggle').checked=reduceMotion;$('motionToggle').onchange=e=>reduceMotion=e.target.checked;
for(const [button,id]of [['guideBtn','guideDialog'],['bestiaryBtn','bestiaryDialog']])$(button).onclick=()=>{if(screen==='playing')pause();$(id).showModal()};
for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
const refs=[['b90be363-7a0b-40a4-82ea-2ab5cf011d7c','Rune Bonnie'],['54fc6baf-b555-4a23-887e-94480c86022a','The Abyssal Serpent'],['e8daa201-c833-4772-8317-84dc832a0484','The Clockwork Hound'],['2f5aefe3-c133-487a-81cc-250cc52370f5','The Hollow Knight'],['3727bdcf-e32d-4470-8c7f-0c17a6488860','The Last Runebearer'],['3d50e820-f0fa-4840-8098-01a66f56d7b1','The Gilded Experiment'],['530e3e83-320e-4591-82f7-b971ec6f7af0','The Alchemist’s Secret'],['db867b1e-12c9-4eed-add6-2ecfd77c6df9','Hound Study']];
for(const [id,label]of refs){const f=document.createElement('figure'),im=document.createElement('img'),c=document.createElement('figcaption');im.src=`assets/references/${id}.jpg`;im.alt=label;im.loading='lazy';c.textContent=label;f.append(im,c);$('gallery').append(f);}
function applySkinUI(){document.querySelectorAll('.skin-option').forEach(b=>b.classList.toggle('active',b.dataset.skin===skin));const hp=document.querySelector('.hero-portrait img');if(hp)hp.src=sources[HERO_SKINS[skin]];}
for(const b of document.querySelectorAll('.skin-option'))b.onclick=()=>{skin=b.dataset.skin;try{localStorage.setItem('rb-skin',skin);}catch{}applySkinUI();};
applySkinUI();
function updateHUD(){const p=state.p;$('health').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<p.hp?'':'empty'}"></i>`).join('');$('health').setAttribute('aria-label',`${p.hp} of 5 health`);$('sealCount').textContent=state.seals;$('score').textContent=String(state.score).padStart(5,'0');const zone=currentZone(p.x);$('zoneLabel').textContent=words.zones[zone];document.querySelectorAll('.journey-step').forEach((el,i)=>el.classList.toggle('current',i===zone));toggle('bossHud',state.boss.active&&state.boss.hp>0&&screen==='playing');$('bossFill').style.width=`${state.boss.hp/state.boss.maxHp*100}%`;if(state.boss.active&&!wasBoss){wasBoss=true;toast(words.boss)}if(p.x>6100&&state.boss.hp===0&&state.seals<3&&state.tick%180<6)toast(words.portal);}
function burst(x,y,color,count=14){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,sp=90+Math.random()*160;bursts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,life:1,color});}}
function advance(a){const prevHp=state.enemies.map(e=>e.hp),prevBossHp=state.boss.hp;state=applyAction(state,player,{type:'frames',inputs:[a]});pending.push(a);if(pending.length>=20)sendFrames();if(!reduceMotion){state.enemies.forEach((e,i)=>{if(prevHp[i]>0&&e.hp<=0)burst(e.x,e.y,'#ffb199');});if(prevBossHp>0&&state.boss.hp<=0)burst(state.boss.x,state.boss.y-90,'#e9b8ff',22);}if(state.eventTick!==eventSeen){eventSeen=state.eventTick;if(words.events[state.event])toast(words.events[state.event]);if(['slash','hit'].includes(state.event))sfx();if(['hurt','hit','slam'].includes(state.event)&&!reduceMotion)shake=state.event==='slam'?10:5;if(state.event==='hit'&&!reduceMotion)hitstop=4;if(!reduceMotion){if(state.event==='jump'&&state.p.jumps===2)burst(state.p.x,state.p.y+8,'#bdeeff',8);if(state.event==='dash')burst(state.p.x-state.p.facing*22,state.p.y-38,'#a3eaff',10);if(state.event==='seal')burst(state.p.x,state.p.y-55,'#ffe1a2',18);if(state.event==='shrine')burst(state.p.x,state.p.y-55,'#ffe6a0',26);}}if(state.tick%6===0)updateHUD();if(state.phase!=='playing')finish();}
function image(im,x,y,w,h){if(im){ctx.drawImage(im,x,y,w,h);drawCalls++;}}
function cover(im,zoom=1,offset=0){if(!im){ctx.fillStyle='#24263f';ctx.fillRect(0,0,W,H);return;}const sc=Math.max(W/im.width,H/im.height)*zoom;const w=im.width*sc,h=im.height*sc;image(im,(W-w)/2+offset,(H-h)/2,w,h);}
function sprite(im,x,y,h,flip=false,angle=0,squash=1){if(!im)return;const w=h*im.width/im.height;ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,squash);ctx.rotate(angle);image(im,-w/2,-h,w,h);ctx.restore();}
function glow(x,y,r,color){const gr=ctx.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'transparent');ctx.fillStyle=gr;ctx.fillRect(x-r,y-r,r*2,r*2);drawCalls++;}
function diamond(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.6,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.6,y);ctx.closePath();ctx.fill();drawCalls++;}
function drawBursts(dt){for(const b of bursts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=500*dt;b.life-=dt*1.6;}bursts=bursts.filter(b=>b.life>0);for(const b of bursts){const x=b.x-camera;if(x<-40||x>W+40)continue;ctx.globalAlpha=Math.max(0,b.life);diamond(x,b.y,4*b.life+1,b.color);}ctx.globalAlpha=1;}
function motes(t){ctx.fillStyle='#ffe6b980';ctx.beginPath();for(let i=0;i<23;i++){const x=((i*173.6+t*(5+i%4))%(W+40))-20,y=(i*79.3+Math.sin(t*.25+i)*30)%H;ctx.moveTo(x+1.3,y);ctx.arc(x,y,i%4===0?1.7:.8,0,Math.PI*2);}ctx.fill();drawCalls++;}
function drawTitle(){cover(titleImg(),reduceMotion?1.04:1.04+Math.sin(time*.12)*.009,W<800?-W*.17:0);motes(time);}
function platform(t){if(t.x+t.w<camera-40||t.x>camera+W+40)return;const x=t.x-camera,h=t.w>400?200:Math.min(150,t.w*.52);image(images.platform,x-8,t.y-3,t.w+16,h);ctx.strokeStyle='#d1bea08c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+8,t.y);ctx.lineTo(x+t.w-8,t.y);ctx.stroke();drawCalls++;}
function drawWorld(dt){
 const zoneBgs=[images.vista,images.vistaSky,images.vistaThrone],zoneBg=zoneBgs[currentZone(state.p.x)]||images.vista;
 cover(zoneBg,1.1,-camera*.018);ctx.fillStyle='#1b1e343b';ctx.fillRect(0,0,W,H);
 const shakeX=shake>0?Math.sin(time*70)*shake:0,shakeY=shake>0?Math.cos(time*60)*shake*.5:0;ctx.save();ctx.translate(shakeX,shakeY);shake*=.88;
 for(const t of state.platforms)platform(t);
 const cp=2640-camera;if(cp>-60&&cp<W+60){glow(cp,498,60,'#79edff40');ctx.strokeStyle=state.checkpointSeen?'#a3f6ff':'#bbb2c9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cp-12,555);ctx.lineTo(cp-12,510);ctx.lineTo(cp,480);ctx.lineTo(cp+12,510);ctx.lineTo(cp+12,555);ctx.stroke();diamond(cp,512,9,'#abf4ff');}
 const shr=state.shrine,shx=shr.x-camera;if(shx>-90&&shx<W+90){if(!state.shrineUsed)glow(shx,shr.y-55,80,'#ffd76650');sprite(images.shrine,shx,shr.y,150,false,0);if(!state.shrineUsed){ctx.globalAlpha=.75+Math.sin(time*2)*.25;diamond(shx,shr.y-118,9,'#ffe6a0');ctx.globalAlpha=1;}}
 for(const c of state.pickups){const x=c.x-camera;if(c.taken||x<-40||x>W+40)continue;const y=c.y+(reduceMotion?0:Math.sin(time*2+c.id)*5);glow(x,y,c.seal?36:17,c.seal?'#ffda7055':'#c9efff33');if(c.seal){ctx.save();ctx.translate(x,y);ctx.rotate(reduceMotion?0:time*.28);ctx.strokeStyle='#ffe1a2';ctx.lineWidth=1.6;ctx.strokeRect(-13,-13,26,26);ctx.restore();diamond(x,y,12,'#ffe2a0');}else diamond(x,y,7,'#caeef4');}
 for(const e of state.enemies){if(e.hp<=0||e.x-camera<-100||e.x-camera>W+100)continue;ctx.globalAlpha=(e.hit>0&&e.hit%4<2?.55:1)*(e.type==='wraith'?.85:1);const v=ENEMY_VIS[e.type]||ENEMY_VIS.hound;sprite(images[e.type]||images.hound,e.x-camera,e.y+Math.sin(time*11+e.id)*v.bob,v.h,e.dir<0,Math.sin(time*11)*.025);ctx.globalAlpha=1;}
 const b=state.boss,bx=b.x-camera;
 if(b.hp>0&&bx>-250&&bx<W+250){const charge=b.active&&b.cycle>96&&b.cycle<145;if(charge){glow(bx-15,b.y-130,140,'#dc86fc66');ctx.strokeStyle='#f3b9df';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(bx-35,b.y-2,100,9,0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=b.hit>0&&b.hit%4<2?.55:1;sprite(images.boss,bx,b.y,270,true,charge?-.035:Math.sin(time)*.008);ctx.globalAlpha=1;}
 for(const wave of state.waves){const x=wave.x-camera;glow(x,548,50,'#ed8cdf70');ctx.strokeStyle='#ffd6ee';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-12,567);ctx.lineTo(x,532);ctx.lineTo(x+12,567);ctx.stroke();}
 drawBursts(dt);
 const portal=6180-camera;if(portal>-150&&portal<W+150){const unlocked=state.seals>=3&&b.hp===0;glow(portal,477,110,unlocked?'#8deaff66':'#886fa733');ctx.strokeStyle=unlocked?'#b9f6ff':'#9d84b8';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(portal,480,40,87,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(portal,480,44+i*5,90+i*4,Math.sin(time*.4+i)*.1,0,Math.PI*2);ctx.stroke();}for(let i=0;i<3;i++)diamond(portal-24+i*24,377,5,i<state.seals?'#ffe0a1':'#685876');}
 const p=state.p,x=p.x-camera,bob=reduceMotion?0:p.grounded?Math.sin(time*(p.vx?19:2.2))*(p.vx?2:1):0;
 if(p.attack>0){ctx.save();ctx.translate(x,p.y-40);ctx.scale(p.facing,1);ctx.rotate((14-p.attack)*.075);ctx.rotate(-.5);ctx.shadowBlur=10;ctx.shadowColor='#9ff2ff';ctx.lineCap='round';
  ctx.strokeStyle='#eafcff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(108,0);ctx.stroke();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(108,0);ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle='#2b2f3f';ctx.fillRect(-29,-5,15,10);ctx.strokeStyle='#0a0c14';ctx.lineWidth=1.5;ctx.strokeRect(-29,-5,15,10);
  ctx.restore();}
 if(p.dash>0){for(let i=3;i>0;i--){ctx.globalAlpha=.1+(3-i)*.07;sprite(heroImg(),x-p.facing*i*22,p.y,98,p.facing<0,.05*p.facing);}ctx.globalAlpha=1;}
 ctx.globalAlpha=p.inv>0&&Math.floor(p.inv/5)%2===0?.4:1;sprite(heroImg(),x,p.y+bob,98,p.facing<0,p.grounded?(p.vx?.05*p.facing:0):-.09*p.facing,p.grounded?1:1.02);ctx.globalAlpha=1;
 if(p.attack>0){ctx.save();ctx.translate(x,p.y-40);ctx.scale(p.facing,1);ctx.rotate((14-p.attack)*.075);ctx.strokeStyle='#b8faff';ctx.lineWidth=5;ctx.shadowColor='#63eaff';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(0,0,96,-1.1,1.05);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,85,-.9,.9);ctx.stroke();ctx.restore();}
 if(p.dashCD>0){ctx.fillStyle='#122035';ctx.fillRect(x-18,p.y+13,36,3);ctx.fillStyle='#a3eaff';ctx.fillRect(x-18,p.y+13,36*(1-p.dashCD/65),3);}
 ctx.restore();motes(time);const fog=ctx.createLinearGradient(0,630,0,720);fog.addColorStop(0,'#10152800');fog.addColorStop(1,'#101528bb');ctx.fillStyle=fog;ctx.fillRect(0,630,W,90);
}
function frame(now){const startTime=performance.now();let dt=Math.min(.08,(now-last)/1000||1/60);last=now;time+=dt;frames++;totalFrameTime+=dt;drawCalls=0;
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
 if(screen==='playing'&&networkReady&&!resetting){if(hitstop>0){hitstop--;}else{acc+=dt;let n=0;while(acc>=1/60&&n++<5&&screen==='playing'){advance(input());acc-=1/60;}}}else acc=0;
 const target=Math.max(0,Math.min(6300-W,state.p.x-W*.35));camera+=((screen==='playing'&&!reduceMotion)?Math.min(1,dt*10):1)*(target-camera);
 if(screen==='title')drawTitle();else drawWorld(dt);cpuMs=performance.now()-startTime;
 if(new URLSearchParams(location.search).has('debug')){ctx.fillStyle='#0b112ddd';ctx.fillRect(10,H-53,350,26);ctx.fillStyle='#ccf5ff';ctx.font='11px monospace';ctx.fillText(`${Math.round(frames/totalFrameTime)} FPS · ${drawCalls} draws · CPU ${cpuMs.toFixed(1)}ms · GPU n/a`,18,H-36);}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.runebreaker={get state(){return JSON.parse(JSON.stringify(state))},get screen(){return screen},get metrics(){return{fps:frames/totalFrameTime,drawCalls,cpuMs}},start,pause,resume,route(inputs){for(const a of inputs)if(screen==='playing')advance(a);return this.state;}};
