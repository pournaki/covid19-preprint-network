// Get the list of all users for autocomplete

var fieldhighlighted = false
var colored = false
var nodestoexport = []
exportstring = ""

var users = []
for(var i in data.nodes)
{users.push(data.nodes[i].title)};

function returninfo(node, metadata){
    ui = `
<h5>${metadata[node.id].title}</h5>
<h6>${metadata[node.id].authors}</h6>
<ul> 
<li> <b>Category</b>: ${metadata[node.id].subfield}
<li> <b>Released</b>: ${metadata[node.id].date} on ${metadata[node.id].server}
<li> <b>Abstract</b>: ${metadata[node.id].abstract}</p>
<li> <b>DOI</b>: <a style="font-size:10pt;margin-top:0" target="_blank" rel="noopener noreferrer" href="https://dx.doi.org/${metadata[node.id].doi}">${metadata[node.id].doi}</a>
</ul>`
    return ui
}

// USER INFO ON CLICK
Graph.onNodeClick((node =>  {
// load the metadata file to look up the right node info:
fetch('./data/graph_metadata.json')
  .then((response) => {
    return response.json();
  })
  .then((metadata) => {
    ;
  ;
userinfostring = returninfo(node, metadata)
document.getElementById('userinfostring').innerHTML = userinfostring
document.getElementById("searchuser").value = node.title
$("#content03").slideDown(300)})

highlight(node)}))

var input = document.getElementById("searchuser");
new Awesomplete(input, {
list: users
});

// HIGHLIGHT NODES ON CLICK TO SEE THE BEST ONES
function highlight(node) {
  nodestoexport = []
  nodestoexport.push(node.id)
  
  colored = true
  // reinitialize cols
   
  // get neighbors for coloring
  var neighbors = []
  neighbors.push(node)
  var goodlinks = []
  for (link of data.links) {
    if (link.source == node) {
      neighbors.push(link.target)
      nodestoexport.push(link.target.id)
      link.colorthat = 1
    }
    else if (link.target == node){
      neighbors.push(link.source)
      nodestoexport.push(link.source.id)
      link.colorthat = 1
    }
    else {link.colorthat=0}
  }
  for (node of data.nodes){
    if(neighbors.includes(node)){
      node.colorthat = 1
    }
    else node.colorthat = 0
  }
  colorbar = ['#d3d3d3', 'red']

  if (fieldhighlighted === false)
  {Graph.nodeColor(() => 'black') 
    Graph.nodeColor(node => colorbar[node.colorthat])

  // linkcolor depending on dark/lightmode
  var bodyelement = document.querySelector('body')
  var bodystyle = window.getComputedStyle(bodyelement)
  var bg = bodystyle.getPropertyValue('color')
  if (bg === 'rgb(0, 0, 0)') {var colorbar2 = ['rgba(0,0,0,0.05)', 'rgba(255,0,0,0.5)']}
  if (bg === 'rgb(255, 255, 255)') {var colorbar2 = ['rgba(255,255,255,0.03)', 'rgba(255,0,0,0.5)']}

  Graph.linkColor(link => colorbar2[link.colorthat])}
  $("#content03").slideDown(300)
  }


function exportnodes(){

exportstring = ""

var uniquenodestoexport = [];
$.each(nodestoexport, function(i, el){
    if($.inArray(el, uniquenodestoexport) === -1) uniquenodestoexport.push(el);
});

fetch('./data/graph_metadata.json')
  .then((response) => {
    return response.json();
  })
  .then((metadata) => {
  for (node of uniquenodestoexport)
    {title = metadata[node].title;
    authors = metadata[node].authors;
    rightstring = `${title}` + `, ` + `${authors}` + `, ` + `2020`
    exportstring += rightstring
    exportstring += "\n"}

  var dllink = document.createElement('a');
  dllink.download = 'preprints.txt';
  var blob = new Blob([exportstring], {type: 'text/plain'});
  dllink.href = window.URL.createObjectURL(blob);
  dllink.click();

  })

}

// GET THE LATEST PUBLICATIONS
function getlatest () {
  nodestoexport = []
  Graph.nodeColor(() => 'black')  
  var today = new Date();
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var bfyesterday = new Date();
  bfyesterday.setDate(bfyesterday.getDate() - 2);
var nodelist = []
  var datelist = [today, yesterday, bfyesterday]
  var dates = []
  for (day of datelist){
  var dd = String(day.getDate()).padStart(2, '0');
  var mm = String(day.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = day.getFullYear();    
  day = yyyy + '-' + mm + '-' + dd;
  dates.push(day)}
  
  fetch('./data/graph_metadata.json')
  .then((response) => {
    return response.json();
  })
  .then((metadata) => {
  for (node of data.nodes)  {
    nodesdate = metadata[node.id].date
    if (dates.includes(nodesdate)){
      node.colorthat = 1;
      nodestoexport.push(node.id)
    }
    else {node.colorthat = 0}
  colored = true
  colorbar = ['#d3d3d3', 'red']
  Graph.nodeColor(node => colorbar[node.colorthat])
  var bodyelement = document.querySelector('body')
  var bodystyle = window.getComputedStyle(bodyelement)
  var bg = bodystyle.getPropertyValue('color')
  if (bg === 'rgb(0, 0, 0)') {var lamecol = 'rgba(0,0,0,0.05)'}
  if (bg === 'rgb(255, 255, 255)') {var lamecol = 'rgba(255,255,255,0.03)'}
  Graph.linkColor (() => lamecol)
  Graph.linkColor(link => {
    if (link.source.colorthat === 1 &&
        link.target.colorthat === 1)
      { return 'rgba(255,0,0,0.4)'}
    else {return lamecol}
  })
  }
})

$("#content06").slideUp(300)}

var colordict = data.graph.colordict

function fieldcolor () {
  colored = true
  var bodyelement = document.querySelector('body')
  var bodystyle = window.getComputedStyle(bodyelement)
  var bg = bodystyle.getPropertyValue('color')
  if (bg === 'rgb(255, 255, 255)') {
    Graph.linkColor(() => 'rgba(255,255,255,0.1)');
    }
  else if (bg === 'rgb(0, 0, 0)') {
    Graph.linkColor(() => 'rgba(0,0,0,0.1)')
    }  
  Graph.nodeColor(node => colordict[node.subfield]);
  $("#content06").slideDown(300)
}


// --- BUTTONS ----------
// OPEN ARTICLE ON CLICK
function openart(){
var title = document.getElementById("searchuser").value;
const getNode = id => {
return data.nodes.find(node => node.title === title);
}
var nodo = getNode(title)
fetch('./data/graph_metadata.json')
  .then((response) => {
    return response.json();
  })
  .then((metadata) => {
window.open(`https://dx.doi.org/${metadata[nodo.id].doi}`, '_blank')    
})}

// FETCH INFO ON CLICK
function fetchinfo(){
var title = document.getElementById("searchuser").value;
const getNode = id => {
return data.nodes.find(node => node.title === title);
}
var nodo = getNode(title)
fetch('./data/graph_metadata.json')
  .then((response) => {
    return response.json();
  })
  .then((metadata) => {
var userinfostring = returninfo(nodo, metadata)
document.getElementById('userinfostring').innerHTML = userinfostring
highlight(nodo)
})}

Graph.onBackgroundClick(() => resetcolors())
Graph.onLinkClick(() => resetcolors())

// RESET TO BLACK
function resetcolors(){
  fieldhighlighted = false
  colored = false
  var bodyelement = document.querySelector('body')
  var bodystyle = window.getComputedStyle(bodyelement)
  var bg = bodystyle.getPropertyValue('color')
  if (bg === 'rgb(255, 255, 255)') {
    Graph.linkColor(() => 'rgba(255,255,255,0.1)');
    Graph.nodeColor(() => 'white')}
  else if (bg === 'rgb(0, 0, 0)') {
    Graph.linkColor(() => 'rgba(0,0,0,0.1)')
    Graph.nodeColor(() => 'black')}
  $("#content06").slideUp(300)
  $("#content03").slideUp(300)
  document.getElementById("searchuser").value = ""
  nodestoexport = []
}


function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
    }
    throw new Error('Bad Hex');
}


// HIDE ALL THAT ARE NOT IN THAT CATEGORY
function highfield (cat) {
  nodestoexport = []
  fieldhighlighted = true
  fetch('./data/graph_metadata.json')
  .then((response) => {
    return response.json();
  })
  .then((metadata) => {
  for (node of data.nodes) {
    node.subfield = metadata[node.id].subfield}  
  colored = true

  // linkcolor depending on dark/lightmode
  var bodyelement = document.querySelector('body')
  var bodystyle = window.getComputedStyle(bodyelement)
  var bg = bodystyle.getPropertyValue('color')
  if (bg === 'rgb(0, 0, 0)') {var lamecol = 'rgba(0,0,0,0.05)'}
  if (bg === 'rgb(255, 255, 255)') {var lamecol = 'rgba(255,255,255,0.03)'}
  Graph.linkColor (() => lamecol)
  Graph.linkColor(link => {
    if (metadata[link.source.id].subfield === cat &&
        metadata[link.target.id].subfield === cat)
      { var colhex = colordict[link.source.subfield];
        var colrgba = hexToRgbA(colhex);
        var colrgba_right = colrgba.slice(0,-2) + '0.5)'
        return colrgba_right}
    else {return lamecol}
  })
  Graph.nodeColor(node => { 
    if (node.subfield === cat) {
      nodestoexport.push(node.id);
      return colordict[node.subfield];}
      else {return '#d3d3d3'}});

})}


// LIGHT / DARK MODE
var checkbox = document.querySelector('input[name=mode]');      
checkbox.addEventListener('change', function() {
if(this.checked) {
trans()
document.documentElement.setAttribute('data-theme', 'darktheme');
Graph.linkColor(() => 'rgba(255,255,255,0.1)');
//var colorselector = document.getElementById("nodecolor");
//var selectedoption = colorselector.options[colorselector.selectedIndex].value               
if (colored == false) {Graph.nodeColor(() => 'white')}
} 
else {
trans()
document.documentElement.setAttribute('data-theme', 'lighttheme');
Graph.linkColor(() => 'rgba(0,0,0,0.1)');
//var colorselector = document.getElementById("nodecolor");
//var selectedoption = colorselector.options[colorselector.selectedIndex].value                               
if (colored == false) {Graph.nodeColor(() => 'black')}
}
})
let trans = () => {
document.documentElement.classList.add('transition');
window.setTimeout(() => {
document.documentElement.classList.remove('transition');
}, 1000)
}

// ----------------------

// INCLUDE NETWORK INFORMATION FROM GRAPH DATA
var udt = `
There are currently ${data.graph.N_nodes} preprints in the database.<br>
Last updated: ${data.graph.date}
`
legstring = data.graph.legend
document.getElementById('leghere').innerHTML = legstring
document.getElementById('updatetime').innerHTML = udt