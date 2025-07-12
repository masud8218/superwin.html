/* ---------- Elements ---------- */
const balEl = document.getElementById('bal'),
      dep   = document.getElementById('dep'),
      resBar= document.getElementById('resBar'),
      resDrop  = document.getElementById('resDrop'),
      histToggle = document.getElementById('histToggle'),
      plane = document.getElementById('plane'),
      fill  = document.getElementById('fill'),
      multEl= document.getElementById('mult'),
      timer = document.getElementById('timer'),
      tLeft = document.getElementById('tLeft'),
      betHist = document.getElementById('betHist'),
      amtInputs  = [document.getElementById('amt1'), document.getElementById('amt2')],
      autoInputs = [document.getElementById('auto1'),document.getElementById('auto2')],
      playerTab  = document.getElementById('playerTab'),
      myTab      = document.getElementById('myTab'),
      toast      = document.getElementById('toast'),
      betBtns    = [...document.querySelectorAll('.bet-btn')];

/* Quick‑add buttons */
document.querySelectorAll('.quick button').forEach(b => {
  b.onclick = () => {
    const inp = b.closest('.bet-card').querySelector('input');
    inp.value = (+inp.value || 0) + +b.dataset.val;
  };
});

/* Tab switch */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  };
});

/* ---------- Game variables ---------- */
const targetRTP = 0.8,
      minBet    = 5,
      maxBet    = 10000;

let wallet     = 5000,
    totalBet   = 0,
    totalPaid  = 0,
    history    = [],
    bets       = [{amt:0,auto:0,cashed:false},{amt:0,auto:0,cashed:false}],
    lastAmt    = [0,0],
    lastAuto   = [0,0],
    phase      = 'COUNT',
    count      = 100,
    startT,
    crashPt,
    mult       = 1,
    speed      = 0,
    animId,
    fakePlayers = [],
    curBet     = 0,
    curCash    = 0;

/* ---------- Helper functions ---------- */
const rand = (a,b)=>(Math.random()*(b-a)+a);
const hue  = v => 240 - (v/100)*240;
const setSpeed = v => {
  fill.style.width = Math.min(v,100)+'%';
  fill.style.background = `hsl(${hue(v)},100%,55%)`;
};
const updWallet = ()=> balEl.textContent = wallet;
const cls = v => v>=4?'good':v>=2?'mid':'bad';

function renderRes(){
  resBar.innerHTML = resDrop.innerHTML = '';
  history.slice(-8).forEach(v=>{
    resBar.insertAdjacentHTML('beforeend', `<div class="bubble ${cls(v)}">${v}x</div>`);
  });
  [...history].slice(-20).reverse().forEach(v=>{
    resDrop.insertAdjacentHTML('beforeend', `<div class="bubble ${cls(v)}">${v}x</div>`);
  });
}

histToggle.onclick = ()=> histToggle.parentElement.classList.toggle('open');

function addEntry(el,msg,cl=''){
  const box = el.parentElement, oldTop = box.scrollTop;
  el.insertAdjacentHTML('beforeend', `<div class="entry ${cl}">${msg}</div>`);
  while(el.children.length>300) el.firstChild.remove();
  box.scrollTop = oldTop;
}

function restoreInputs(){
  amtInputs.forEach((inp,i)=> inp.value = lastAmt[i] || '');
  autoInputs.forEach((inp,i)=> inp.value = lastAuto[i] || '');
}

function showToast(msg,dur=1800){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), dur);
}

/* Countdown in multiplier area */
function updateMultCountdown(){
  multEl.style.color = '#ffcc00';
  multEl.innerHTML = `<i class="fas fa-hourglass-half"></i> ${(count/10).toFixed(1)}s`;
}

/* Cancel button (prev. Deposit) */
dep.onclick = ()=> showToast('Canceled!');

/* ---------- Fake players ---------- */
function genPlayers(){
  const n = Math.floor(rand(300,1000));
  fakePlayers = []; playerTab.innerHTML = '';
  for(let i=0;i<n;i++){
    const num = Math.floor(rand(1111111111,9999999999)).toString();
    const name='👤'+num.slice(0,2)+'******'+num.slice(-2),
          bet = Math.floor(rand(10,500)),
          target = rand(1.2,10).toFixed(2);
    fakePlayers.push({name,bet,target:+target,cash:false,betAdded:false});
  }
}

/* Button states */
function setBtn(i,state,val=0){
  const b=betBtns[i];
  if(state==='bet'){b.textContent='BET'; b.disabled=false;}
  if(state==='cancel'){b.textContent='CANCEL'; b.disabled=false;}
  if(state==='wait'){b.textContent='CASH OUT'; b.disabled=false;}
  if(state==='live'){b.textContent=`CASH ৳${val}`;}
  if(state==='done'){b.textContent='BET'; b.disabled=true;}
}

/* Place bet */
function place(i){
  if(phase!=='COUNT'||count<=20){showToast('বেট এখন বন্ধ');return;}
  const amt=+amtInputs[i].value, au=+autoInputs[i].value||0;
  if(!amt)               {showToast('এমন কোন বেট নেই');return;}
  if(amt<minBet)         {showToast(`মিনিমাম বেট ৳${minBet}`);return;}
  if(amt>maxBet)         {showToast(`সর্বোচ্চ বেট ৳${maxBet}`);return;}
  if(wallet<amt)         {showToast('পর্যাপ্ত ব্যাল্যান্স নেই');return;}

  wallet -= amt; updWallet();
  bets[i]={amt,auto:au,cashed:false};
  totalBet += amt; curBet += amt;
  betHist.textContent = `Total Cash‑out: ৳${curCash} | Total Bet: ৳${curBet}`;
  lastAmt[i]=amt; lastAuto[i]=au;
  setBtn(i,'cancel');
  showToast(`বেট প্লেসড ৳${amt}`);
}

function updateBetButtons(){
  bets.forEach((b,idx)=>{
    if(!b.amt||b.cashed) return;
    if(count>20) setBtn(idx,'cancel');
    else         setBtn(idx,'wait');
  });
}

/* Crash point with RTP tweak */
function pickCrash(){
  const cur = totalPaid / Math.max(totalBet,1);
  let c = rand(1,10);
  if(cur>targetRTP) c = Math.max(1, c-rand(0,2));
  else if(cur<targetRTP) c = Math.min(10, c+rand(0,2));
  return c.toFixed(2);
}

/* Fake feed */
let betFeedTimer,cashFeedTimer;
function feedFakeBets(){
  let idx=0;
  betFeedTimer=setInterval(()=>{
    if(idx>=fakePlayers.length){clearInterval(betFeedTimer);return;}
    const p=fakePlayers[idx++];
    if(!p.betAdded){
      addEntry(playerTab,`${p.name} -- 🎲 Bet ৳${p.bet}`);
      p.betAdded=true;
    }
  },250);
}
function feedCashouts(){
  cashFeedTimer=setInterval(()=>{
    if(phase!=='FLY'){clearInterval(cashFeedTimer);return;}
    const p=fakePlayers.find(fp=>!fp.cash&&mult>=fp.target);
    if(p){
      p.cash=true;
      addEntry(playerTab,`${p.name} -- 💰 ৳${Math.floor(p.bet*p.target)} @${p.target}x`,'win');
    }
  },250);
}

/* ---------- Round flow ---------- */
function startCountdown(){
  phase='COUNT'; count=100;
  updateMultCountdown();
  genPlayers(); curBet=curCash=0;
  betHist.textContent='Total Cash‑out: ৳0 | Total Bet: ৳0';
  showToast('বেট করুন ভাই!');
  betBtns.forEach(b=>b.disabled=false);

  const iv=setInterval(()=>{
    count--; tLeft.textContent=(count/10).toFixed(1);
    updateMultCountdown();
    updateBetButtons();

    if(count===20) phase='LOCK'; /* last 2 seconds */

    if(!count){
      clearInterval(iv);
      fly();
    }
  },100);
}

function fly(){
  phase='FLY'; mult=1;
  multEl.textContent='x1.00'; multEl.style.color='var(--accent)';
  plane.classList.add('bob'); crashPt=pickCrash();
  startT=null;
  setTimeout(feedCashouts,1000);
  requestAnimationFrame(loop);
}

function loop(ts){
  if(!startT) startT=ts;
  const dt=(ts-startT)/1000;
  speed = dt<=2?0.1+dt/2*99:99; setSpeed(speed);
  mult += 0.02;
  multEl.textContent=`x${mult.toFixed(2)}`;
  plane.style.left=Math.min(mult*8,100)+'%';

  /* live update + auto cash */
  bets.forEach((b,i)=>{
    if(b.amt&&!b.cashed){
      setBtn(i,'live',Math.floor(b.amt*mult));
      if(b.auto&&mult>=b.auto){
        const win=Math.floor(b.amt*b.auto);
        wallet+=win; totalPaid+=win; curCash+=win;
        b.cashed=true; updWallet();
        addEntry(myTab,`✅ Cashed ৳${win} @${b.auto}x`,'win');
        betHist.textContent=`Total Cash‑out: ৳${curCash} | Total Bet: ৳${curBet}`;
        showToast(`Auto cashed ৳${win}`);
        setBtn(i,'done'); b.amt=0;
      }
    }
  });
  if(mult>=crashPt){crash();return;}
  animId=requestAnimationFrame(loop);
}

function crash(){
  phase='CRASH'; cancelAnimationFrame(animId);
  setSpeed(0); plane.classList.remove('bob'); plane.classList.add('shake');
  clearInterval(cashFeedTimer);

  const boom=document.createElement('div');
  boom.className='boom'; boom.textContent='💥';
  document.getElementById('runway').appendChild(boom);
  setTimeout(()=>boom.remove(),600);

  multEl.textContent=`💥 ${mult.toFixed(2)}x`; multEl.style.color='var(--danger)';
  history.push(+mult.toFixed(2)); if(history.length>20) history.shift();
  renderRes();

  fakePlayers.filter(p=>!p.cash).forEach(p=>{
    addEntry(playerTab,`${p.name} -- ❌ Lost ৳${p.bet}`,'loss');
  });

  bets.forEach((b,i)=>{
    if(b.amt&&!b.cashed){
      addEntry(myTab,`❌ Lost ৳${b.amt} @${mult.toFixed(2)}x`,'loss');
    }
    b.amt=b.auto=0; b.cashed=false; setBtn(i,'bet');
  });
  restoreInputs();
  setTimeout(feedFakeBets,1000);

  setTimeout(()=>{
    plane.className='plane';
    plane.style.left='0';
    startCountdown();
  },500);
}

/* ---------- Button handlers ---------- */
betBtns.forEach((b,i)=> b.onclick = ()=>{
  /* Manual cashout */
  if(phase==='FLY' && bets[i].amt && !bets[i].cashed){
    const win=Math.floor(bets[i].amt*mult);
    wallet+=win; totalPaid+=win; curCash+=win; updWallet();
    addEntry(myTab,`✅ Cashed ৳${win} @${mult.toFixed(2)}x`,'win');
    betHist.textContent=`Total Cash‑out: ৳${curCash} | Total Bet: ৳${curBet}`;
    showToast(`Cashed ৳${win}`);
    bets[i].cashed=true; bets[i].amt=0; setBtn(i,'done');
    return;
  }
  /* Cancel bet (while >2 s left) */
  if(phase==='COUNT'&&bets[i].amt&&!bets[i].cashed){
    if(count>20){
      wallet+=bets[i].amt; updWallet();
      totalBet-=bets[i].amt; curBet-=bets[i].amt;
      betHist.textContent=`Total Cash‑out: ৳${curCash} | Total Bet: ৳${curBet}`;
      showToast('বেট ক্যানসেল হয়েছে');
      bets[i].amt=bets[i].auto=0; bets[i].cashed=false;
      setBtn(i,'bet');
    }else showToast('বেট এখন বাতিল করা যাবে না');
    return;
  }
  /* New bet */
  place(i);
});

/* ---------- INIT ---------- */
updWallet(); renderRes(); startCountdown();
