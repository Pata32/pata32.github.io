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
      <h2>💥 Mêlée générale — tournoi en 2 phases</h2>
      <p class="dashboard-note">Phase 1 : <strong>360 000 combats de sélection</strong>. Les 1 000 meilleures configurations passent ensuite en phase 2, où elles s'affrontent toutes entre elles.</p>
      <div class="section-note"><strong>Objectif :</strong> utiliser les 360 000 premiers combats comme filtre statistique, puis concentrer le tournoi complet sur le Top 1 000 pour obtenir un classement final beaucoup plus précis.</div>
      <div class="form-grid">
        <div><label>Combats phase 2 / matchup</label><input id="meleeBattles" type="number" min="1" max="20" value="5"></div>
        <div><label>Phase 1</label><div class="section-note" style="margin:0"><strong>360 000 combats</strong> aléatoires entre configurations</div></div>
        <div><label>Qualification</label><div class="section-note" style="margin:0"><strong>Top 1 000</strong> après la phase 1</div></div>
        <div><label>Phase 2</label><div class="section-note" style="margin:0">Chaque paire du Top 1 000 s'affronte</div></div>
      </div>
      <div class="duel-actions"><button class="btn" id="meleeStartBtn">💥 Lancer le tournoi</button><button class="btn secondary" id="meleeStopBtn" disabled>⏹ Arrêter</button></div>
      <div id="meleeProgress" class="status" style="margin-top:14px">Prêt à lancer.</div>
      <div id="meleeSummary"></div>
      <div class="grid" style="margin-top:16px">
        <section class="card"><h3>🏆 Top 10 final</h3><div class="scroll"><table id="meleeTopTable"></table></div></section>
        <section class="card"><h3>💀 Top 10 final des pires</h3><div class="scroll"><table id="meleeWorstTable"></table></div></section>
      </div>
      <section class="card" style="margin-top:16px"><h3>🥇 Top 1 000 final</h3><div class="scroll"><table id="meleeFullTable"></table></div></section>
    </section>`;
  main.appendChild(section);
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===tab));
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p===section));
    localStorage.setItem('pokemon-wargame-active-tab','melee'); window.scrollTo({top:0,behavior:'smooth'});
  });
  if(localStorage.getItem('pokemon-wargame-active-tab')==='melee') tab.click();
}

let meleeRunning=false;

function meleeCloneItem(item){ return item ? clone(item) : null; }

function meleeFight(cA,cB){
  const A={base:cA.p,maxHp:cA.p.hp,hp:cA.p.hp,item:meleeCloneItem(cA.i),consumed:false};
  const B={base:cB.p,maxHp:cB.p.hp,hp:cB.p.hp,item:meleeCloneItem(cB.i),consumed:false};
  let phases=0;
  const sa=effectiveStats(cA.p,A.item), sb=effectiveStats(cB.p,B.item);
  let order;
  if(sa.speed>sb.speed) order=["A","B"];
  else if(sb.speed>sa.speed) order=["B","A"];
  else if(score(cA.p)<score(cB.p)) order=["A","B"];
  else if(score(cB.p)<score(cA.p)) order=["B","A"];
  else order=Math.random()<0.5?["A","B"]:["B","A"];

  while(A.hp>0 && B.hp>0 && phases<100){
    phases++;
    for(const side of order){
      if(A.hp<=0||B.hp<=0) break;
      if(side==="A"){
        const r=rollOneAttack(cA.p,cB.p,cA.a,A.item,B.item);
        applyDamage(B,r.damage);
        if(A.item?.consumeOnOffensive&&!A.consumed) A.consumed=true;
      }else{
        const r=rollOneAttack(cB.p,cA.p,cB.a,B.item,A.item);
        applyDamage(A,r.damage);
        if(B.item?.consumeOnOffensive&&!B.consumed) B.consumed=true;
      }
    }
    endPhase(A); endPhase(B);
  }
  return A.hp>0&&B.hp<=0?"A":B.hp>0&&A.hp<=0?"B":"draw";
}

function meleeKey(c){
  return c.p.name+"|"+(c.a.code||c.a.name)+"|"+(c.i?.id||"none");
}

function makeMeleeResults(configs){
  return configs.map(c=>({
    key:meleeKey(c), name:c.p.name, attack:c.a.name, item:c.i?.name||"Sans objet",
    wins:0, losses:0, draws:0, rate:0, phase1Rate:0
  }));
}

function meleeRate(r){
  const total=r.wins+r.losses+r.draws;
  return total ? (r.wins+r.draws*0.5)/total*100 : 0;
}

function renderMeleeTables(rows){
  const top=rows.slice(0,10);
  const worst=rows.slice().reverse().slice(0,10);
  const table=(arr)=>`<thead><tr><th>#</th><th class="left">Pokémon</th><th class="left">Attaque</th><th class="left">Objet</th><th>Victoires</th><th>Défaites</th><th>Nuls</th><th>Taux</th></tr></thead><tbody>`+
    arr.map((r,i)=>`<tr><td>${i+1}</td><td class="left"><strong>${esc(r.name)}</strong></td><td class="left">${esc(r.attack)}</td><td class="left">${esc(r.item)}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.draws}</td><td><strong>${r.rate.toFixed(1)}%</strong></td></tr>`).join("")+`</tbody>`;
  document.getElementById("meleeTopTable").innerHTML=table(top);
  document.getElementById("meleeWorstTable").innerHTML=table(worst);
  document.getElementById("meleeFullTable").innerHTML=table(rows);
}

function renderMeleePhase1Table(rows){
  const top=rows.slice(0,10);
  const table=(arr)=>`<thead><tr><th>#</th><th class="left">Pokémon</th><th class="left">Attaque</th><th class="left">Objet</th><th>Combats P1</th><th>Taux P1</th></tr></thead><tbody>`+
    arr.map((r,i)=>`<tr><td>${i+1}</td><td class="left"><strong>${esc(r.name)}</strong></td><td class="left">${esc(r.attack)}</td><td class="left">${esc(r.item)}</td><td>${r.wins+r.losses+r.draws}</td><td><strong>${r.phase1Rate.toFixed(1)}%</strong></td></tr>`).join("")+`</tbody>`;
  return table(top);
}

async function runMelee(){
  if(meleeRunning)return;
  if(db.pokemon.length<2||!db.attacks.length){showStatus("Il faut au moins 2 Pokémon et 1 attaque.","error");return;}
  meleeRunning=true;
  document.getElementById("meleeStartBtn").disabled=true;
  document.getElementById("meleeStopBtn").disabled=false;

  const battles=Math.min(20,Math.max(1,Number(document.getElementById("meleeBattles").value)||5));
  const items=[null,...db.items];
  const configs=[];
  for(const p of db.pokemon) for(const a of db.attacks) for(const i of items) configs.push({p,a,i});

  const phase1Total=360000;
  const phase2Candidates=Math.min(1000,configs.length);
  const phase2Matchups=phase2Candidates*(phase2Candidates-1)/2;
  const phase2Total=phase2Matchups*battles;
  const grandTotal=phase1Total+phase2Total;

  const results=makeMeleeResults(configs);
  const resultByKey=new Map(results.map(r=>[r.key,r]));
  let done=0;
  const progress=document.getElementById("meleeProgress");
  progress.className="status";
  progress.textContent=`Phase 1/2 — sélection : 0 / ${phase1Total.toLocaleString("fr-FR")} combats`;

  // PHASE 1 : 360 000 combats aléatoires servant de filtre.
  for(let n=0;n<phase1Total && meleeRunning;n++){
    let ia=Math.floor(Math.random()*configs.length);
    let ib=Math.floor(Math.random()*configs.length);
    while(ib===ia) ib=Math.floor(Math.random()*configs.length);
    const A=configs[ia], B=configs[ib];
    const rA=resultByKey.get(meleeKey(A)), rB=resultByKey.get(meleeKey(B));
    const winner=meleeFight(A,B);
    if(winner==="A"){rA.wins++;rB.losses++;}
    else if(winner==="B"){rB.wins++;rA.losses++;}
    else{rA.draws++;rB.draws++;}
    done++;
    if(done%500===0){
      progress.textContent=`Phase 1/2 — sélection : ${done.toLocaleString("fr-FR")} / ${phase1Total.toLocaleString("fr-FR")} combats`;
      await new Promise(requestAnimationFrame);
    }
  }

  if(!meleeRunning){
    progress.className="status error";
    progress.textContent=`Arrêté — ${done.toLocaleString("fr-FR")} combats terminés.`;
    meleeRunning=false;
    document.getElementById("meleeStartBtn").disabled=false;
    document.getElementById("meleeStopBtn").disabled=true;
    return;
  }

  // Sélection du Top 1 000 sur la performance de la phase 1.
  const phase1Rows=results.map(r=>({...r,phase1Rate:meleeRate(r)}))
    .sort((a,b)=>b.phase1Rate-a.phase1Rate || b.wins-a.wins || a.losses-b.losses);
  const finalists=phase1Rows.slice(0,phase2Candidates);
  const finalistKeys=new Set(finalists.map(r=>r.key));
  const finalistConfigs=configs.filter(c=>finalistKeys.has(meleeKey(c)));

  document.getElementById("meleeSummary").innerHTML=
    `<div class="section-note"><strong>Phase 1 terminée :</strong> ${phase1Total.toLocaleString("fr-FR")} combats. Les ${phase2Candidates.toLocaleString("fr-FR")} meilleures configurations sont qualifiées pour la phase 2.</div>`+
    `<div class="section-note" style="margin-top:8px"><strong>Top 10 provisoire :</strong></div>`+
    `<div class="scroll" style="margin-top:8px"><table>${renderMeleePhase1Table(phase1Rows)}</table></div>`;

  // Remise à zéro des scores pour que le classement final repose uniquement sur le tournoi du Top 1 000.
  const finalResults=finalists.map(r=>({
    key:r.key,name:r.name,attack:r.attack,item:r.item,wins:0,losses:0,draws:0,rate:0
  }));
  const finalByKey=new Map(finalResults.map(r=>[r.key,r]));

  progress.textContent=`Phase 2/2 — tournoi du Top ${phase2Candidates.toLocaleString("fr-FR")} : 0 / ${phase2Total.toLocaleString("fr-FR")} combats`;
  let phase2Done=0, pairDone=0;

  // PHASE 2 : tournoi exhaustif entre les 1 000 finalistes.
  for(let i=0;i<finalistConfigs.length-1 && meleeRunning;i++){
    for(let j=i+1;j<finalistConfigs.length && meleeRunning;j++){
      const A=finalistConfigs[i], B=finalistConfigs[j];
      const rA=finalByKey.get(meleeKey(A)), rB=finalByKey.get(meleeKey(B));
      for(let n=0;n<battles;n++){
        const winner=meleeFight(A,B);
        if(winner==="A"){rA.wins++;rB.losses++;}
        else if(winner==="B"){rB.wins++;rA.losses++;}
        else{rA.draws++;rB.draws++;}
        phase2Done++; done++;
      }
      pairDone++;
      if(pairDone%25===0){
        const pct=phase2Done/phase2Total*100;
        progress.textContent=`Phase 2/2 — tournoi du Top ${phase2Candidates.toLocaleString("fr-FR")} : ${phase2Done.toLocaleString("fr-FR")} / ${phase2Total.toLocaleString("fr-FR")} (${pct.toFixed(1)}%)`;
        await new Promise(requestAnimationFrame);
      }
    }
  }

  if(!meleeRunning){
    progress.className="status error";
    progress.textContent=`Arrêté — ${done.toLocaleString("fr-FR")} combats terminés.`;
  }else{
    const rows=finalResults.map(r=>({...r,rate:meleeRate(r)}))
      .sort((a,b)=>b.rate-a.rate || b.wins-a.wins || a.losses-b.losses);
    renderMeleeTables(rows);
    document.getElementById("meleeSummary").innerHTML=
      `<div class="section-note"><strong>Phase 1 :</strong> ${phase1Total.toLocaleString("fr-FR")} combats de sélection → Top ${phase2Candidates.toLocaleString("fr-FR")}.</div>`+
      `<div class="section-note" style="margin-top:8px"><strong>Phase 2 :</strong> ${phase2Matchups.toLocaleString("fr-FR")} matchups uniques × ${battles} = ${phase2Total.toLocaleString("fr-FR")} combats.</div>`+
      `<div class="section-note" style="margin-top:8px"><strong>Total :</strong> ${done.toLocaleString("fr-FR")} combats simulés. Le classement final est calculé uniquement avec les résultats de la phase 2.</div>`;
    progress.className="status success";
    progress.textContent=`Terminé — ${done.toLocaleString("fr-FR")} combats au total.`;
  }

  meleeRunning=false;
  document.getElementById("meleeStartBtn").disabled=false;
  document.getElementById("meleeStopBtn").disabled=true;
}

initMeleeUI();
document.getElementById("meleeStartBtn").onclick=()=>runMelee();
document.getElementById("meleeStopBtn").onclick=()=>{meleeRunning=false;};
