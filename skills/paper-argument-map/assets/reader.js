/* Offline reader. All source content is rendered as text, never as executable HTML. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let data = JSON.parse($('argument-data').textContent);
  let selected = null, sourceSelected = null, view = 'map', focused = false, dirty = false, toastTimer;
  const roles = {problem:'现实问题',prior:'已有认识',gap:'研究缺口',question:'研究问题',method:'研究设计',finding:'作者报告的发现',contribution:'贡献主张',assumption:'必要条件',limitation:'边界／待核对',joint:'联合推断'};
  const relations = {motivates:'引出',addresses:'回应',supports:'支持',qualifies:'限定',contradicts:'反驳',requires:'共同需要',reports:'报告'};
  const statuses = {explicit:'原文明示',inferred:'模型／读者推断',not_in_input:'当前输入未交代'};
  const reviews = {unreviewed:'尚未复核',accepted:'已接受解读',excluded:'已排除'};
  const NS = 'http://www.w3.org/2000/svg';
  const clone = x => JSON.parse(JSON.stringify(x));
  function el(tag, cls, text) { const x = document.createElement(tag); if(cls) x.className=cls; if(text!==undefined)x.textContent=text; return x; }
  function svg(tag, attrs, text) {const x=document.createElementNS(NS,tag); for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,v); if(text!==undefined)x.textContent=text; return x;}
  function onActivate(x, fn) { x.addEventListener('click',fn); x.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}}); }
  function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',5500);}
  function item(id){return data.nodes.find(x=>x.id===id)||data.edges.find(x=>x.id===id);}
  function node(id){return data.nodes.find(x=>x.id===id);}
  function safeURL(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}

  function check(d){
    if(!d||typeof d!=='object'||Array.isArray(d)||d.schema_version!=='0.1')throw Error('需要 schema_version 为 0.1 的图谱。');
    const nonempty=x=>typeof x==='string'&&x.trim().length>0;
    if(!d.paper||!nonempty(d.paper.title)||!['open_access','synthetic','user_supplied'].includes(d.paper.source_kind))throw Error('论文信息不完整。');
    if(!d.analysis||!['language','input_scope','notice'].every(k=>nonempty(d.analysis[k])))throw Error('缺少分析范围或说明。');
    for(const k of ['passages','nodes','edges','revisions'])if(!Array.isArray(d[k])||d[k].some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error(k+' 必须是对象数组。');
    if(d.nodes.length>300||d.edges.length>1500)throw Error('本阅读器最多支持 300 个节点与 1500 条关系。请拆分为较小的论证图。');
    const ids=new Set();
    for(const x of [...d.passages,...d.nodes,...d.edges]){if(typeof x.id!=='string'||! /^[A-Za-z][A-Za-z0-9_-]*$/.test(x.id)||ids.has(x.id))throw Error('存在无效或重复编号。');ids.add(x.id);}
    const pmap=new Map(d.passages.map(p=>[p.id,p]));
    const nmap=new Map(d.nodes.map(n=>[n.id,n]));
    for(const p of d.passages)if(!['text','section','locator'].every(k=>nonempty(p[k])))throw Error(p.id+' 缺少原文或定位信息。');
    for(const x of [...d.nodes,...d.edges]){
      if(!Object.hasOwn(statuses,x.status)||!Object.hasOwn(reviews,x.review)||typeof x.note!=='string'||typeof x.rationale!=='string'||!Array.isArray(x.basis))throw Error(x.id+' 的状态、笔记或来源格式错误。');
      if(x.status!=='not_in_input'&&!x.basis.length)throw Error(x.id+' 需要原文依据。');
      if(x.status!=='explicit'&&!x.rationale.trim())throw Error(x.id+' 需要说明推断理由或缺失范围。');
      for(const b of x.basis)if(!b||!pmap.has(b.passage_id)||!nonempty(b.quote)||!pmap.get(b.passage_id).text.includes(b.quote))throw Error(x.id+' 的引用无法在对应原文中找到。');
    }
    for(const n of d.nodes)if(!Object.hasOwn(roles,n.role)||!nonempty(n.label)||typeof n.core!=='boolean')throw Error(n.id+' 的节点格式错误。');
    for(const e of d.edges){
      if(!nmap.has(e.source)||!nmap.has(e.target)||e.source===e.target||!Object.hasOwn(relations,e.relation))throw Error(e.id+' 的关系格式错误。');
      if(e.relation==='requires'&&nmap.get(e.target).role!=='joint')throw Error(e.id+' 的必要前提必须指向联合推断。');
    }
    for(const n of d.nodes)if(n.role==='joint'&&new Set(d.edges.filter(e=>e.target===n.id&&e.relation==='requires').map(e=>e.source)).size<2)throw Error(n.id+' 需要至少两个必要前提。');
  }
  function warnings(){
    const notes=[];
    const indegree=new Map(data.nodes.map(n=>[n.id,0]));
    const out=new Map(data.nodes.map(n=>[n.id,[]]));
    for(const e of data.edges){indegree.set(e.target,indegree.get(e.target)+1);out.get(e.source).push(e.target);}
    const queue=[...indegree].filter(([,v])=>v===0).map(([k])=>k);let total=0;
    while(queue.length){const n=queue.pop();total++;for(const t of out.get(n)){indegree.set(t,indegree.get(t)-1);if(indegree.get(t)===0)queue.push(t);}}
    if(total<data.nodes.length)notes.push('存在有向环，已保留供检查；动机与回应形成的环不一定是推理错误。');
    const missing=[...data.nodes,...data.edges].filter(x=>x.status==='not_in_input').length;
    if(missing)notes.push(missing+' 项问题的依据未在当前输入中交代，不能据此断定全文没有依据。');
    const inferred=[...data.nodes,...data.edges].filter(x=>x.status==='inferred').length;
    if(inferred)notes.push(inferred+' 项是模型／读者的重建，需要结合原文判断。');
    const isolated=data.nodes.filter(n=>!data.edges.some(e=>e.source===n.id||e.target===n.id));
    if(isolated.length)notes.push(isolated.length+' 个节点尚未建立关系。');
    if(!data.nodes.length)notes.push('只有原文，尚未进行论证分析。');
    if(data.nodes.length&&!data.nodes.some(n=>n.core))notes.push('没有指定核心节点，当前显示全部节点。');
    const box=$('warnings');box.replaceChildren();
    if(notes.length){const details=el('details'),summary=el('summary','',notes.length+' 项阅读提示 · 原文匹配通过不等于论证成立');details.append(summary);for(const note of notes)details.append(el('p','',note));box.append(details);}
  }
  function init(){
    check(data);document.title=data.paper.title+' · Paper Argument Map';
    $('paper-title').textContent=data.paper.title;
    $('paper-meta').textContent=[data.paper.authors,data.paper.year].filter(Boolean).join(' · ');
    $('source-kind').textContent={synthetic:'合成文本示例',open_access:'开放获取论文',user_supplied:'用户提供文本'}[data.paper.source_kind];
    $('input-scope').textContent='分析范围：'+data.analysis.input_scope;
    $('notice').textContent=data.analysis.notice;
    const url=safeURL(data.paper.url);$('paper-link').hidden=!url;if(url)$('paper-link').href=url;
    $('attribution').textContent=[data.paper.authors,data.paper.license,data.paper.url,data.analysis.generator].filter(Boolean).join(' · ');
    $('passage-count').textContent=data.passages.length+' 段';
    selected=null;sourceSelected=null;focused=false;view='map';$('source-search').value='';$('all-nodes').checked=false;$('show-excluded').checked=false;
    $('detail').replaceChildren(el('div','empty-detail','点击节点或箭头，查看原文依据、推断理由与待核对问题。'));
    setView('map');renderSources();renderGraph();warnings();dirtyUI();
  }
  function basis(){return selected?item(selected).basis:[];}
  function highlightText(text,quotes){
    const ranges=[];
    for(const q of quotes){if(!q)continue;let start=0;while((start=text.indexOf(q,start))!==-1){ranges.push([start,start+q.length]);start+=q.length;}}
    ranges.sort((a,b)=>a[0]-b[0]);const merged=[];
    for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push(range);}
    const frag=document.createDocumentFragment();let pos=0;
    for(const [a,b] of merged){frag.append(document.createTextNode(text.slice(pos,a)),el('mark','',text.slice(a,b)));pos=b;}
    frag.append(document.createTextNode(text.slice(pos)));return frag;
  }
  function renderSources(scrollTo){
    const box=$('passages');box.replaceChildren();const query=$('source-search').value.trim().toLocaleLowerCase();const refs=basis();
    for(const p of data.passages){
      if(query&&!(p.text+' '+p.id+' '+p.locator).toLocaleLowerCase().includes(query))continue;
      const active=p.id===sourceSelected||refs.some(b=>b.passage_id===p.id);
      const article=el('article','passage'+(active?' selected':''));article.id='source-'+p.id;article.tabIndex=0;article.setAttribute('aria-label',p.id+' '+p.locator);
      article.append(el('div','passage-meta',p.id+' · '+p.locator));
      const paragraph=el('p');paragraph.append(highlightText(p.text,refs.filter(b=>b.passage_id===p.id).map(b=>b.quote)));article.append(paragraph);
      onActivate(article,()=>selectPassage(p.id));box.append(article);
    }
    if(!box.children.length)box.append(el('p','empty-results','未找到匹配段落。'));
    if(scrollTo){const target=$('source-'+scrollTo);if(target)box.scrollTo({top:box.scrollTop+target.getBoundingClientRect().top-box.getBoundingClientRect().top-8,behavior:'instant'});}
  }
  function selectPassage(pid){
    selected=null;sourceSelected=pid;focused=false;
    const linked=[...data.nodes,...data.edges].filter(x=>x.basis.some(b=>b.passage_id===pid));
    const box=$('detail');box.replaceChildren(el('h3','',pid+' · 原文对应的解读'),el('p','source-selection-note',linked.length+' 项节点或关系引用了这一段。'));
    for(const x of linked){const b=el('button','source-jump',x.id+' · '+(x.label||relations[x.relation]+'：'+node(x.source).label+' → '+node(x.target).label));b.onclick=()=>select(x.id);box.append(b);}
    renderSources();renderGraph();
  }
  function getVisible(){
    const showExcluded=$('show-excluded').checked,all=$('all-nodes').checked;
    let ns=data.nodes.filter(n=>(showExcluded||n.review!=='excluded')&&(all||n.core||!data.nodes.some(x=>x.core)));
    let ids=new Set(ns.map(n=>n.id));
    let es=data.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&(showExcluded||e.review!=='excluded'));
    if(focused&&selected){
      const focus=node(selected)?[selected]:[item(selected).source,item(selected).target];const keep=new Set(focus);
      for(const direction of ['up','down']){const queue=[...focus],seen=new Set(focus);while(queue.length){const current=queue.shift();for(const e of es){const next=direction==='up'?(e.target===current?e.source:null):(e.source===current?e.target:null);if(next&&!seen.has(next)){seen.add(next);keep.add(next);queue.push(next);}}}}
      ns=ns.filter(n=>keep.has(n.id));es=es.filter(e=>keep.has(e.source)&&keep.has(e.target));
    }
    return {ns,es};
  }
  function lines(text,limit=16){let out=[],line='',units=0;for(const char of text){const size=char.charCodeAt(0)>255?1:.55;if(units+size>limit){out.push(line);line='';units=0;}line+=char;units+=size;}if(line)out.push(line);if(out.length>4)out=[...out.slice(0,3),out[3].slice(0,-1)+'…'];return out;}
  function renderGraph(){
    const {ns,es}=getVisible();$('graph-count').textContent=ns.length+'/'+data.nodes.length+' 节点 · '+es.length+' 关系';
    $('focus-chain').disabled=!selected;$('focus-chain').textContent=focused?'显示完整视图':'只看相关路径';
    const graph=$('graph');graph.replaceChildren();
    const colFor=n=>['problem','prior','gap'].includes(n.role)?0:['question','method','assumption'].includes(n.role)?1:2;
    const columns=[0,1,2].map(c=>ns.filter(n=>colFor(n)===c));
    const W=224,H=130,GAP=42,ROW=157,M=26;
    const width=M*2+W*3+GAP*2,height=Math.max(360,Math.max(...columns.map(c=>c.length),1)*ROW+64);
    graph.setAttribute('viewBox',`0 0 ${width} ${height}`);graph.style.width='max(100%, 720px)';graph.style.height=height+'px';
    const defs=svg('defs');const marker=svg('marker',{id:'arrow',markerWidth:7,markerHeight:7,refX:6,refY:3.5,orient:'auto',markerUnits:'strokeWidth'});marker.append(svg('path',{d:'M0,0 L7,3.5 L0,7 Z',fill:'#8aa69c'}));defs.append(marker);graph.append(defs);
    const positions=new Map();
    for(let c=0;c<3;c++){graph.append(svg('text',{x:M+c*(W+GAP),y:24,fill:'#82958d','font-size':11,'font-family':'sans-serif'},['01  研究缘起','02  问题与设计','03  发现与边界'][c]));columns[c].forEach((n,i)=>positions.set(n.id,{x:M+c*(W+GAP),y:46+i*ROW,c}));}
    if(!ns.length)graph.append(svg('text',{x:30,y:90,fill:'#63757c','font-size':14},'当前视图没有节点。可展开全部或显示已排除项目。'));
    const edgeLayer=svg('g'),labelLayer=svg('g');graph.append(edgeLayer);
    for(let i=0;i<es.length;i++){
      const e=es[i],a=positions.get(e.source),b=positions.get(e.target);let d,lx,ly;
      if(a.c===b.c){const sx=a.x+W-25,sy=a.y+(b.y>a.y?H:0),tx=b.x+W-25,ty=b.y+(b.y>a.y?0:H);d=`M${sx},${sy} C${sx+28},${(sy+ty)/2} ${tx+28},${(sy+ty)/2} ${tx},${ty}`;lx=sx-24;ly=(sy+ty)/2;}
      else {const forward=b.c>a.c,sx=a.x+(forward?W:0),sy=a.y+H*.55,tx=b.x+(forward?0:W),ty=b.y+H*.55;
        if(Math.abs(a.c-b.c)>1){const top=32+i%3*5;d=`M${sx},${sy} C${sx+40},${top} ${tx-40},${top} ${tx},${ty}`;lx=(sx+tx)/2;ly=top+14;}
        else{const bend=Math.max(24,Math.abs(tx-sx)*.55);d=`M${sx},${sy} C${sx+(forward?bend:-bend)},${sy} ${tx-(forward?bend:-bend)},${ty} ${tx},${ty}`;lx=(sx+tx)/2;ly=(sy+ty)/2+(i%2?8:-8);}}
      const active=selected===e.id;edgeLayer.append(svg('path',{d,class:'edge-line'+(e.status!=='explicit'?' inferred-line':'')+(active?' selected':''),'marker-end':'url(#arrow)'}));
      const hit=svg('path',{d,class:'edge-hit',tabindex:0,role:'button','aria-label':e.id+' '+relations[e.relation]+' '+node(e.source).label+' 到 '+node(e.target).label});onActivate(hit,()=>select(e.id));edgeLayer.append(hit);
      const label=svg('g',{class:'edge-label'+(active?' selected':''),transform:`translate(${lx},${ly})`,tabindex:0,role:'button','aria-label':'查看关系 '+e.id});label.append(svg('rect',{x:-22,y:-10,width:44,height:18,rx:4}),svg('text',{'text-anchor':'middle',y:2},relations[e.relation]));onActivate(label,()=>select(e.id));labelLayer.append(label);
    }
    const related=new Set(sourceSelected?data.nodes.filter(n=>n.basis.some(b=>b.passage_id===sourceSelected)).map(n=>n.id):[]);
    if(selected&&!node(selected)){related.add(item(selected).source);related.add(item(selected).target);}
    for(const n of ns){const p=positions.get(n.id);const group=svg('g',{transform:`translate(${p.x},${p.y})`,class:'graph-node'+(selected===n.id?' selected':'')+(related.has(n.id)?' related':'')+(n.review==='excluded'?' excluded':''),tabindex:0,role:'button','aria-label':n.id+' '+n.label,'data-node-id':n.id});
      group.append(svg('rect',{class:'card',width:W,height:H,rx:9}),svg('circle',{cx:16,cy:20,r:3.5,fill:n.status==='explicit'?'#087f7a':n.status==='inferred'?'#a16b15':'#ad5260'}),svg('text',{x:26,y:24,class:'node-role'},roles[n.role]));
      lines(n.label).forEach((line,i)=>group.append(svg('text',{x:15,y:47+i*17,class:'node-label'},line)));
      group.append(svg('text',{x:15,y:H-10,class:'node-state'},n.id+' · '+(n.review==='accepted'?'✓ 已接受解读':n.status==='explicit'?'原文明示':statuses[n.status])));
      const title=svg('title',{},n.label);group.append(title);onActivate(group,()=>select(n.id));graph.append(group);
    }
    graph.append(labelLayer);renderOutline(ns,es);
  }
  function renderOutline(ns,es){const box=$('outline');box.replaceChildren();for(const n of ns){const card=el('article','outline-card'),button=el('button','',n.label);button.onclick=()=>select(n.id);card.append(button,el('small','',n.id+' · '+roles[n.role]+' · '+statuses[n.status]));const links=el('div','outline-edges');for(const e of es.filter(e=>e.source===n.id)){const b=el('button','',relations[e.relation]+' → '+node(e.target).label);b.onclick=()=>select(e.id);links.append(b);}card.append(links);box.append(card);}if(!ns.length)box.append(el('p','empty-results','当前视图没有节点。'));}
  function select(id){selected=id;sourceSelected=null;$('source-search').value='';renderGraph();renderSources(item(id).basis[0]?.passage_id);renderDetail();}
  function renderDetail(){
    if(!selected)return;const x=item(selected),isNode=!!node(selected),box=$('detail');box.replaceChildren();
    const top=el('div','detail-top');top.append(el('span','badge',x.id+' · '+(isNode?roles[x.role]:'关系：'+relations[x.relation])),el('span','badge'+(x.status==='inferred'?' inferred-badge':x.status==='not_in_input'?' missing-badge':''),statuses[x.status]),el('span','badge',reviews[x.review]));box.append(top);
    box.append(el('h3','',isNode?x.label:node(x.source).label+' → '+node(x.target).label));
    if(x.rationale)box.append(el('p','',x.rationale));
    if(!x.basis.length)box.append(el('p','muted','当前输入中没有对应证据片段。请结合上述范围说明阅读。'));
    for(const b of x.basis){const p=data.passages.find(p=>p.id===b.passage_id),jump=el('button','source-jump',p.id+' · '+p.locator+' ↗');jump.onclick=()=>{$('source-search').value='';renderSources(p.id);};box.append(jump,el('blockquote','',b.quote));}
    if(x.note)box.append(el('p','review-note','我的笔记：'+x.note));
    const actions=el('div','detail-actions');
    for(const [label,fn] of [['编辑表述／笔记',openEdit],[x.review==='accepted'?'撤销接受':'接受此解读',()=>review(x.review==='accepted'?'unreviewed':'accepted')],[x.review==='excluded'?'恢复项目':'排除此项',()=>review(x.review==='excluded'?'unreviewed':'excluded')]]){const b=el('button','',label);b.onclick=fn;actions.append(b);}box.append(actions);
  }
  function commitChanges(x,changes){const before={};for(const key of Object.keys(changes))before[key]=clone(x[key]);Object.assign(x,changes);data.revisions.push({timestamp:new Date().toISOString(),item_id:x.id,before,after:clone(changes)});dirty=true;dirtyUI();warnings();renderGraph();renderSources();renderDetail();}
  function review(state){commitChanges(item(selected),{review:state});toast(state==='excluded'?'已排除。原始数据仍保留，可开启“显示已排除”恢复。':'已更新解读状态。');}
  function dirtyUI(){$('dirty-state').textContent=dirty?'有修改尚未导出 · '+data.revisions.length+' 条修订记录':'修订记录 '+data.revisions.length+' 条';$('dirty-state').classList.toggle('dirty',dirty);}
  function openEdit(){const x=item(selected);$('label-field').hidden=!node(selected);$('edit-label').value=x.label||'';$('edit-status').value=x.status;$('edit-rationale').value=x.rationale;$('edit-note').value=x.note;$('edit-error').textContent='';$('edit-dialog').showModal();}
  $('edit-form').addEventListener('submit',e=>{e.preventDefault();const x=item(selected),changes={status:$('edit-status').value,rationale:$('edit-rationale').value.trim(),note:$('edit-note').value.trim()};if(node(selected))changes.label=$('edit-label').value.trim();const candidate=clone(data);Object.assign(candidate.nodes.find(n=>n.id===selected)||candidate.edges.find(n=>n.id===selected),changes);try{check(candidate);}catch(err){$('edit-error').textContent=err.message;return;}commitChanges(x,changes);$('edit-dialog').close();});
  $('cancel-edit').onclick=()=>$('edit-dialog').close();
  function setView(next){view=next;$('map-container').hidden=view!=='map';$('outline').hidden=view!=='outline';$('view-map').setAttribute('aria-pressed',String(view==='map'));$('view-outline').setAttribute('aria-pressed',String(view==='outline'));}
  function cleanData(){const result=clone(data);delete result.validation_warnings;return result;}
  function packedJSON(d){return JSON.stringify(d,null,2).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
  function download(text,type,suffix){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='paper-argument-map'+suffix;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;dirtyUI();toast('已导出文件。请保留下载的文件以保存修改。');}
  $('export-json').onclick=()=>download(JSON.stringify(cleanData(),null,2)+'\n','application/json;charset=utf-8','.json');
  $('export-html').onclick=()=>{const doc=document.documentElement.cloneNode(true);doc.querySelector('#argument-data').textContent=packedJSON(cleanData());doc.querySelector('#edit-dialog').removeAttribute('open');doc.querySelector('#toast').style.display='none';download('<!doctype html>\n'+doc.outerHTML,'text/html;charset=utf-8','.html');};
  $('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>15*1024*1024)throw Error('文件超过 15 MB，请使用较小的图谱。');const candidate=JSON.parse(await file.text());check(candidate);if(dirty&&!window.confirm('当前修改尚未导出。仍然导入并替换当前图谱？'))return;data=candidate;dirty=false;init();toast('图谱已导入，来源匹配检查通过。');}catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}};
  $('view-map').onclick=()=>setView('map');$('view-outline').onclick=()=>setView('outline');
  $('all-nodes').onchange=()=>{focused=false;renderGraph();};$('show-excluded').onchange=renderGraph;
  $('focus-chain').onclick=()=>{focused=!focused;renderGraph();};
  $('reset-view').onclick=()=>{focused=false;selected=null;sourceSelected=null;$('all-nodes').checked=false;$('show-excluded').checked=false;$('source-search').value='';$('detail').replaceChildren(el('p','muted','点击节点或箭头查看原文依据。'));renderGraph();renderSources();};
  $('source-search').oninput=()=>renderSources();$('clear-source').onclick=()=>{selected=null;sourceSelected=null;focused=false;renderSources();renderGraph();$('detail').replaceChildren(el('p','muted','已清除选择。'));};
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  try{init();}catch(err){$('notice').textContent='图谱加载失败：'+err.message;}
})();
