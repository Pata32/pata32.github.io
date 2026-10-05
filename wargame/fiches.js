function initFichesUI(){
  const nav=document.querySelector('.tabs');
  const main=document.querySelector('main');
  if(!nav||!main||document.getElementById('tab-fiches')) return;

  const tab=document.createElement('button');
  tab.className='tab';
  tab.dataset.tab='fiches';
  tab.textContent='🃏 Fiches de jeu';
  nav.appendChild(tab);

  const section=document.createElement('section');
  section.id='tab-fiches';
  section.className='tab-pane';
  section.innerHTML=`
    <section class="card">
      <h2>🃏 Générateur de fiches de jeu</h2>
      <p class="dashboard-note">Compose une équipe de 6 Pokémon. Pour chaque Pokémon, choisis 4 attaques et un objet. La fiche générée reprend les statistiques, l'image, les 4 capacités avec leurs informations détaillées et l'objet tenu.</p>
      <div class="section-note"><strong>Images JSON :</strong> le générateur utilise automatiquement <span class="mono">image</span>, <span class="mono">imageUrl</span>, <span class="mono">imageURL</span>, <span class="mono">image_url</span> ou <span class="mono">sprite</span> si l'une de ces propriétés existe sur le Pokémon.</div>
      <div id="fichesBuilder"></div>
      <div class="duel-actions">
        <button class="btn" id="fichesGenerateBtn">🃏 Générer les fiches</button>
        <button class="btn secondary" id="fichesPrintBtn">🖨️ Imprimer / PDF</button>
      </div>
      <div id="fichesOutput" style="margin-top:18px"></div>
    </section>`;
  main.appendChild(section);

  function optionList(list, value, labelFn){
    return list.map((x,i)=>`<option value="${i}" ${String(i)===String(value)?'selected':''}>${esc(labelFn(x))}</option>`).join('');
  }

  function renderBuilder(){
    const saved=JSON.parse(localStorage.getItem('pokemon-wargame-fiches-selection')||'null');
    const slots=Array.from({length:6},(_,i)=>saved?.[i]||{pokemon:db.pokemon[i%Math.max(1,db.pokemon.length)]?.name||'',attacks:[],item:''});
    document.getElementById('fichesBuilder').innerHTML=slots.map((slot,i)=>{
      const p=db.pokemon.find(x=>x.name===slot.pokemon) || db.pokemon[0];
      const selectedAttacks=(slot.attacks||[]).map(code=>db.attacks.findIndex(a=>a.code===code)).filter(n=>n>=0);
      const itemIndex=slot.item ? db.items.findIndex(x=>x.id===slot.item) : -1;
      return `<div class="card" style="margin-top:12px;background:var(--card2)">
        <div class="fighter-top"><h3 style="margin:0">Pokémon ${i+1}</h3><span class="tag">4 attaques</span></div>
        <div class="form-grid">
          <div><label>Pokémon</label><select class="fiche-pokemon" data-slot="${i}">${optionList(db.pokemon,p?db.pokemon.indexOf(p):0,x=>x.name)}</select></div>
          <div><label>Objet</label><select class="fiche-item" data-slot="${i}"><option value="">Aucun objet</option>${optionList(db.items,itemIndex,x=>x.name)}</select></div>
          <div class="wide"><label>Attaque 1</label><select class="fiche-attack" data-slot="${i}" data-attack="0"><option value="">Choisir une attaque</option>${optionList(db.attacks,selectedAttacks[0]??'',x=>x.code+' — '+x.name)}</select></div>
          <div class="wide"><label>Attaque 2</label><select class="fiche-attack" data-slot="${i}" data-attack="1"><option value="">Choisir une attaque</option>${optionList(db.attacks,selectedAttacks[1]??'',x=>x.code+' — '+x.name)}</select></div>
          <div class="wide"><label>Attaque 3</label><select class="fiche-attack" data-slot="${i}" data-attack="2"><option value="">Choisir une attaque</option>${optionList(db.attacks,selectedAttacks[2]??'',x=>x.code+' — '+x.name)}</select></div>
          <div class="wide"><label>Attaque 4</label><select class="fiche-attack" data-slot="${i}" data-attack="3"><option value="">Choisir une attaque</option>${optionList(db.attacks,selectedAttacks[3]??'',x=>x.code+' — '+x.name)}</select></div>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll('.fiche-pokemon,.fiche-item,.fiche-attack').forEach(el=>el.addEventListener('change',saveSelection));
  }

  function getSelection(){
    return Array.from({length:6},(_,i)=>({
      pokemon:document.querySelector(`.fiche-pokemon[data-slot="${i}"]`)?.value||'',
      item:document.querySelector(`.fiche-item[data-slot="${i}"]`)?.value||'',
      attacks:Array.from(document.querySelectorAll(`.fiche-attack[data-slot="${i}"]`)).map(s=>s.value).filter(Boolean)
    }));
  }

  function saveSelection(){
    localStorage.setItem('pokemon-wargame-fiches-selection',JSON.stringify(getSelection()));
  }

  function imageOf(p){
    return p?.image || p?.imageUrl || p?.imageURL || p?.image_url || p?.sprite || '';
  }

  function itemOfFiche(id){ return db.items.find(i=>i.id===id)||null; }

  function statGrid(p){
    const it=itemOfFiche(p.itemId);
    const s=effectiveStats(p,it);
    return `<div class="fiches-stats">
      <div><span>PV</span><strong>${s.hp}</strong></div>
      <div><span>ATQ</span><strong>${s.attack}</strong></div>
      <div><span>DEF</span><strong>${s.defense}</strong></div>
      <div><span>ATQ Spé.</span><strong>${s.spAttack}</strong></div>
      <div><span>DEF Spé.</span><strong>${s.spDefense}</strong></div>
      <div><span>VIT</span><strong>${s.speed}</strong></div>
    </div>`;
  }

  function attackCard(a){
    if(!a) return `<div class="fiche-attack-card"><strong>Attaque non sélectionnée</strong></div>`;
    const cat=a.category==='special'?'Spéciale':'Physique';
    return `<div class="fiche-attack-card">
      <div class="fiche-attack-head"><strong>${esc(a.code)} — ${esc(a.name)}</strong><span class="tag">${cat}</span></div>
      <div class="fiche-attack-grid">
        <div><span>Type</span><strong>${esc(a.type||'—')}</strong></div>
        <div><span>PA</span><strong>${a.ap!=null?a.ap:'—'}</strong></div>
        <div><span>Dés</span><strong>${a.dice!=null?a.dice:'—'}</strong></div>
        <div><span>Dégât/blessure</span><strong>${a.damage!=null?a.damage:'—'}</strong></div>
        <div><span>Précision</span><strong>${esc(a.precision||'—')}</strong></div>
        <div><span>Portée</span><strong>${esc(a.range||'—')}</strong></div>
        <div><span>Cible</span><strong>${esc(a.target||'—')}</strong></div>
        <div><span>Utilité</span><strong>${esc(a.utility||'—')}</strong></div>
      </div>
      <div class="fiche-description">${esc(a.description||'')||'<span class="small">Aucun effet renseigné.</span>'}</div>
    </div>`;
  }

  function renderFiches(){
    saveSelection();
    const selection=getSelection();
    const invalid=selection.filter(s=>!s.pokemon || s.attacks.length!==4);
    if(invalid.length){showStatus('Chaque fiche doit avoir un Pokémon et exactement 4 attaques.','error');return;}

    const cards=selection.map((sel,index)=>{
      const p=db.pokemon.find(x=>x.name===sel.pokemon);
      const item=sel.item ? itemOfFiche(sel.item) : null;
      const img=imageOf(p);
      const attacks=sel.attacks.map(code=>db.attacks.find(a=>a.code===code)).filter(Boolean);
      const effectiveItem=item||itemOfFiche(p.itemId);
      return `<article class="game-sheet">
        <div class="game-sheet-header">
          <div><div class="sheet-number">FICHE ${index+1}</div><h2>${esc(p.name)}</h2><div class="sheet-role">${esc(p.role||'—')} • ${esc(p.type||'—')}</div></div>
          ${img?`<div class="sheet-image-wrap"><img src="${esc(img)}" alt="${esc(p.name)}" onerror="this.parentElement.classList.add('image-error');this.style.display='none';"><span class="image-fallback">Image indisponible</span></div>`:''}
        </div>
        ${statGrid(p)}
        <div class="sheet-item"><strong>🎒 Objet : ${effectiveItem?esc(effectiveItem.name):'Aucun objet'}</strong>${effectiveItem?.description?`<div>${esc(effectiveItem.description)}</div>`:''}</div>
        <h3>⚔️ Capacités</h3>
        <div class="sheet-attacks">${attacks.map(attackCard).join('')}</div>
      </article>`;
    }).join('');
    document.getElementById('fichesOutput').innerHTML=`<div class="fiches-grid">${cards}</div>`;
    showStatus('Les 6 fiches ont été générées.','success');
  }

  document.getElementById('fichesGenerateBtn').onclick=renderFiches;
  document.getElementById('fichesPrintBtn').onclick=()=>window.print();

  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===tab));
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p===section));
    localStorage.setItem('pokemon-wargame-active-tab','fiches');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  renderBuilder();
  if(localStorage.getItem('pokemon-wargame-active-tab')==='fiches') tab.click();
}

const ficheStyle=document.createElement('style');
ficheStyle.textContent=`
.fiches-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.game-sheet{background:#fff;color:#182027;border:2px solid #263238;border-radius:16px;padding:18px;break-inside:avoid;page-break-inside:avoid;box-shadow:0 6px 18px rgba(0,0,0,.2)}
.game-sheet-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #263238;padding-bottom:10px;margin-bottom:12px}
.game-sheet h2{margin:0;font-size:25px}.sheet-number{font-size:10px;font-weight:900;letter-spacing:.12em}.sheet-role{font-size:12px;color:#53616c;margin-top:3px}
.sheet-image-wrap{width:115px;height:115px;border:1px solid #ccd3d8;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f3f5f7;position:relative;flex:none}
.sheet-image-wrap img{max-width:100%;max-height:100%;object-fit:contain}.image-fallback{font-size:10px;color:#8a969e;text-align:center;padding:6px}.sheet-image-wrap img+.image-fallback{display:none}
.image-error .image-fallback{display:block}
.fiches-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px}.fiches-stats div{border:1px solid #d5dce1;border-radius:7px;padding:6px;text-align:center;background:#f7f9fa}.fiches-stats span,.fiche-attack-grid span{display:block;font-size:9px;color:#697780;font-weight:800}.fiches-stats strong{font-size:16px}
.sheet-item{border:1px solid #d5dce1;border-radius:8px;padding:8px;font-size:11px;background:#f7f9fa;margin-bottom:12px}.sheet-item div{margin-top:4px;color:#53616c}
.game-sheet h3{font-size:14px;margin:10px 0 7px}.sheet-attacks{display:grid;grid-template-columns:1fr 1fr;gap:7px}.fiche-attack-card{border:1px solid #cbd3d8;border-radius:8px;padding:8px;background:#fafbfc}.fiche-attack-head{display:flex;justify-content:space-between;gap:5px;align-items:center;font-size:10px;margin-bottom:6px}.fiche-attack-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.fiche-attack-grid div{background:#f0f3f5;border-radius:5px;padding:4px}.fiche-attack-grid strong{font-size:10px}.fiche-description{font-size:9px;line-height:1.35;margin-top:6px;color:#3d4a52;white-space:pre-wrap}
@media(max-width:900px){.fiches-grid{grid-template-columns:1fr}.sheet-attacks{grid-template-columns:1fr}}
@media print{body{background:#fff!important}.tabs-bar,header,.toolbar,#status,#tab-fiches>.card>h2,#tab-fiches>.card>.dashboard-note,#tab-fiches>.card>.section-note,#fichesBuilder,#tab-fiches>.card>.duel-actions{display:none!important}.tab-pane{display:block!important}.game-sheet{box-shadow:none}.fiches-grid{grid-template-columns:1fr 1fr;gap:10px}.game-sheet{font-size:90%}.game-sheet-header{margin-bottom:7px;padding-bottom:7px}.game-sheet h2{font-size:21px}.sheet-image-wrap{width:90px;height:90px}}
`;
document.head.appendChild(ficheStyle);

initFichesUI();
