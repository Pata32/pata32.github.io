const PUBLISHED_SHEET_ID='2PACX-1vRPESf4SePJuabGEYnafeWuMqMJhHxV78tjI5rqwRYtTsR2rCQqCM2PqQx8C8_pkWx-2vrf7cN1erSF';
const SHEET_GID='1183777585';
const SHEET_URL=`https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pub?gid=${SHEET_GID}&single=true&output=csv`;
const typeClass={Normal:'normal',Feu:'feu',Eau:'eau',Electrique:'electrique',Plante:'plante',Glace:'glace',Combat:'combat',Poison:'poison',Sol:'sol',Vol:'vol',Psy:'psy',Insecte:'insecte',Roche:'roche',Spectre:'spectre',Dragon:'dragon',Ténèbre:'tenebre',Tenebre:'tenebre',Acier:'acier',FEE:'fee',Fée:'fee'};
let capacities=[];
function clean(v){return String(v??'').replace(/^\uFEFF/,'').trim()}
function normalizeHeader(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[🎲💥🎯📏⭐📝]/g,'').replace(/\s+/g,' ')}
function parseCSV(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'){
      if(quoted&&next==='"'){cell+='"';i++}else quoted=!quoted;
    }else if(ch===','&&!quoted){row.push(cell);cell=''}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);cell='';if(row.some(v=>clean(v)!==''))rows.push(row);row=[]}
    else cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell);if(row.some(v=>clean(v)!==''))rows.push(row)}
  return rows;
}
function loadCapacities(){
  document.getElementById('status').textContent='Chargement des capacités…';
  fetch(SHEET_URL,{cache:'no-store'})
    .then(response=>{if(!response.ok)throw new Error(`Google Sheets HTTP ${response.status}`);return response.text()})
    .then(text=>{
      console.log('Google Sheets CSV reçu:',text.slice(0,500));
      const rows=parseCSV(text);
      if(!rows.length)throw new Error('Google Sheets a renvoyé un CSV vide');
      const headerRowIndex=rows.findIndex(row=>row.some(v=>normalizeHeader(v)==='code')&&row.some(v=>normalizeHeader(v)==='nom'));
      if(headerRowIndex<0)throw new Error('Colonnes Code/Nom introuvables dans le CSV Google Sheets');
      const headers=rows[headerRowIndex].map(normalizeHeader);
      const index=(...names)=>{for(const n of names){const i=headers.indexOf(normalizeHeader(n));if(i>=0)return i}return -1};
      const ix={code:index('Code','ID'),name:index('Nom','Capacité'),category:index('Catégorie'),type:index('Type'),utility:index('Utilité'),pa:index('PA'),dice:index('Dés'),damage:index('Dégâts','Degats'),accuracy:index('Précision'),range:index('Portée'),target:index('Cible'),crit:index('Critique'),effect:index('Effet')};
      capacities=rows.slice(headerRowIndex+1).map(row=>({code:clean(row[ix.code]),name:clean(row[ix.name]),category:clean(row[ix.category]),type:clean(row[ix.type]),utility:clean(row[ix.utility]),pa:clean(row[ix.pa]),dice:clean(row[ix.dice]),damage:clean(row[ix.damage]),accuracy:clean(row[ix.accuracy]),range:clean(row[ix.range]),target:clean(row[ix.target]),crit:clean(row[ix.crit]),effect:clean(row[ix.effect])})).filter(x=>x.code&&x.name);
      if(!capacities.length)throw new Error('Aucune capacité trouvée dans le CSV publié');
      render();
      document.getElementById('status').textContent=`${capacities.length} capacités chargées depuis Google Sheets.`;
    })
    .catch(showLoadError);
}
function showLoadError(error){document.getElementById('status').textContent='Erreur Google Sheets : '+error.message;console.error(error)}
function value(v,fallback='—'){return v||fallback}
function render(){const grid=document.getElementById('capacityGrid'),query=clean(document.getElementById('search').value).toLowerCase();const list=capacities.filter(a=>`${a.code} ${a.name} ${a.type} ${a.category}`.toLowerCase().includes(query));grid.innerHTML=list.map(a=>`<article class="capacity-card" data-index="${capacities.indexOf(a)}"><div class="card-top"><span class="code">${a.code}</span><span class="type-badge ${typeClass[a.type]||'normal'}">${a.type||'TYPE'}</span></div><div class="card-title">${a.name}</div><div class="meta"><div class="meta-item"><span class="meta-label">PA</span><span class="meta-value">${value(a.pa)}</span></div><div class="meta-item"><span class="meta-label">Dés</span><span class="meta-value">${value(a.dice)}</span></div><div class="meta-item"><span class="meta-label">Dégâts</span><span class="meta-value">${value(a.damage)}</span></div></div></article>`).join('')||'<div class="capacity-card"><strong>Aucune capacité trouvée.</strong></div>';grid.querySelectorAll('.capacity-card[data-index]').forEach(card=>card.onclick=()=>openDetail(capacities[+card.dataset.index]))}
function openDetail(a){const overlay=document.createElement('div');overlay.className='modal';overlay.innerHTML=`<div class="modal-box"><div class="modal-head"><div><h3>${a.name}</h3><p class="modal-sub"><span class="code">${a.code}</span> · <span class="type-badge ${typeClass[a.type]||'normal'}">${value(a.type)}</span> · ${value(a.category)}</p></div><button class="close" type="button">×</button></div><div class="detail-grid"><div class="detail"><strong>PA</strong><span>${value(a.pa)}</span></div><div class="detail"><strong>Nombre de dés</strong><span>${value(a.dice)}</span></div><div class="detail"><strong>Dégâts</strong><span>${value(a.damage)}</span></div><div class="detail"><strong>Précision</strong><span>${value(a.accuracy)}</span></div><div class="detail"><strong>Portée</strong><span>${value(a.range)}</span></div><div class="detail"><strong>Cible</strong><span>${value(a.target)}</span></div><div class="detail"><strong>Critique</strong><span>${value(a.crit)}</span></div><div class="detail"><strong>Utilité</strong><span>${value(a.utility)}</span></div></div><div class="effect"><h4>Effet</h4><p>${value(a.effect,'Aucun effet supplémentaire.')}</p></div></div>`;document.body.appendChild(overlay);const close=()=>overlay.remove();overlay.querySelector('.close').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc)}})}
document.getElementById('search').addEventListener('input',render);loadCapacities();