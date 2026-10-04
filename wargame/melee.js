function initMeleeUI(){
  const nav=document.querySelector('.tabs');
  const main=document.querySelector('main');
  if(!nav||!main||document.getElementById('tab-melee')) return;
  const tab=document.createElement('button');
  tab.className='tab'; tab.dataset.tab='melee'; tab.textContent='💥 Mêlée générale'; nav.appendChild(tab);
  const section=document.createElement('section');
  section.id='tab-melee'; section.className='tab-pane';
  section.innerHTML=`
    <section class="card">
      <h2>💥 Mêlée générale</h2>
      <p class="dashboard-note">Teste toutes les combinaisons <strong>Pokémon + attaque + objet</strong> contre tous les autres Pokémon avec les mêmes règles que le duel.</p>
      <div class="section-note"><strong>Classement :</strong> chaque Pokémon est évalué avec chaque attaque et chaque objet. Les adversaires reçoivent à chaque tour une attaque et un objet aléatoires. Le Top 10 affiche les Pokémon selon leur meilleure configuration trouvée.</div>
      <div class="form-grid">
        <div><label>Combats par matchup</label><input id="meleeBattles" type="number" min="1" max="50" value="5"></div>
        <div><label>Configurations testées</label><div class="section-note" style="margin:0">Toutes les attaques × tous les objets</div></div>
        <div><label>Choix adverse</label><div class="section-note" style="margin:0">Aléatoire à chaque tour</div></div>
        <div><label>Limite</label><div class="section-note" style="margin:0">100 phases maximum</div></div>
      </div>
      <div class="duel-actions"><button class="btn" id="meleeStartBtn">💥 Lancer la mêlée</button><button class="btn secondary" id="meleeStopBtn" disabled>⏹ Arrêter</button></div>
      <div id="meleeProgress" class="status" style="margin-top:14px">Prêt à lancer.</div>
      <div id="meleeSummary"></div>
      <div class="grid" style="margin-top:16px">
        <section class="card"><h3>🏆 Top 10</h3><div class="scroll"><table id="meleeTopTable"></table></div></section>
        <section class="card"><h3>💀 Top 10 des pires</h3><div class="scroll"><table id="meleeWorstTable"></table></div></section>
      </div>
      <section class="card" style="margin-top:16px"><h3>📊 Toutes les configurations</h3><div class="scroll"><table id="meleeFullTable"></table></div></section>
    </section>`;
  main.appendChild(section);
  const style=document.createElement('style');
  style.textContent='.melee-placeholder{}'; document.head.appendChild(style);
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===tab));
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p===section));
    localStorage.setItem('pokemon-wargame-active-tab','melee'); window.scrollTo({top:0,behavior:'smooth'});
  });
}

let meleeRunning=false;

function meleeCloneItem(item){ return item ? clone(item) : null; }
function meleeRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function meleeConfigLabel(p,a,item){ return `${p.name} — ${a.name} — ${item?item.name:"Sans objet"}`; }

function meleeFight(pA,aA,iA,pB,aB,iB){
  const A={base:pA,maxHp:pA.hp,hp:pA.hp,item:meleeCloneItem(iA),consumed:false};
  const B={base:pB,maxHp:pB.hp,hp:pB.hp,item:meleeCloneItem(iB),consumed:false};
  let phases=0;
  const sa=effectiveStats(pA,A.item), sb=effectiveStats(pB,B.item);
  let order;
  if(sa.speed>sb.speed) order=["A","B"];
  else if(sb.speed>sa.speed) order=["B","A"];
  else if(score(pA)<score(pB)) order=["A","B"];
  else if(score(pB)<score(pA)) order=["B","A"];
  else order=Math.random()<0.5?["A","B"]:["B","A"];
  while(A.hp>0 && B.hp>0 && phases<100){
    phases++;
    for(const side of order){
      if(A.hp<=0||B.hp<=0) break;
      if(side==="A"){
        const r=rollOneAttack(pA,pB,aA,A.item,B.item);
        applyDamage(B,r.damage);
        if(A.item?.consumeOnOffensive&&!A.consumed){A.consumed=true;}
      }else{
        const r=rollOneAttack(pB,pA,aB,B.item,A.item);
        applyDamage(A,r.damage);
        if(B.item?.consumeOnOffensive&&!B.consumed){B.consumed=true;}
      }
    }
    endPhase(A); endPhase(B);
  }
  return {winner:A.hp>0&&B.hp<=0?"A":B.hp>0&&A.hp<=0?"B":"draw",phases};
}

function renderMeleeTables(pokemonRows, allRows){
  const top=pokemonRows.slice(0,10), worst=pokemonRows.slice().reverse().slice(0,10);
  const table=(arr)=>`<thead><tr><th>#</th><th class="left">Pokémon</th><th class="left">Attaque</th><th class="left">Objet</th><th>Victoires</th><th>Défaites</th><th>Nuls</th><th>Taux</th></tr></thead><tbody>`+
    arr.map((r,i)=>`<tr><td>${i+1}</td><td class="left"><strong>${esc(r.name)}</strong></td><td class="left">${esc(r.attack)}</td><td class="left">${esc(r.item)}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.draws}</td><td><strong>${r.rate.toFixed(1)}%</strong></td></tr>`).join("")+`</tbody>`;
  document.getElementById("meleeTopTable").innerHTML=table(top);
  document.getElementById("meleeWorstTable").innerHTML=table(worst);
  document.getElementById("meleeFullTable").innerHTML=table(allRows);
}

async function runMelee(){
  if(meleeRunning)return;
  if(db.pokemon.length<2||!db.attacks.length){showStatus("Il faut au moins 2 Pokémon et 1 attaque.","error");return;}
  meleeRunning=true;
  document.getElementById("meleeStartBtn").disabled=true;
  document.getElementById("meleeStopBtn").disabled=false;
  const battles=Math.min(50,Math.max(1,Number(document.getElementById("meleeBattles").value)||5));
  const items=[null,...db.items];
  const configs=[];
  for(const p of db.pokemon) for(const a of db.attacks) for(const i of items) configs.push({p,a,i});
  const total=configs.length*db.pokemon.length*battles;
  let done=0;
  const results=new Map();
  configs.forEach(c=>results.set(c.p.name+"|"+c.a.code+"|"+(c.i?.id||"none"),{name:c.p.name,attack:c.a.name,item:c.i?.name||"Sans objet",wins:0,losses:0,draws:0,rate:0}));
  let cursor=0;
  const progress=document.getElementById("meleeProgress");
  progress.className="status";
  progress.textContent=`Simulation en cours… 0 / ${total.toLocaleString("fr-FR")}`;

  while(meleeRunning && cursor<configs.length){
    const end=Math.min(cursor+12,configs.length);
    for(let ci=cursor;ci<end;ci++){
      const c=configs[ci];
      const key=c.p.name+"|"+c.a.code+"|"+(c.i?.id||"none");
      const out=results.get(key);
      for(const opp of db.pokemon){
        if(opp===c.p)continue;
        for(let n=0;n<battles;n++){
          const oppAttack=meleeRandom(db.attacks);
          const oppItem=meleeRandom(items);
          const fight=meleeFight(c.p,c.a,c.i,opp,oppAttack,oppItem);
          if(fight.winner==="A")out.wins++; else if(fight.winner==="B")out.losses++; else out.draws++;
          done++;
        }
      }
    }
    cursor=end;
    const pct=done/total*100;
    progress.textContent=`Simulation en cours… ${done.toLocaleString("fr-FR")} / ${total.toLocaleString("fr-FR")} (${pct.toFixed(0)}%)`;
    await new Promise(requestAnimationFrame);
  }
  if(!meleeRunning){
    progress.className="status error";
    progress.textContent="Simulation arrêtée.";
  }else{
    const rows=[...results.values()].map(r=>({...r,rate:(r.wins+r.draws*0.5)/(r.wins+r.losses+r.draws)*100})).sort((a,b)=>b.rate-a.rate);
    const bestByPokemon=db.pokemon.map(p=>rows.find(r=>r.name===p.name)).filter(Boolean).sort((a,b)=>b.rate-a.rate);
    renderMeleeTables(bestByPokemon, rows);
    document.getElementById("meleeSummary").innerHTML=`<div class="section-note"><strong>Simulation terminée.</strong> ${configs.length.toLocaleString("fr-FR")} configurations testées, ${done.toLocaleString("fr-FR")} combats simulés. Le Top 10 classe les Pokémon selon leur meilleure configuration attaque + objet.</div>`;
    progress.className="status success";
    progress.textContent=`Terminé — ${done.toLocaleString("fr-FR")} combats.`;
  }
  meleeRunning=false;
  document.getElementById("meleeStartBtn").disabled=false;
  document.getElementById("meleeStopBtn").disabled=true;
}

initMeleeUI();
document.getElementById("meleeStartBtn").onclick=()=>runMelee();
document.getElementById("meleeStopBtn").onclick=()=>{meleeRunning=false;};
