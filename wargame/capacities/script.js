const SHEET_ID='1TMKWMQhyWdGK7gimvBYuSujIGaGAMmAOtXVrSZvJpY4';
const SHEET_GID='1183777585';
const SHEET_URL=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}&range=A4:M1000&headers=1&tqx=out:json;responseHandler:handleGoogleSheets`;
const typeClass={Normal:'normal',Feu:'feu',Eau:'eau',Electrique:'electrique',Plante:'plante',Glace:'glace',Combat:'combat',Poison:'poison',Sol:'sol',Vol:'vol',Psy:'psy',Insecte:'insecte',Roche:'roche',Spectre:'spectre',Dragon:'dragon',Ténèbre:'tenebre',Tenebre:'tenebre',Acier:'acier',FEE:'fee',Fée:'fee'};
let capacities=[];
function clean(v){return String(v??'').replace(/^\uFEFF/,'').trim()}
function normalizeHeader(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[🎲💥🎯📏⭐📝]/g,'').replace(/\s+/g,' ')}
function cellValue(cell){return cell&&cell.v!=null?clean(cell.v):''}
function loadCapacities(){
  window.handleGoogleSheets=function(data){
    try{
      const table=data&&data.table;
      if(!table||!table.cols) throw new Error('Réponse Google Sheets invalide');
      const headers=table.cols.map(c=>normalizeHeader(c.label||c.id||''));
      const index=(...names)=>{for(const n of names){const i=headers.indexOf(normalizeHeader(n));if(i>=0)return i}return -1};
      const ix={code:index('Code','ID'),name:index('Nom','Capacité'),category:index('Catégorie'),type:index('Type'),utility:index('Utilité'),pa:index('PA'),dice:index('Dés'),damage:index('Dégâts','Degats'),accuracy:index('Précision'),range:index('Portée'),target:index('Cible'),crit:index('Critique'),effect:index('Effet')};
      if(ix.code<0||ix.name<0) throw new Error(`Colonnes Code/Nom introuvables. En-têtes reçus: ${headers.join(' | ')}`);
      capacities=(table.rows||[]).map(row=>({
        code:cellValue(row.c?.[ix.code]),name:cellValue(row.c?.[ix.name]),category:cellValue(row.c?.[ix.category]),type:cellValue(row.c?.[ix.type]),utility:cellValue(row.c?.[ix.utility]),pa:cellValue(row.c?.[ix.pa]),dice:cellValue(row.c?.[ix.dice]),damage:cellValue(row.c?.[ix.damage]),accuracy:cellValue(row.c?.[ix.accuracy]),range:cellValue(row.c?.[ix.range]),target:cellValue(row.c?.[ix.target]),crit:cellValue(row.c?.[ix.crit]),effect:cellValue(row.c?.[ix.effect])
      })).filter(x=>x.code&&x.name);
      render();
      document.getElementById('status').textContent=`${capacities.length} capacités chargées depuis Google Sheets.`;
    }catch(error){showLoadError(error)}
    delete window.handleGoogleSheets;
  };
  const old=document.getElementById('google-sheets-script'); if(old)old.remove();
  const script=document.createElement('script');
  script.id='google-sheets-script';
  script.src=SHEET_URL;
  script.onerror=()=>showLoadError(new Error('Échec du chargement Google Sheets'));
  document.head.appendChild(script);
}
function showLoadError(error){document.getElementById('status').textContent='Impossible de charger Google Sheets. Vérifie que la feuille est bien publiée et accessible.';console.error(error)}
function value(v,fallback='—'){return v||fallback}
function render(){const grid=document.getElementById('capacityGrid'),query=clean(document.getElementById('search').value).toLowerCase();const list=capacities.filter(a=>`${a.code} ${a.name} ${a.type} ${a.category}`.toLowerCase().includes(query));grid.innerHTML=list.map(a=>`<article class="capacity-card" data-index="${capacities.indexOf(a)}"><div class="card-top"><span class="code">${a.code}</span><span class="type-badge ${typeClass[a.type]||'normal'}">${a.type||'TYPE'}</span></div><div class="card-title">${a.name}</div><div class="meta"><div class="meta-item"><span class="meta-label">PA</span><span class="meta-value">${value(a.pa)}</span></div><div class="meta-item"><span class="meta-label">Dés</span><span class="meta-value">${value(a.dice)}</span></div><div class="meta-item"><span class="meta-label">Dégâts</span><span class="meta-value">${value(a.damage)}</span></div></div></article>`).join('')||'<div class="capacity-card"><strong>Aucune capacité trouvée.</strong></div>';grid.querySelectorAll('.capacity-card[data-index]').forEach(card=>card.onclick=()=>openDetail(capacities[+card.dataset.index]))}
function openDetail(a){const overlay=document.createElement('div');overlay.className='modal';overlay.innerHTML=`<div class="modal-box"><div class="modal-head"><div><h3>${a.name}</h3><p class="modal-sub"><span class="code">${a.code}</span> · <span class="type-badge ${typeClass[a.type]||'normal'}">${value(a.type)}</span> · ${value(a.category)}</p></div><button class="close" type="button">×</button></div><div class="detail-grid"><div class="detail"><strong>PA</strong><span>${value(a.pa)}</span></div><div class="detail"><strong>Nombre de dés</strong><span>${value(a.dice)}</span></div><div class="detail"><strong>Dégâts</strong><span>${value(a.damage)}</span></div><div class="detail"><strong>Précision</strong><span>${value(a.accuracy)}</span></div><div class="detail"><strong>Portée</strong><span>${value(a.range)}</span></div><div class="detail"><strong>Cible</strong><span>${value(a.target)}</span></div><div class="detail"><strong>Critique</strong><span>${value(a.crit)}</span></div><div class="detail"><strong>Utilité</strong><span>${value(a.utility)}</span></div></div><div class="effect"><h4>Effet</h4><p>${value(a.effect,'Aucun effet supplémentaire.')}</p></div></div>`;document.body.appendChild(overlay);const close=()=>overlay.remove();overlay.querySelector('.close').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc)}})}
document.getElementById('search').addEventListener('input',render);loadCapacities();