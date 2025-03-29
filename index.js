/*
    Récupère le nombre de cartes totales présente dans le deck
*/
function f_js_getTotalDeckCards(){
    let totalDeckCards = document.getElementById('totalDeckCards').value;
    return totalDeckCards;
}

/*
    Récupère le nombre de cartes piochées
*/
function f_js_getCardsDraw(){
    let cardsDraw = document.getElementById('cardsDraw').value;
    return cardsDraw;
}

/*
    Récupère le nombre de cartes piochées
*/
function f_js_getNbrOccurences(){
    let nbrOccurences = document.getElementById('nbrOccurences_1').value;
    return nbrOccurences;
}

/*
    Ajoute une entrée
*/
function f_js_addEntry(){
    var divEntry = document.getElementById('entry');
    var nbrChild = document.getElementsByClassName('entrys').length;

    var idChild = nbrChild+1;

    var newDiv = divEntry.appendChild(document.createElement('div'));
    newDiv.setAttribute('class','entrys');

    var newP = document.createElement('p');
    newP.innerText = `Entrée ${idChild}`;
    newDiv.appendChild(newP);

    var newP = document.createElement('label');
    newP.innerText = `Nombre d'occurence de la carte dans le deck`;
    newDiv.appendChild(newP);

    var newInput = document.createElement('input');
    newInput.setAttribute('class','input-cards');
    newInput.setAttribute('id',`n_${idChild}`);
    newInput.setAttribute('type',`text`);
    newInput.setAttribute('value',`4`);
    newDiv.appendChild(newInput);

    var newP = document.createElement('label');
    newP.innerText = `Nombre de carte désiré`;
    newDiv.appendChild(newP);

    var newInput = document.createElement('input');
    newInput.setAttribute('class','input-cards');
    newInput.setAttribute('id',`k_${idChild}`);
    newInput.setAttribute('type',`text`);
    newInput.setAttribute('value',`1`);
    newDiv.appendChild(newInput);
    //console.log(nbrChild);
}


/*
    Calcule le factoriel '!' du nombre passé en paramètre.
*/
function m_factorial(n){
    let result = 1;
    for(let i = 1; i <= n; i++){
        result *= i;
    }
    return result;
}

/*
    Calcule C(n, k) = n! / (k! * (n-k)!)
*/
function m_combination(n, k) {
    // Optimisation: utiliser min(k, n-k) pour réduire les calculs
    if (k > n - k) {
        k = n - k;
    }
    
    let result = 1;
    for (let i = 1; i <= k; i++) {
        result *= (n - (k - i));
        result /= i;
    }
    
    return result;
}

/*
    Calcule la probabilité exact
*/
function calculateProbabilityExact(total, draw, occurence, wanted) {
    const top = m_combination(occurence, wanted) * m_combination(total - occurence, draw - wanted);
    const bottom = m_combination(total, draw);
  
    return (top / bottom);
}

/*
    Calcule la probabilité d'avoir au moins
*/
function calculateProbability(total,draw,occurence){
    return 1 - m_combination(total-occurence,draw) / m_combination(total,draw);
}

/*
    Calcule la probabilité
*/
function f_js_calculProba(){
    let N = parseInt(document.getElementById("N").value);
    let K = parseInt(document.getElementById("K").value);
  
    var nbrChild = document.getElementsByClassName('entrys');

    if(nbrChild.length > 1){
        var array = [];
        for(var j = 1; j <= nbrChild.length; j++){
            array.push(parseInt(document.getElementById(`n_${j}`).value));
        }
        var proba = probabilityAtLeastOneOfEachGroup(N,K,array);
        console.log(array);
        document.getElementById('exact').innerText = '';
        document.getElementById('minimum').innerText = `Probabilité au moins une fois les ${j-1} cartes est de ≃ ${(proba*100).toFixed(2)}%`;  
    }else{
        let n = parseInt(document.getElementById("n_1").value);
        let k = parseInt(document.getElementById("k_1").value);
        let probaExact = calculateProbabilityExact(N,K,n,k);
        document.getElementById('exact').innerText = `Probabilité d'avoir exactement ${k} fois la carte est de : ${(probaExact*100).toFixed(2)}%`;
    
        let minimum = calculateProbability(N,K,n);
        document.getElementById('minimum').innerText = `Probabilité au moins une fois la carte est de : ${(minimum*100).toFixed(2)}%`;  
    } 
}


function probabilityAtLeastOneOfEachGroup(total, draw, groups) {
    // 1) Vérification de faisabilité
    if (groups.length > draw) {
        return 0;
    }
  
    // 2) Nombre total de manières de piocher 'draw' cartes dans 'total'
    const totalCombos = m_combination(total, draw);
  
    // 3) Parcours de tous les sous-ensembles de 'groups'
    let sumProb = 0;
    const n = groups.length;
  
    for (let s = 0; s < (1 << n); s++) {
        let countInSubset = 0;
        let sumGroupSizes = 0;
  
        for (let i = 0; i < n; i++) {
            if ((s & (1 << i)) !== 0) {
                countInSubset++;
                sumGroupSizes += groups[i];
            }
        }
  
        let pNoS = 0;
        if (total - sumGroupSizes >= draw) {  // Vérification importante!
            pNoS = m_combination(total - sumGroupSizes, draw) / totalCombos;
        }
      
        if (countInSubset % 2 === 1) {
            sumProb -= pNoS;
        } else {
            sumProb += pNoS;
        }
    }
  
    return sumProb;
}
  
