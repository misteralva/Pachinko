/* ============================================================
   Dragon Fortune Pachinko – script.js  v3
   Dense pins · V-ZONE · Tulip · REACH · FEVER
   + Particles · Trails · Credits · Music · Stats · Game Over
   ============================================================ */
(function () {
  'use strict';

  const { Engine, Render, Runner, Bodies, Body, World, Events } = Matter;

  /* ══════════════════════════════════════════════════════════
     CONSTANTS
  ══════════════════════════════════════════════════════════ */
  const REEL_SYM    = ['🐉','💰','🌸','🎱','⭐','🔔','💎','🍀'];
  const CUP_COUNT   = 9;
  const ZONE_SCORES = [3, 6, 15, 50, 100, 50, 15, 6, 3];
  const ZONE_LABELS = ['3','6','15','50','★100','50','15','6','3'];
  const DIFFS = ['EASY','NORMAL','HARD'];
  const DIFF_CFG = {
    EASY:   { restitution:.70, friction:.0, frictionAir:.0012, gravity:.68, pegSpacingH:38, pegSpacingV:33, pegRestitution:.58, vzoneW:44, gateR:15, tulipR:17, launchSpread:.40 },
    NORMAL: { restitution:.58, friction:.001, frictionAir:.003, gravity:1.02, pegSpacingH:33, pegSpacingV:28, pegRestitution:.72, vzoneW:32, gateR:11, tulipR:13, launchSpread:.60 },
    HARD:   { restitution:.44, friction:.003, frictionAir:.006, gravity:1.38, pegSpacingH:27, pegSpacingV:23, pegRestitution:.88, vzoneW:22, gateR:8, tulipR:9, launchSpread:.75 },
  };
  const MODE = { NORMAL:'NORMAL', CHANCE:'CHANCE', REACH:'REACH', FEVER:'FEVER', BONUS:'BONUS' };
  const TRAIL_LEN = 12;   // positions kept per ball
  const CREDITS_PER_COIN = 10;  // balls per credit

  /* ══════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════ */
  let score=0, highScore=0, balls=0, credits=0, multiplier=1;
  let gameMode=MODE.NORMAL, diffIdx=0;
  let gravityLow=false, soundOn=true, circuitOn=true;
  let circuitBodies=[];

  // Reel state
  let reelValues=[0,0,0], reelSpinning=false;

  // Tulip gate
  let tulipOpen=false, tulipTimer=null, gateL=null, gateR=null;

  // Fever
  let feverInterval=null, feverAutoInt=null, feverSeconds=0, feverBalls=0;

  // Bonus
  let bonusLeft=0;

  // Power meter
  let powerHeld=false, powerVal=0, powerInt=null;

  // Auto mode
  let autoInt=null;

  // Physics
  let engine, render, runner;
  let activeBalls=[], dropLock=false, oscBody=null, oscPhase=0;
  let CW=400, CH=560;
  const WALL=14;
  let POS={};
  const processed = new WeakMap();

  // Particles
  let particles=[];

  // Ball trails: Map<ball, [{x,y}]>
  let trails = new WeakMap();

  // Music
  let musicCtx=null, musicNodes=[], musicOn=false, musicInterval=null;

  // Stats
  let stats = { shots:0, vzoneHits:0, gateHits:0, tulipHits:0, jackpots:0, bonuses:0, startTime:0, lastPts:0 };

  // Coin / attract
  let gameStarted=false;

  // Leaderboard (localStorage)
  const LB_KEY = 'df_pachinko_lb';
  function loadLB() { try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch(e){ return []; } }
  function saveLB(entries) { try { localStorage.setItem(LB_KEY, JSON.stringify(entries)); } catch(e){} }

  /* ══════════════════════════════════════════════════════════
     DOM
  ══════════════════════════════════════════════════════════ */
  const $ = id => document.getElementById(id);
  const container    = $('game-canvas-container');
  const popupEl      = $('score-popup');
  const reelResEl    = $('reel-result');
  const diffFaceEl   = $('diff-face');
  const zoneFlashEl  = $('zone-flash');
  const mgOverlay    = $('minigame-overlay');
  const mgTitleEl    = $('mg-title');
  const mgSubEl      = $('mg-sub');
  const feverOvEl    = $('fever-overlay');
  const reachOvEl    = $('reach-overlay');
  const feverBoxEl   = $('fever-box');
  const feverTimerEl = $('fever-timer');
  const powerFillEl  = $('power-fill');

  const DISP = {
    balls:   ['disp-balls','arch-balls','side-balls'],
    score:   ['disp-score','arch-score','side-score'],
    high:    ['disp-high','side-high'],
    mult:    ['disp-mult','side-mult'],
    mode:    ['side-mode'],
    credits: ['disp-credits','side-credits'],
  };
  const ML = { normal:$('ml-normal'), chance:$('ml-chance'), reach:$('ml-reach'), fever:$('ml-fever') };

  /* ══════════════════════════════════════════════════════════
     DISPLAY
  ══════════════════════════════════════════════════════════ */
  function updateDisplay() {
    const set=(ids,v)=>ids.forEach(id=>{const e=$(id);if(e)e.textContent=v;});
    set(DISP.balls,   balls);
    set(DISP.score,   score.toLocaleString());
    set(DISP.high,    highScore.toLocaleString());
    set(DISP.mult,    '×'+multiplier);
    set(DISP.mode,    gameMode);
    set(DISP.credits, credits+' ¥');
    if(diffFaceEl) diffFaceEl.textContent=DIFFS[diffIdx]+'\n難易';
    Object.values(ML).forEach(el=>{if(el)el.classList.remove('active','active-fever');});
    const k=gameMode.toLowerCase();
    if(ML[k]) ML[k].classList.add(gameMode===MODE.FEVER?'active-fever':'active');
    else if(ML.normal) ML.normal.classList.add('active');
    // Stats panel
    updateStatsDisplay();
  }

  function updateStatsDisplay() {
    const elapsed = stats.startTime ? Math.floor((Date.now()-stats.startTime)/1000) : 0;
    const m=Math.floor(elapsed/60), s=elapsed%60;
    const acc = stats.shots>0 ? Math.round(((stats.vzoneHits+stats.gateHits+stats.tulipHits)/stats.shots)*100) : 0;
    const map={
      'stat-shots':     stats.shots,
      'stat-vzones':    stats.vzoneHits,
      'stat-gates':     stats.gateHits,
      'stat-tulips':    stats.tulipHits,
      'stat-jackpots':  stats.jackpots,
      'stat-bonuses':   stats.bonuses,
      'stat-acc':       acc+'%',
      'stat-time':      (m?m+'m ':'')+(s+'s'),
    };
    Object.entries(map).forEach(([id,v])=>{const e=$(id);if(e)e.textContent=v;});
  }

  let popT;
  function showPopup(txt,big=false,color){
    if(!popupEl)return;
    popupEl.textContent=txt;
    popupEl.style.fontSize=big?'1.5rem':'1.1rem';
    popupEl.style.color=color||(big?'#fff':'#ffcc00');
    popupEl.classList.remove('show');
    void popupEl.offsetWidth;
    popupEl.classList.add('show');
    clearTimeout(popT);
    popT=setTimeout(()=>popupEl.classList.remove('show'),950);
  }

  function flashZone(type){
    if(!zoneFlashEl)return;
    zoneFlashEl.className='zone-flash '+type;
    setTimeout(()=>{if(zoneFlashEl)zoneFlashEl.className='zone-flash';},650);
  }

  function showMG(title,sub,dur=1800){
    if(!mgOverlay)return;
    if(mgTitleEl)mgTitleEl.textContent=title;
    if(mgSubEl)mgSubEl.textContent=sub;
    mgOverlay.classList.add('show');
    mgOverlay.removeAttribute('aria-hidden');
    clearTimeout(showMG._t);
    showMG._t=setTimeout(()=>{mgOverlay.classList.remove('show');mgOverlay.setAttribute('aria-hidden','true');},dur);
  }

  function cameraShake(intensity=8, duration=400) {
    const cabinet = document.querySelector('.cabinet');
    if (!cabinet) return;
    const start = Date.now();
    const tick = () => {
      const t = Date.now() - start;
      if (t > duration) { cabinet.style.transform = ''; return; }
      const decay = 1 - t / duration;
      const dx = (Math.random()-0.5)*intensity*decay;
      const dy = (Math.random()-0.5)*intensity*decay;
      cabinet.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ══════════════════════════════════════════════════════════
     AUDIO
  ══════════════════════════════════════════════════════════ */
  let actx=null;
  function ac(){return actx||(actx=new(window.AudioContext||window.webkitAudioContext)());}

  function tone(freq,type='sine',dur=0.12,vol=0.14){
    if(!soundOn)return;
    try{
      const ctx=ac(),o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type=type;o.frequency.value=freq;
      g.gain.setValueAtTime(vol,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
      o.start();o.stop(ctx.currentTime+dur);
    }catch(e){}
  }

  const SND={
    drop:   p=>tone(500+p*500,'sine',.09,.18),
    peg:    ()=>tone(450+Math.random()*350,'triangle',.04,.07),
    bumper: ()=>tone(700+Math.random()*200,'square',.06,.10),
    score:  pts=>tone(280+Math.min(pts,120)*1.5,'square',.18,.13),
    gate:   ()=>tone(900,'sine',.18,.18),
    bonus:  ()=>[440,550,660,550,660,880].forEach((f,i)=>setTimeout(()=>tone(f,'sine',.15,.15),i*65)),
    jackpot:()=>[330,440,550,660,880,1100,1320].forEach((f,i)=>setTimeout(()=>tone(f,'sine',.3,.22),i*70)),
    fever:  ()=>[180,260,330,440,660,880].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',.2,.18),i*55)),
    spin:   ()=>tone(250,'sawtooth',.05,.07),
    click:  ()=>tone(660,'sine',.05,.10),
    coin:   ()=>{tone(1200,'sine',.04,.2);setTimeout(()=>tone(900,'sine',.06,.18),70);setTimeout(()=>tone(650,'triangle',.1,.14),140);},
    gameover:()=>[440,330,220,165].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',.35,.18),i*200)),
    credit: ()=>{tone(800,'sine',.05,.15);setTimeout(()=>tone(1000,'sine',.05,.15),80);setTimeout(()=>tone(1200,'sine',.1,.15),160);},
  };

  /* ── Procedural arcade music ── */
  function startMusic(){
    if(musicOn||!soundOn)return;
    musicOn=true;
    const ctx=ac();
    // Simple 4/4 drum pattern + bassline
    const BPM=138, BAR=60/BPM*4;
    let t=ctx.currentTime+0.05;
    function scheduleBar(){
      if(!musicOn)return;
      // Kick on 1,3
      [0, BAR*0.5].forEach(o=>{
        const b=ctx.createOscillator(),g=ctx.createGain();
        b.connect(g);g.connect(ctx.destination);
        b.frequency.setValueAtTime(180,t+o);
        b.frequency.exponentialRampToValueAtTime(40,t+o+0.12);
        g.gain.setValueAtTime(0.28,t+o);
        g.gain.exponentialRampToValueAtTime(0.001,t+o+0.18);
        b.start(t+o);b.stop(t+o+0.2);
      });
      // Hi-hat 8ths
      for(let i=0;i<8;i++){
        const buf=ctx.createBuffer(1,ctx.sampleRate*0.05,ctx.sampleRate);
        const d=buf.getChannelData(0);
        for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1);
        const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
        f.type='highpass';f.frequency.value=8000;
        s.buffer=buf;s.connect(f);f.connect(g);g.connect(ctx.destination);
        g.gain.setValueAtTime(i%2===0?.08:.04,t+i*BAR/8);
        g.gain.exponentialRampToValueAtTime(0.001,t+i*BAR/8+0.05);
        s.start(t+i*BAR/8);
      }
      // Bass melody (pentatonic)
      const bassNotes=[55,55,73,55,55,82,73,55];
      bassNotes.forEach((freq,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.type='sawtooth';o.frequency.value=freq;
        g.gain.setValueAtTime(0.09,t+i*BAR/8);
        g.gain.exponentialRampToValueAtTime(0.001,t+i*BAR/8+0.1);
        o.start(t+i*BAR/8);o.stop(t+i*BAR/8+0.12);
      });
      t+=BAR;
      musicInterval=setTimeout(scheduleBar,(BAR-0.1)*1000);
    }
    scheduleBar();
  }
  function stopMusic(){ musicOn=false; clearTimeout(musicInterval); }

  /* ══════════════════════════════════════════════════════════
     PARTICLES
  ══════════════════════════════════════════════════════════ */
  function spawnParticles(x, y, color, count=12, big=false){
    for(let i=0;i<count;i++){
      const angle=Math.random()*Math.PI*2;
      const spd=(big?3:1.5)+Math.random()*(big?5:3);
      particles.push({
        x, y,
        vx: Math.cos(angle)*spd,
        vy: Math.sin(angle)*spd - (big?2:1),
        life: 1,
        decay: 0.025+Math.random()*0.035,
        r: (big?5:2)+Math.random()*(big?6:3),
        color,
        shape: Math.random()>0.5 ? 'circle' : 'star',
      });
    }
  }

  function updateParticles(){
    particles = particles.filter(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.12;
      p.life-=p.decay; p.vx*=0.97; p.vy*=0.97;
      return p.life>0;
    });
  }

  function drawParticles(ctx){
    particles.forEach(p=>{
      ctx.save();
      ctx.globalAlpha=p.life;
      ctx.fillStyle=p.color;
      ctx.shadowColor=p.color;
      ctx.shadowBlur=p.r*2;
      ctx.beginPath();
      if(p.shape==='star'){
        drawStar(ctx,p.x,p.y,p.r*0.5,p.r,5);
      } else {
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      }
      ctx.fill();
      ctx.restore();
    });
  }

  function drawStar(ctx,cx,cy,ir,or,pts){
    ctx.moveTo(cx,cy-or);
    for(let i=0;i<pts*2;i++){
      const r=i%2===0?or:ir;
      const a=(i*Math.PI)/pts;
      ctx.lineTo(cx+Math.sin(a)*r, cy-Math.cos(a)*r);
    }
    ctx.closePath();
  }

  /* ══════════════════════════════════════════════════════════
     BALL TRAILS
  ══════════════════════════════════════════════════════════ */
  function updateTrails(){
    activeBalls.forEach(ball=>{
      if(!ball||!ball.position)return;
      let trail=trails.get(ball);
      if(!trail){ trail=[]; trails.set(ball,trail); }
      trail.push({x:ball.position.x, y:ball.position.y});
      if(trail.length>TRAIL_LEN) trail.shift();
    });
  }

  function drawTrails(ctx){
    activeBalls.forEach(ball=>{
      const trail=trails.get(ball);
      if(!trail||trail.length<2)return;
      const ballColor=ball.render&&ball.render.fillStyle?ball.render.fillStyle:'#ffaa00';
      for(let i=1;i<trail.length;i++){
        const t=i/trail.length;
        ctx.beginPath();
        ctx.moveTo(trail[i-1].x,trail[i-1].y);
        ctx.lineTo(trail[i].x,trail[i].y);
        ctx.strokeStyle=ballColor;
        ctx.globalAlpha=t*0.55;
        ctx.lineWidth=3*(1-t)+1;
        ctx.shadowColor=ballColor;
        ctx.shadowBlur=6*t;
        ctx.stroke();
      }
      ctx.globalAlpha=1;
      ctx.shadowBlur=0;
    });
  }

  /* ══════════════════════════════════════════════════════════
     SLOT REELS
  ══════════════════════════════════════════════════════════ */
  function spinReels(opts={}){
    if(reelSpinning&&!opts.force)return;
    reelSpinning=true;
    reelResEl.className='reel-result-bar';
    reelResEl.textContent='SPINNING…';
    const durs=opts.fast?[200,340,480]:[520,720,980];
    const fixed=opts.fix||[false,false,false];
    const itvs=[0,1,2].map(i=>{
      if(fixed[i])return null;
      const el=$('reel-'+i);
      if(el)el.classList.add('spinning');
      return setInterval(()=>{
        reelValues[i]=(reelValues[i]+1)%REEL_SYM.length;
        const inner=el&&el.querySelector('.reel-inner');
        if(inner)inner.textContent=REEL_SYM[reelValues[i]];
        SND.spin();
      },58+i*14);
    });
    [0,1,2].forEach(i=>{
      if(fixed[i])return;
      setTimeout(()=>{
        clearInterval(itvs[i]);
        const el=$('reel-'+i);
        if(el){el.classList.remove('spinning');const inner=el.querySelector('.reel-inner');if(inner)inner.textContent=REEL_SYM[reelValues[i]];}
      },durs[i]);
    });
    setTimeout(()=>{reelSpinning=false;evalReels(opts);if(opts.onDone)opts.onDone();},durs[2]+120);
  }

  function evalReels(opts={}){
    const[a,b,c]=reelValues;
    reelResEl.className='reel-result-bar';
    if(a===b&&b===c){
      reelResEl.classList.add('jackpot');
      reelResEl.textContent='🎰 JACKPOT ×5 🎰';
      SND.jackpot();
      stats.jackpots++;
      setTimeout(triggerFever,900);
    } else if((a===b||b===c)&&!opts.isReach){
      reelResEl.classList.add('reach');
      reelResEl.textContent='⚡ REACH! LAST CHANCE…';
      triggerReach(a,b,c);
    } else if(a===b||b===c||a===c){
      reelResEl.classList.add('bonus');
      reelResEl.textContent='⭐ BONUS ×2 ⭐';
      SND.bonus();
      stats.bonuses++;
      applyBonus(2,8);
    } else {
      reelResEl.textContent='— NO PRIZE —';
      if(gameMode!==MODE.FEVER)setMode(MODE.NORMAL);
    }
  }

  function triggerReach(a,b,c){
    setMode(MODE.REACH);
    if(reachOvEl){reachOvEl.classList.add('show');reachOvEl.removeAttribute('aria-hidden');}
    setTimeout(()=>{
      if(reachOvEl){reachOvEl.classList.remove('show');reachOvEl.setAttribute('aria-hidden','true');}
      const win=Math.random()<0.42;
      if(win){
        const sym=(a===b)?a:b;
        reelValues[2]=sym;
        const el=$('reel-2');
        if(el)el.querySelector('.reel-inner').textContent=REEL_SYM[sym];
        spinReels({fix:[true,true,false],isReach:true,fast:true});
      } else {
        let v;do{v=Math.floor(Math.random()*REEL_SYM.length);}while(v===reelValues[1]);
        reelValues[2]=v;
        const el=$('reel-2');
        if(el)el.querySelector('.reel-inner').textContent=REEL_SYM[v];
        reelResEl.className='reel-result-bar';
        reelResEl.textContent='— MISS —';
        setMode(MODE.NORMAL);
      }
    },2400);
  }

  /* ══════════════════════════════════════════════════════════
     GAME MODES
  ══════════════════════════════════════════════════════════ */
  function setMode(m){gameMode=m;updateDisplay();}

  function applyBonus(mult=2,ballCount=8){
    multiplier=Math.max(multiplier,mult);
    bonusLeft=ballCount;
    setMode(MODE.BONUS);
    showPopup('BONUS ×'+mult+' · '+ballCount+' bolas!',true,'#00ffcc');
    SND.bonus();
  }

  function triggerFever(){
    clearFeverState();
    setMode(MODE.FEVER);
    multiplier=5; feverBalls=20; feverSeconds=30;
    balls+=20;
    updateDisplay();
    if(feverOvEl){feverOvEl.classList.add('active');feverOvEl.removeAttribute('aria-hidden');}
    if(feverBoxEl){feverBoxEl.style.display='flex';}
    if(feverTimerEl)feverTimerEl.textContent=feverSeconds;
    showMG('🔥 FEVER MODE! 🔥','大当たり · ×5 MULTIPLIER · 20 BOLAS',2600);
    SND.fever();
    cameraShake(12, 600);
    feverInterval=setInterval(()=>{
      feverSeconds--;
      if(feverTimerEl)feverTimerEl.textContent=feverSeconds;
      if(feverSeconds<=0)endFever();
    },1000);
    feverAutoInt=setInterval(()=>{
      if(feverBalls>0&&balls>0){feverBalls--;launchBall(true);}
      else clearInterval(feverAutoInt);
    },480);
  }

  function clearFeverState(){
    clearInterval(feverInterval);clearInterval(feverAutoInt);
    feverInterval=null;feverAutoInt=null;
  }

  function endFever(){
    clearFeverState();
    setMode(MODE.NORMAL); multiplier=1;
    if(feverOvEl){feverOvEl.classList.remove('active');feverOvEl.setAttribute('aria-hidden','true');}
    if(feverBoxEl)feverBoxEl.style.display='none';
    showPopup('FEVER END!',true,'#ff8080');
    updateDisplay();
  }

  /* ══════════════════════════════════════════════════════════
     SPECIAL ZONE TRIGGERS
  ══════════════════════════════════════════════════════════ */
  function onVZone(ball){
    stats.vzoneHits++;
    const bx=ball.position.x, by=ball.position.y;
    removeBall(ball);
    flashZone('vzone');
    spawnParticles(bx,by,'#ffd700',20,true);
    spawnParticles(bx,by,'#ff8800',14,false);
    showMG('★ V-ZONE HIT! ★','SPINNING REELS… · チャンス',1700);
    SND.gate();
    setMode(MODE.CHANCE);
    setTimeout(()=>spinReels({}),600);
  }

  function onGate(ball){
    stats.gateHits++;
    const bx=ball.position.x, by=ball.position.y;
    removeBall(ball);
    flashZone('gate');
    spawnParticles(bx,by,'#00cfff',16,false);
    SND.gate();
    const pts=(35+(Math.random()*25|0))*multiplier;
    addScore(pts);
    showPopup('+'+pts+' GATE!',false,'#00cfff');
    openTulip();
    showMG('⬡ GATE POCKET ⬡','+'+pts+' pts · TULIP OPEN 5s!',1400);
  }

  function onTulip(ball){
    if(!tulipOpen)return false;
    stats.tulipHits++;
    const bx=ball.position.x, by=ball.position.y;
    removeBall(ball);
    flashZone('tulip');
    spawnParticles(bx,by,'#00ff88',18,true);
    spawnParticles(bx,by,'#ffcc00',10,false);
    SND.bonus();
    balls+=5;
    applyBonus(2,10);
    updateDisplay();
    showMG('🌸 TULIP CATCH! 🌸','+5 BOLAS · ×2 BONUS · 10 tiros',1500);
    return true;
  }

  function onBumper(ball){
    SND.bumper();
    const pts=(10+(Math.random()*20|0))*multiplier;
    addScore(pts);
    showPopup('+'+pts,false,'#ff8040');
    spawnParticles(ball.position.x,ball.position.y,'#ff6000',6,false);
  }

  function onCup(ball,idx){
    const bx=ball.position.x, by=ball.position.y;
    removeBall(ball);
    let pts=ZONE_SCORES[idx]*multiplier;
    addScore(pts);
    showPopup('+'+pts,pts>=50);
    SND.score(pts);
    const col=pts>=100?'#ffd700':pts>=50?'#ff8800':'#ffffff';
    spawnParticles(bx,by,col,pts>=50?16:8,pts>=100);
    if(pts>=100) cameraShake(10,500);
    if(gameMode===MODE.BONUS&&bonusLeft>0){
      bonusLeft--;
      if(bonusLeft<=0){multiplier=1;setMode(MODE.NORMAL);}
    }
    // Check game over after each cup
    checkGameOver();
  }

  /* ══════════════════════════════════════════════════════════
     TULIP GATE
  ══════════════════════════════════════════════════════════ */
  function openTulip(){
    tulipOpen=true;
    clearTimeout(tulipTimer);
    if(gateL)Body.setPosition(gateL,{x:POS.tulip.x-50,y:POS.tulip.y});
    if(gateR)Body.setPosition(gateR,{x:POS.tulip.x+50,y:POS.tulip.y});
    showPopup('🌸 TULIP OPEN!',false,'#00ff88');
    tulipTimer=setTimeout(closeTulip,5000);
  }

  function closeTulip(){
    tulipOpen=false;
    if(gateL)Body.setPosition(gateL,{x:POS.tulip.x-24,y:POS.tulip.y});
    if(gateR)Body.setPosition(gateR,{x:POS.tulip.x+24,y:POS.tulip.y});
  }

  /* ══════════════════════════════════════════════════════════
     SCORE + GAME OVER
  ══════════════════════════════════════════════════════════ */
  function addScore(pts){
    score+=pts;
    stats.lastPts=pts;
    if(score>highScore)highScore=score;
    updateDisplay();
  }

  function checkGameOver(){
    // Game over when no balls left AND no active balls in field
    if(balls<=0&&activeBalls.length===0&&gameMode!==MODE.FEVER){
      // Wait a moment for any pending balls
      setTimeout(()=>{
        if(balls<=0&&activeBalls.length===0&&gameMode!==MODE.FEVER){
          if(credits>0){
            // Auto-load next credit
            balls=CREDITS_PER_COIN;
            credits--;
            updateDisplay();
            showPopup('CRÉDITO CARGADO!',true,'#00ff88');
            SND.credit();
          } else {
            triggerGameOver();
          }
        }
      },1800);
    }
  }

  function triggerGameOver(){
    SND.gameover();
    stopMusic();
    clearFeverState();
    clearInterval(autoInt); autoInt=null;

    // Save to leaderboard
    const lb=loadLB();
    const elapsed=Math.floor((Date.now()-stats.startTime)/1000);
    lb.push({
      score,
      date:new Date().toLocaleDateString('es-ES'),
      shots:stats.shots,
      jackpots:stats.jackpots,
      time:elapsed,
    });
    lb.sort((a,b)=>b.score-a.score);
    lb.splice(5);
    saveLB(lb);

    showGameOverScreen(score,lb,elapsed);
  }

  function showGameOverScreen(finalScore,lb,elapsed){
    const screen=$('gameover-screen');
    if(!screen)return;

    // Fill score
    const sc=$('go-score');if(sc)sc.textContent=finalScore.toLocaleString();
    const hi=$('go-high');if(hi)hi.textContent=highScore.toLocaleString();
    const sh=$('go-shots');if(sh)sh.textContent=stats.shots;
    const jk=$('go-jackpots');if(jk)jk.textContent=stats.jackpots;
    const m=Math.floor(elapsed/60),s=elapsed%60;
    const ti=$('go-time');if(ti)ti.textContent=(m?m+'m ':'')+s+'s';
    const acc=stats.shots>0?Math.round(((stats.vzoneHits+stats.gateHits+stats.tulipHits)/stats.shots)*100):0;
    const ac2=$('go-acc');if(ac2)ac2.textContent=acc+'%';

    // Fill leaderboard
    const lbEl=$('go-lb');
    if(lbEl){
      lbEl.innerHTML=lb.map((e,i)=>`
        <div class="go-lb-row ${e.score===finalScore&&i===lb.findIndex(x=>x.score===finalScore)?'go-lb-you':''}">
          <span class="go-lb-rank">${['🥇','🥈','🥉','4°','5°'][i]||'—'}</span>
          <span class="go-lb-pts">${e.score.toLocaleString()}</span>
          <span class="go-lb-date">${e.date}</span>
        </div>
      `).join('');
    }

    screen.style.display='flex';
    screen.classList.remove('go-hidden');
    requestAnimationFrame(()=>screen.classList.add('go-visible'));

    // Burst particles (CSS)
    screen.classList.add('go-burst');
    setTimeout(()=>screen.classList.remove('go-burst'),1000);
  }

  /* ══════════════════════════════════════════════════════════
     CREDIT SYSTEM
  ══════════════════════════════════════════════════════════ */
  function insertCredit(){
    credits++;
    SND.credit();
    if(balls===0){
      balls=CREDITS_PER_COIN;
      credits--;
    }
    showPopup('CRÉDITO +1 · '+credits+' restantes',false,'#00ff88');
    updateDisplay();
  }

  function removeBall(ball){
    setTimeout(()=>{
      World.remove(engine.world,ball);
      activeBalls=activeBalls.filter(b=>b!==ball);
      checkGameOver();
    },120);
  }

  /* ══════════════════════════════════════════════════════════
     MATTER.JS WORLD
  ══════════════════════════════════════════════════════════ */
  function getSize(){
    const r=container.getBoundingClientRect();
    return{w:Math.max(r.width||380,200),h:Math.max(r.height||480,320)};
  }

  function buildWorld(){
    particles=[];
    const{w,h}=getSize();
    CW=w;CH=h;
    circuitBodies=[];

    engine=Engine.create();
    engine.gravity.y=gravityLow?0.38:DIFF_CFG[DIFFS[diffIdx]].gravity;

    render=Render.create({
      element:container,engine,
      options:{width:w,height:h,wireframes:false,background:'transparent',pixelRatio:Math.min(window.devicePixelRatio||1,2)},
    });

    // Walls
    const wOpts={isStatic:true,render:{fillStyle:'rgba(60,30,5,.8)'}};
    World.add(engine.world,[
      Bodies.rectangle(WALL/2,h/2,WALL,h,wOpts),
      Bodies.rectangle(w-WALL/2,h/2,WALL,h,wOpts),
      Bodies.rectangle(w/2,h+WALL/2,w,WALL,{isStatic:true,render:{fillStyle:'#050c08'}}),
    ]);

    POS.vzone ={x:w*0.5, y:h*0.50};
    POS.gatel ={x:w*0.26,y:h*0.38};
    POS.gater ={x:w*0.74,y:h*0.38};
    POS.tulip ={x:w*0.5, y:h*0.68};

    addPins(w,h);
    addDeflectors(w,h);
    addBumpers(w,h);
    addSpecialZones(w,h);
    addCups(w,h);
    addOscillator(w,h);

    // Physics loop
    Events.on(engine,'beforeUpdate',()=>{
      // Oscillator
      oscPhase+=0.022;
      if(oscBody) Body.setPosition(oscBody,{x:CW*0.5+Math.sin(oscPhase)*CW*0.20,y:oscBody.position.y});

      // Update trails
      updateTrails();
      updateParticles();

      // Anti-stuck (every tick)
      const now=Date.now();
      activeBalls=activeBalls.filter(ball=>{
        if(!ball||!ball.position)return false;
        if(ball.position.y>CH+60||ball.position.x<-60||ball.position.x>CW+60){
          World.remove(engine.world,ball);return false;
        }
        const age=now-(ball._born||now);
        if(age>10000){
          addScore(ZONE_SCORES[4]*multiplier);
          showPopup('⏱ +'+ZONE_SCORES[4]*multiplier,false,'#aaa');
          World.remove(engine.world,ball);return false;
        }
        const vx=ball.velocity.x,vy=ball.velocity.y;
        const spd=Math.sqrt(vx*vx+vy*vy);
        // Force minimum downward velocity
        if(vy<1.2&&ball.position.y>50){
          Body.setVelocity(ball,{x:vx*0.95+(Math.random()-0.5)*0.4,y:Math.max(vy,1.8+Math.random()*0.8)});
        }
        // Stuck timer
        if(spd<1.5){
          if(!ball._stuckSince)ball._stuckSince=now;
          const ms=now-ball._stuckSince;
          if(ms>180) Body.setVelocity(ball,{x:(Math.random()-0.5)*6,y:5+Math.random()*4});
          if(ms>500){Body.setPosition(ball,{x:ball.position.x+(Math.random()-0.5)*8,y:ball.position.y+15});Body.setVelocity(ball,{x:(Math.random()-0.5)*8,y:8+Math.random()*5});ball._stuckSince=null;}
          if(ms>900){Body.setPosition(ball,{x:WALL+20+Math.random()*(CW-WALL*2-40),y:CH-140});Body.setVelocity(ball,{x:(Math.random()-0.5)*3,y:6});ball._stuckSince=null;}
        } else {ball._stuckSince=null;}
        return true;
      });
    });

    Events.on(engine,'collisionStart',handleCollisions);
    Events.on(render,'afterRender',drawCanvas);

    Render.run(render);
    runner=Runner.create();
    Runner.run(runner,engine);
    updateDisplay();

    if(soundOn && !musicOn) startMusic();
  }

  /* ── Pins ── */
  function addPins(w,h){
    const cfg=DIFF_CFG[DIFFS[diffIdx]];
    const PIN_R=4, BALL_R=8, MIN_GAP=BALL_R*2+6;
    const H_SPACE=Math.max(cfg.pegSpacingH,MIN_GAP+PIN_R*2);
    const V_SPACE=cfg.pegSpacingV;
    const TOP_Y=72,BOT_Y=h-108,LEFT_X=WALL+10,RIGHT_X=w-WALL-10;
    const ROWS=Math.floor((BOT_Y-TOP_Y)/V_SPACE);
    for(let row=0;row<ROWS;row++){
      const y=TOP_Y+row*V_SPACE;
      const offset=(row%2===1)?H_SPACE/2:0;
      const count=Math.floor((RIGHT_X-LEFT_X-offset)/H_SPACE)+1;
      for(let col=0;col<count;col++){
        const x=LEFT_X+offset+col*H_SPACE;
        if(x<LEFT_X+PIN_R||x>RIGHT_X-PIN_R)continue;
        const tooClose=Object.values(POS).some(p=>Math.hypot(x-p.x,y-p.y)<36);
        if(tooClose)continue;
        World.add(engine.world,Bodies.circle(x,y,PIN_R,{
          isStatic:true,restitution:cfg.pegRestitution,friction:0.0,
          render:{fillStyle:'#d9b36a',strokeStyle:'#7a5010',lineWidth:1},label:'peg',
        }));
      }
    }
  }

  /* ── Deflectors ── */
  function addDeflectors(w,h){
    const d=(c,angle)=>({isStatic:true,restitution:0.82,friction:0.0,render:{fillStyle:c},angle,label:'circuit'});
    const bodies=[
      Bodies.rectangle(w*0.20,h*0.28,46,6,d('#8030b0', Math.PI/4)),
      Bodies.rectangle(w*0.80,h*0.28,46,6,d('#8030b0',-Math.PI/4)),
      Bodies.rectangle(w*0.30,h*0.48,42,6,d('#b06028', Math.PI/4)),
      Bodies.rectangle(w*0.70,h*0.48,42,6,d('#b06028',-Math.PI/4)),
      Bodies.rectangle(w*0.22,h*0.80,58,6,d('#b06028', Math.PI/4.5)),
      Bodies.rectangle(w*0.78,h*0.80,58,6,d('#b06028',-Math.PI/4.5)),
    ];
    circuitBodies.push(...bodies);
    if(circuitOn)World.add(engine.world,bodies);
  }

  /* ── Bumpers ── */
  function addBumpers(w,h){
    const b=c=>({isStatic:true,restitution:1.18,friction:0.0,render:{fillStyle:c},label:'bumper'});
    const bodies=[
      Bodies.circle(w*0.24,h*0.55,15,b('#cc2020')),
      Bodies.circle(w*0.76,h*0.55,15,b('#cc2020')),
      Bodies.circle(w*0.50,h*0.60,15,b('#2060dd')),
      Bodies.circle(w*0.37,h*0.72,12,b('#20aa44')),
      Bodies.circle(w*0.63,h*0.72,12,b('#20aa44')),
    ];
    circuitBodies.push(...bodies);
    if(circuitOn)World.add(engine.world,bodies);
  }

  /* ── Special zones ── */
  function addSpecialZones(w,h){
    const cfg=DIFF_CFG[DIFFS[diffIdx]];
    World.add(engine.world,Bodies.rectangle(POS.vzone.x,POS.vzone.y,cfg.vzoneW,18,{
      isStatic:true,isSensor:true,
      render:{fillStyle:'rgba(255,200,50,.28)',strokeStyle:'#ffd700',lineWidth:2},label:'vzone',
    }));
    World.add(engine.world,Bodies.circle(POS.gatel.x,POS.gatel.y,cfg.gateR,{
      isStatic:true,isSensor:true,
      render:{fillStyle:'rgba(0,200,255,.38)',strokeStyle:'#00cfff',lineWidth:2},label:'gate_L',
    }));
    World.add(engine.world,Bodies.circle(POS.gater.x,POS.gater.y,cfg.gateR,{
      isStatic:true,isSensor:true,
      render:{fillStyle:'rgba(0,200,255,.38)',strokeStyle:'#00cfff',lineWidth:2},label:'gate_R',
    }));
    World.add(engine.world,Bodies.circle(POS.tulip.x,POS.tulip.y,cfg.tulipR,{
      isStatic:true,isSensor:true,
      render:{fillStyle:'rgba(0,255,136,.22)',strokeStyle:'#00ff88',lineWidth:2},label:'tulip',
    }));
    gateL=Bodies.rectangle(POS.tulip.x-24,POS.tulip.y,22,7,{isStatic:true,render:{fillStyle:'#207050'},label:'tulip_gate'});
    gateR=Bodies.rectangle(POS.tulip.x+24,POS.tulip.y,22,7,{isStatic:true,render:{fillStyle:'#207050'},label:'tulip_gate'});
    World.add(engine.world,[gateL,gateR]);
  }

  /* ── Cups ── */
  function addCups(w,h){
    const cupW=(w-WALL*2-4)/CUP_COUNT,flY=h-20,wallT=4;
    for(let i=0;i<=CUP_COUNT;i++) World.add(engine.world,Bodies.rectangle(WALL+2+i*cupW,flY-18,wallT,36,{isStatic:true,render:{fillStyle:'#c09040'}}));
    for(let i=0;i<CUP_COUNT;i++){
      const cx=WALL+2+(i+0.5)*cupW;
      World.add(engine.world,Bodies.rectangle(cx,flY-6,cupW-wallT*2,4,{isStatic:true,isSensor:true,render:{fillStyle:'rgba(255,200,80,.12)'},label:'cup_'+i}));
    }
  }

  /* ── Oscillator ── */
  function addOscillator(w,h){
    oscBody=Bodies.rectangle(w*0.5,h*0.42,58,7,{isStatic:true,restitution:0.88,friction:0.0,render:{fillStyle:'#5020a0'},label:'circuit'});
    circuitBodies.push(oscBody);
    if(circuitOn)World.add(engine.world,oscBody);
  }

  /* ══════════════════════════════════════════════════════════
     COLLISION HANDLER
  ══════════════════════════════════════════════════════════ */
  function handleCollisions(event){
    event.pairs.forEach(({bodyA,bodyB})=>{
      const ball=bodyA.label==='ball'?bodyA:bodyB.label==='ball'?bodyB:null;
      const other=ball===bodyA?bodyB:bodyA;
      if(!ball||!other)return;
      if(!processed.has(ball))processed.set(ball,new Set());
      const hits=processed.get(ball);
      if(hits.has(other.label))return;
      switch(other.label){
        case 'peg':   SND.peg();  break;
        case 'bumper':onBumper(ball);hits.add(other.label+'_'+Math.random());return;
        case 'vzone': hits.add('vzone');onVZone(ball);break;
        case 'gate_L':hits.add('gate_L');onGate(ball);break;
        case 'gate_R':hits.add('gate_R');onGate(ball);break;
        case 'tulip': if(tulipOpen){hits.add('tulip');onTulip(ball);}break;
        default:
          if(other.label&&other.label.startsWith('cup_')){
            const idx=parseInt(other.label.split('_')[1],10);
            hits.add(other.label);onCup(ball,idx);
          }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     CANVAS DRAWING
  ══════════════════════════════════════════════════════════ */
  function drawCanvas(){
    const ctx=render.context;
    ctx.save();

    // Draw trails
    drawTrails(ctx);

    const cupW=(CW-WALL*2-4)/CUP_COUNT,flY=CH-20;

    // Cup labels
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`bold ${Math.max(6,Math.floor(cupW*0.17))}px Orbitron,monospace`;
    for(let i=0;i<CUP_COUNT;i++){
      const cx=WALL+2+(i+0.5)*cupW,pts=ZONE_SCORES[i];
      ctx.fillStyle=pts===100?'#ffd700':pts>=50?'#ffaa40':'#ffe0a0';
      ctx.shadowColor=pts>=50?'rgba(255,180,0,.8)':'transparent';
      ctx.shadowBlur=pts>=50?7:0;
      ctx.fillText(ZONE_LABELS[i],cx,flY-11);
    }
    ctx.shadowBlur=0;

    // Zone labels
    ctx.font='bold 9px Orbitron,monospace';
    ctx.fillStyle='#ffd700';ctx.shadowColor='rgba(255,200,0,.9)';ctx.shadowBlur=12;
    ctx.fillText('★ V-ZONE ★',POS.vzone.x,POS.vzone.y-20);ctx.shadowBlur=0;
    ctx.font='bold 7px Orbitron,monospace';ctx.fillStyle='#00cfff';
    ctx.shadowColor='rgba(0,200,255,.7)';ctx.shadowBlur=8;
    ctx.fillText('GATE',POS.gatel.x,POS.gatel.y-18);
    ctx.fillText('GATE',POS.gater.x,POS.gater.y-18);ctx.shadowBlur=0;
    ctx.font='bold 8px Orbitron,monospace';
    ctx.fillStyle=tulipOpen?'#00ff88':'#336644';
    ctx.shadowColor=tulipOpen?'rgba(0,255,100,.9)':'transparent';ctx.shadowBlur=tulipOpen?12:0;
    ctx.fillText(tulipOpen?'🌸 OPEN':'TULIP',POS.tulip.x,POS.tulip.y-22);ctx.shadowBlur=0;

    // Bumper rings
    [{x:CW*0.24,y:CH*0.55,r:15,c:'#cc2020'},{x:CW*0.76,y:CH*0.55,r:15,c:'#cc2020'},
     {x:CW*0.50,y:CH*0.60,r:15,c:'#2060dd'},{x:CW*0.37,y:CH*0.72,r:12,c:'#20aa44'},
     {x:CW*0.63,y:CH*0.72,r:12,c:'#20aa44'}].forEach(bp=>{
      ctx.beginPath();ctx.arc(bp.x,bp.y,bp.r+4,0,Math.PI*2);
      ctx.strokeStyle=bp.c;ctx.lineWidth=2;
      ctx.globalAlpha=0.5+0.3*Math.sin(Date.now()/300+bp.x);ctx.stroke();ctx.globalAlpha=1;
    });

    // Fever tint
    if(gameMode===MODE.FEVER){ctx.fillStyle='rgba(255,50,0,0.07)';ctx.fillRect(0,0,CW,CH);}

    // Particles on top
    drawParticles(ctx);

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     BALL LAUNCH
  ══════════════════════════════════════════════════════════ */
  function launchBall(fromFever=false){
    if(!gameStarted)return;
    if(!fromFever&&balls<=0){
      if(credits>0){insertCredit();return;}
      showPopup('SIN BOLAS ❌',false,'#ff6060');
      return;
    }
    if(dropLock)return;
    dropLock=true;
    setTimeout(()=>{dropLock=false;},220);
    balls--;
    if(!fromFever)stats.shots++;
    updateDisplay();
    const cfg=DIFF_CFG[DIFFS[diffIdx]];
    SND.drop(powerVal||0.5);
    const margin=(1-cfg.launchSpread)/2;
    const x=CW*margin+Math.random()*CW*cfg.launchSpread;
    const vx=(Math.random()-0.5)*4.0;
    const vy=1.0+(powerVal||0.5)*3.0;
    const hue=Math.random()*40+5;
    const ball=Bodies.circle(x,38,8,{
      restitution:cfg.restitution,friction:cfg.friction,frictionAir:cfg.frictionAir,
      render:{fillStyle:`hsl(${hue},90%,58%)`,strokeStyle:'rgba(0,0,0,.35)',lineWidth:1.5},
      label:'ball',
    });
    Body.setVelocity(ball,{x:vx,y:vy});
    ball._born=Date.now();
    ball._stuckSince=null;
    World.add(engine.world,ball);
    activeBalls.push(ball);
  }

  /* ══════════════════════════════════════════════════════════
     POWER METER
  ══════════════════════════════════════════════════════════ */
  function startPower(){
    if(powerHeld)return;
    powerHeld=true;powerVal=0;
    powerInt=setInterval(()=>{
      powerVal=Math.min(1,powerVal+0.045);
      if(powerFillEl)powerFillEl.style.width=(powerVal*100)+'%';
    },50);
  }
  function releasePower(){
    if(!powerHeld)return;
    powerHeld=false;clearInterval(powerInt);
    launchBall();
    setTimeout(()=>{powerVal=0;if(powerFillEl)powerFillEl.style.width='0%';},150);
  }

  /* ══════════════════════════════════════════════════════════
     TEARDOWN / RESET
  ══════════════════════════════════════════════════════════ */
  function teardown(){
    clearFeverState();
    clearInterval(autoInt);autoInt=null;
    clearTimeout(tulipTimer);tulipTimer=null;
    clearInterval(powerInt);powerHeld=false;
    stopMusic();
    if(runner)Runner.stop(runner);
    if(render){Render.stop(render);if(render.canvas)render.canvas.remove();}
    if(engine){World.clear(engine.world);Engine.clear(engine);}
    activeBalls=[];dropLock=false;oscBody=null;gateL=null;gateR=null;circuitBodies=[];
    tulipOpen=false;oscPhase=0;particles=[];
    if(feverOvEl){feverOvEl.classList.remove('active');feverOvEl.setAttribute('aria-hidden','true');}
    if(feverBoxEl)feverBoxEl.style.display='none';
    if(reachOvEl){reachOvEl.classList.remove('show');reachOvEl.setAttribute('aria-hidden','true');}
  }

  function resetGame(keepStats=false){
    teardown();
    score=0;balls=credits>0?CREDITS_PER_COIN:10;
    if(credits>0)credits--;
    multiplier=1;bonusLeft=0;
    gameMode=MODE.NORMAL;reelSpinning=false;
    if(!keepStats){
      stats={shots:0,vzoneHits:0,gateHits:0,tulipHits:0,jackpots:0,bonuses:0,startTime:Date.now(),lastPts:0};
    }
    [0,1,2].forEach(i=>{
      reelValues[i]=i;
      const el=$('reel-'+i);
      if(el){el.querySelector('.reel-inner').textContent=REEL_SYM[i];el.classList.remove('spinning');}
    });
    reelResEl.className='reel-result-bar';
    reelResEl.textContent='— READY —';
    powerVal=0;if(powerFillEl)powerFillEl.style.width='0%';
    // Hide game over screen
    const go=$('gameover-screen');
    if(go){go.classList.remove('go-visible');setTimeout(()=>{go.style.display='none';},500);}
    buildWorld();
    SND.click();
    musicOn=false;
    if(soundOn)startMusic();
  }

  /* ══════════════════════════════════════════════════════════
     AUTO MODE
  ══════════════════════════════════════════════════════════ */
  function toggleAuto(){
    const el=$('tog-auto');
    if(autoInt){clearInterval(autoInt);autoInt=null;if(el)el.classList.remove('active');}
    else{autoInt=setInterval(()=>{if(balls>0)launchBall();},620);if(el)el.classList.add('active');}
  }

  /* ══════════════════════════════════════════════════════════
     BUTTON WIRING
  ══════════════════════════════════════════════════════════ */
  function regBtn(id,fn){
    const el=$(id);if(!el)return;
    el.addEventListener('click',fn);
    el.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();fn();}});
  }

  const launchEl=$('btn-launch');
  if(launchEl){
    launchEl.addEventListener('mousedown',startPower);
    launchEl.addEventListener('touchstart',startPower,{passive:true});
    launchEl.addEventListener('mouseup',releasePower);
    launchEl.addEventListener('touchend',releasePower);
    launchEl.addEventListener('mouseleave',()=>{if(powerHeld)releasePower();});
    launchEl.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();startPower();}});
    launchEl.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();releasePower();}});
  }

  regBtn('btn-add',   ()=>{insertCredit();});
  regBtn('btn-spin',  ()=>{SND.click();spinReels({});});
  regBtn('btn-reset', ()=>resetGame());
  regBtn('btn-diff',  ()=>{diffIdx=(diffIdx+1)%DIFFS.length;SND.click();resetGame();});
  regBtn('go-play-again',()=>{const go=$('gameover-screen');if(go){go.classList.remove('go-visible');setTimeout(()=>{go.style.display='none';},400);}resetGame();});
  regBtn('go-add-coin',  ()=>{const go=$('gameover-screen');if(go){go.classList.remove('go-visible');setTimeout(()=>{go.style.display='none';},400);}insertCredit();resetGame(true);});

  function togBtn(id,fn){const el=$(id);if(!el)return;el.addEventListener('click',()=>{SND.click();fn(el);});}

  togBtn('tog-sound',   el=>{
    soundOn=!soundOn;el.classList.toggle('active',soundOn);
    if(soundOn){startMusic();}else{stopMusic();}
  });
  togBtn('tog-circuit', el=>{
    circuitOn=!circuitOn;el.classList.toggle('active',circuitOn);
    if(engine){
      if(circuitOn)World.add(engine.world,circuitBodies);
      else{circuitBodies.forEach(b=>World.remove(engine.world,b));oscBody=null;}
    }
  });
  togBtn('tog-gravity', el=>{gravityLow=!gravityLow;el.classList.toggle('active',gravityLow);if(engine)engine.gravity.y=gravityLow?0.38:DIFF_CFG[DIFFS[diffIdx]].gravity;});
  togBtn('tog-auto',    ()=>toggleAuto());

  // Spacebar
  document.addEventListener('keyup',e=>{if(e.code==='Space'&&powerHeld){e.preventDefault();releasePower();}});

  // Resize
  let resT;
  window.addEventListener('resize',()=>{clearTimeout(resT);resT=setTimeout(resetGame,380);});

  /* ══════════════════════════════════════════════════════════
     COIN / ATTRACT-MODE GATE
  ══════════════════════════════════════════════════════════ */
  function insertCoin(){
    if(gameStarted)return;
    const screen=$('coin-screen');
    if(!screen)return;
    const coin=$('attract-coin');
    if(coin){
      coin.classList.add('dropping');
      SND.coin();
    }
    const slot=$('attract-slot-vis');
    if(slot){slot.classList.add('coin-flash');setTimeout(()=>slot.classList.remove('coin-flash'),400);}
    setTimeout(()=>screen.classList.add('coin-inserted'),500);
    setTimeout(()=>{
      gameStarted=true;
      screen.style.display='none';
      stats.startTime=Date.now();
      resetGame();
    },1400);
  }

  const coinScreenBtn=$('coin-screen-btn');
  if(coinScreenBtn){
    coinScreenBtn.addEventListener('click',insertCoin);
    coinScreenBtn.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();insertCoin();}});
  }
  $('coin-screen') && $('coin-screen').addEventListener('click',insertCoin);

  // Jackpot counter on attract screen
  let jackpotVal=1234500;
  const jdEl=$('attract-jackpot-val');
  setInterval(()=>{jackpotVal+=Math.floor(Math.random()*350+80);if(jdEl)jdEl.textContent=jackpotVal.toLocaleString();},100);

  // Stats ticker
  setInterval(updateStatsDisplay,1000);

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  $('tog-sound')   && $('tog-sound').classList.add('active');
  $('tog-circuit') && $('tog-circuit').classList.add('active');

  // Spacebar: coin insert or launch
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&!e.target.matches('button,input,select')){
      e.preventDefault();
      if(!gameStarted){insertCoin();return;}
      startPower();
    }
  });

})();