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
      <h2>💥 Mêlée générale — tournoi exhaustif</h2>
      <p class="dashboard-note">Chaque combinaison <strong>Pokémon + attaque + objet</strong> affronte <strong>toutes les autres combinaisons</strong>. Les combats utilisent les mêmes règles que le duel.</p>
      <div class="section-note"><strong>Principe :</strong> il s'agit d'un tournoi exhaustif. Une configuration ne s'affronte pas elle-même. Pour chaque paire de configurations, plusieurs combats peuvent être joués et les résultats sont attribués aux deux configurations.</div>
      <div class="form-grid">
        <div><label>Combats par matchup</label><input id="meleeBattles" type="number" min="1" max="50" value="5"></div>
        <div><label>Configurations</label><div class="section-note" style="margin:0">Pokémon × attaques × objets</div></div>
        <div><label>Matchups</label><div class="section-note" style="margin:0">Chaque paire unique de configurations</div></div>
        <div><label>Limite</label><div class="section-note" style="margin:0">100 phases maximum / combat</div></div>
      </div>
      <div class="duel-actions"><button class="btn" id="meleeStartBtn">💥 Lancer le tournoi</button><button class="btn secondary" id="meleeStopBtn" disabled>⏹ Arrêter</button></div>
      <div id="meleeProgress" class="status" style="margin-top:14px">Prêt à lancer.</div>
      <div id="meleeSummary"></div>
      <div class="grid" style="margin-top:16px">
        <section class="card"><h3>🏆 Top 10</h3><div class="scroll"><table id="meleeTopTable"></table></div></section>
        <section class="card"><h3>💀 Top 10 des pires</h3><div class="scroll"><table id="meleeWorstTable"></table></div></section>
      </div>
      <section class="card" style="margin-top:16px"><h3>📊 Toutes les configurations</h3><div class="scroll"><table id="meleeFullTable"></table></div></section>
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

function renderMeleeTables(rows){
  const top=rows.slice(0,10);
  const worst=rows.slice().reverse().slice(0,10);
  const table=(arr)=>`<thead><tr><th>#</th><th class="left">Pokémon</th><th class="left">Attaque</th><th class="left">Objet</th><th>Victoires</th><th>Défaites</th><th>Nuls</th><th>Taux</th></tr></thead><tbody>`+
    arr.map((r,i)=>`<tr><td>${i+1}</td><td class="left"><strong>${esc(r.name)}</strong></td><td class="left">${esc(r.attack)}</td><td class="left">${esc(r.item)}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.draws}</td><td><strong>${r.rate.toFixed(1)}%</strong></td></tr>`).join("")+`</tbody>`;
  document.getElementById("meleeTopTable").innerHTML=table(top);
  document.getElementById("meleeWorstTable").innerHTML=table(worst);
  document.getElementById("meleeFullTable").innerHTML=table(rows);
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

  const matchupCount=configs.length*(configs.length-1)/2;
  const totalCombats=matchupCount*battles;
  const results=configs.map(c=>({
    key:meleeKey(c), name:c.p.name, attack:c.a.name, item:c.i?.name||"Sans objet",
    wins:0, losses:0, draws:0, rate:0
  }));
  const resultByKey=new Map(results.map(r=>[r.key,r]));

  let done=0, pairDone=0;
  const progress=document.getElementById("meleeProgress");
  progress.className="status";
  progress.textContent=`Tournoi en cours… 0 / ${totalCombats.toLocaleString("fr-FR")} combats`;

  // On traite des paquets de matchups puis on rend la main au navigateur.
  // Chaque paire de configurations n'est jouée qu'une seule fois.
  for(let i=0;i<configs.length-1 && meleeRunning;i++){
    for(let j=i+1;j<configs.length && meleeRunning;j++){
      const A=configs[i], B=configs[j];
      const rA=resultByKey.get(meleeKey(A));
      const rB=resultByKey.get(meleeKey(B));

      for(let n=0;n<battles;n++){
        const winner=meleeFight(A,B);
        if(winner==="A"){rA.wins++;rB.losses++;}
        else if(winner==="B"){rB.wins++;rA.losses++;}
        else{rA.draws++;rB.draws++;}
        done++;
      }

      pairDone++;
      if(pairDone%25===0){
        const pct=done/totalCombats*100;
        progress.textContent=`Tournoi en cours… ${done.toLocaleString("fr-FR")} / ${totalCombats.toLocaleString("fr-FR")} (${pct.toFixed(1)}%)`;
        await new Promise(requestAnimationFrame);
      }
    }
  }

  if(!meleeRunning){
    progress.className="status error";
    progress.textContent=`Tournoi arrêté — ${done.toLocaleString("fr-FR")} combats terminés.`;
  }else{
    const rows=results.map(r=>({
      ...r,
      rate:(r.wins+r.draws*0.5)/(r.wins+r.losses+r.draws)*100
    })).sort((a,b)=>b.rate-a.rate || b.wins-a.wins || a.losses-b.losses);

    renderMeleeTables(rows);
    document.getElementById("meleeSummary").innerHTML=`<div class="section-note"><strong>Tournoi terminé.</strong> ${configs.length.toLocaleString("fr-FR")} configurations, ${matchupCount.toLocaleString("fr-FR")} matchups uniques et ${done.toLocaleString("fr-FR")} combats simulés. Chaque configuration a affronté toutes les autres. Le taux de victoire compte un nul pour 50%.</div>`;
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
