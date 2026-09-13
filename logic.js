(function(){
const meta = { game: 'ChaosAmin54 save the world', minPlayers: 1, maxPlayers: 1 };
const DT = 1 / 60;
const platforms = [
  [0,570,620], [730,535,310], [1150,490,330], [1590,550,380],
  [2100,505,370], [2580,555,360], [3050,540,350], [3500,570,1120],
  [380,455,150], [830,365,160], [1270,320,160], [1780,380,160],
  [2230,335,160], [2710,385,170], [3160,365,150],
  [4620,570,260], [4830,470,140], [5100,520,160], [5360,450,170], [5620,570,650]
].map(([x,y,w],id)=>({x,y,w,id}));
function setup(players) {
 return { version:1, players:[...players], tick:0, phase:'playing', score:0, seals:0, checkpoint:0, checkpointSeen:false, checkpoint2Seen:false, event:'', eventTick:0,
  p:{x:130,y:570,vx:0,vy:0,hp:5,facing:1,grounded:true,jumps:0,coyote:6,buffer:0,attack:0,attackCD:0,dash:0,dashCD:0,inv:0},
  platforms:platforms.map(p=>({...p})),
  pickups:[{x:930,y:315,seal:true},{x:2320,y:285,seal:true},{x:3250,y:315,seal:true}, ...[320,430,770,860,1200,1370,1670,1840,2150,2400,2650,2820,3110,3350,3650,3800,4870,5140,5400,5680,5950].map((x,i)=>({x,y:(platforms.find(p=>x>=p.x&&x<=p.x+p.w)?.y??540)-75,seal:false}))].map((a,id)=>({...a,id,taken:false})),
  enemies:[{x:500,home:500,y:570,hp:3,dir:1,range:90,type:'chak'},{x:900,home:900,y:535,hp:4,dir:-1,range:110,type:'sentinel'},{x:1270,home:1270,y:490,hp:2,dir:1,range:100,type:'hound'},{x:1740,home:1740,y:550,hp:2,dir:-1,range:140,type:'hound'},{x:1860,home:1860,y:380,hp:2,dir:-1,range:70,type:'clat'},{x:2280,home:2280,y:335,hp:1,dir:1,range:140,type:'wraith'},{x:2760,home:2760,y:555,hp:2,dir:1,range:120,type:'hound'},{x:3150,home:3150,y:540,hp:4,dir:1,range:130,type:'sentinel'},{x:3230,home:3230,y:365,hp:2,dir:1,range:65,type:'spid'},{x:3600,home:3600,y:570,hp:5,dir:-1,range:160,type:'beast'},{x:4750,home:4750,y:570,hp:3,dir:1,range:110,type:'sentinel'},{x:5000,home:5000,y:520,hp:2,dir:-1,range:90,type:'wraith'},{x:5280,home:5280,y:450,hp:2,dir:1,range:100,type:'spid'},{x:5450,home:5450,y:570,hp:4,dir:-1,range:150,type:'beast'},{x:5750,home:5750,y:570,hp:3,dir:1,range:130,type:'sentinel'}].map((e,id)=>({...e,id,hit:0})),
  boss:{x:5940,y:570,hp:16,maxHp:16,active:false,cycle:0,hit:0},waves:[],
  shrine:{x:910,y:365},shrineUsed:false };
}
function validateAction(state, playerId, action) {
 if (!state.players.includes(playerId)) return {ok:false,error:'Spectators cannot control the hero.'};
 if (!action || action.type!=='frames' || !Array.isArray(action.inputs) || action.inputs.length<1 || action.inputs.length>30) return {ok:false,error:'Expected 1–30 input frames.'};
 if (state.phase!=='playing') return {ok:false,error:'The adventure has ended. Start a new journey.'};
 for(const a of action.inputs) {
  if(!a || !Number.isInteger(a.move) || a.move < -1 || a.move > 1 || typeof a.jump!=='boolean' || typeof a.attack!=='boolean' || typeof a.dash!=='boolean' || typeof a.jumpHeld!=='boolean') return {ok:false,error:'Invalid controls.'};
 }
 return {ok:true};
}
function signal(s,name){s.event=name;s.eventTick=s.tick;}
function hurt(s){ const p=s.p;if(p.inv>0||p.dash>0)return;p.hp=Math.max(0,p.hp-1);p.inv=70;signal(s,'hurt');if(p.hp===0)s.phase='lost'; }
function step(s,a){
 if(s.phase!=='playing')return;
 s.tick++; const p=s.p;
 for(const k of ['attack','attackCD','dash','dashCD','inv','buffer'])p[k]=Math.max(0,p[k]-1);
 if(p.grounded){p.coyote=6;p.jumps=0;}else p.coyote=Math.max(0,p.coyote-1);
 if(a.move)p.facing=a.move;
 if(a.jump)p.buffer=7;
 if(p.buffer>0&&(p.grounded||p.coyote>0||p.jumps<2)){
   p.jumps=p.grounded||p.coyote>0?1:p.jumps+1;p.vy=-650;p.grounded=false;p.coyote=0;p.buffer=0;signal(s,'jump');
 }
 if(!a.jumpHeld&&p.vy<-260)p.vy=-260;
 if(a.dash&&p.dashCD===0){p.dash=10;p.dashCD=65;signal(s,'dash');}
 if(a.attack&&p.attackCD===0){p.attack=14;p.attackCD=23;signal(s,'slash');
  for(const e of s.enemies)if(e.hp>0&&Math.abs(e.y-p.y)<105&&Math.abs(e.x-p.x)<118&&(e.x-p.x)*p.facing>-24){e.hp--;e.hit=18;if(e.hp===0)s.score+=100;signal(s,'hit');}
  const b=s.boss;if(b.hp>0&&Math.abs(b.x-p.x)<155&&Math.abs(b.y-p.y)<160&&(b.x-p.x)*p.facing>-45){b.hp--;b.hit=18;signal(s,'hit');if(b.hp===0){s.score+=1000;s.waves=[];signal(s,'bossdown');}}
 }
 p.vx=p.dash>0?p.facing*700:a.move*270;
 p.x=Math.max(24,Math.min(6250,p.x+p.vx*DT));
 const oldY=p.y;
 if(p.dash>0)p.vy=0;else p.vy=Math.min(1000,p.vy+1700*DT);
 p.y+=p.vy*DT;p.grounded=false;
 for(const t of s.platforms)if(p.x+16>t.x&&p.x-16<t.x+t.w&&oldY<=t.y+2&&p.y>=t.y&&p.vy>=0){p.y=t.y;p.vy=0;p.grounded=true;break;}
 if(p.y>820){p.inv=0;hurt(s);if(s.phase==='playing'){p.x=s.checkpoint||130;p.y=s.checkpoint?555:570;p.vy=0;p.jumps=0;p.grounded=true;p.inv=90;signal(s,'fall');}}
 for(const c of s.pickups)if(!c.taken&&Math.abs(c.x-p.x)<42&&Math.abs(c.y-(p.y-43))<62){c.taken=true;if(c.seal){s.seals++;s.score+=250;signal(s,'seal');}else{s.score+=25;signal(s,'rune');}}
 if(!s.shrineUsed&&Math.abs(s.shrine.x-p.x)<48&&Math.abs(s.shrine.y-p.y)<50){s.shrineUsed=true;p.hp=5;p.inv=150;signal(s,'shrine');}
 if(p.x>2600&&!s.checkpointSeen){s.checkpointSeen=true;s.checkpoint=2640;p.hp=5;signal(s,'checkpoint');}
 if(p.x>4650&&!s.checkpoint2Seen){s.checkpoint2Seen=true;s.checkpoint=4650;p.hp=5;signal(s,'checkpoint');}
 for(const e of s.enemies){e.hit=Math.max(0,e.hit-1);if(e.hp<=0)continue;e.x+=e.dir*(e.type==='wraith'?95:55)*DT;if(e.x>e.home+e.range)e.dir=-1;if(e.x<e.home-e.range)e.dir=1;if(Math.abs(e.x-p.x)<40&&Math.abs(e.y-p.y)<64)hurt(s);}
 const b=s.boss;b.hit=Math.max(0,b.hit-1);
 if(b.hp>0&&p.x>5550)b.active=true;
 if(b.active&&b.hp>0){b.cycle=(b.cycle+1)%180;if(b.cycle===145){s.waves.push({x:b.x-70,y:570,dir:-1,life:160});signal(s,'slam');}if(Math.abs(b.x-p.x)<60&&Math.abs(b.y-p.y)<125)hurt(s);}
 for(const w of s.waves){w.x+=w.dir*330*DT;w.life--;if(Math.abs(w.x-p.x)<35&&p.y>525)hurt(s);}
 s.waves=s.waves.filter(w=>w.life>0);
 if(p.x>6150&&b.hp===0&&s.seals>=3){s.phase='won';signal(s,'win');}
}
function applyAction(state,playerId,action){
 const s={...state,p:{...state.p},boss:{...state.boss},enemies:state.enemies.map(e=>({...e})),pickups:state.pickups.map(c=>({...c})),waves:state.waves.map(w=>({...w}))};
 for(const a of action.inputs)step(s,a);
 return s;
}
function isGameOver(state){return state.phase==='playing'?{over:false}:{over:true,winner:state.phase==='won'?state.players[0]:null};}
function viewFor(state,playerId){return {...state,you:playerId,canPlay:state.players.includes(playerId)};}

window.ChaosAmin54 = { meta, setup, validateAction, applyAction, isGameOver, viewFor };
})();
