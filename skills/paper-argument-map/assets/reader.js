/* Offline argument reader. User and source text are always rendered with textContent. */
(() => {
'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg', clone=x=>JSON.parse(JSON.stringify(x));
let data=JSON.parse($('argument-data').textContent), lang='en', level='plain', selected=null, sourceSelected=null, full=false, outline=false, focused=false, dirty=false, toastTimer, zoom=1, naturalWidth=600;
const dictionaries={
zh:{plain:'通俗版',technical:'专业版',plainMissing:'此项尚无通俗改写，暂显示专业表述。',homeTitle:'读懂论文的研究逻辑。',homeIntro:'打开一篇论文，或导入已有图谱。',more:'更多',original:'原文',outline:'文字提纲',exportSVG:'导出图像 SVG',exportHTML:'保存阅读报告',exportJSON:'导出修订 JSON',importJSON:'导入图谱 JSON',excluded:'显示已排除',eyebrow:'读懂一篇论文的研究逻辑',scope:'论文与分析范围',paperLink:'查看原论文 ↗',main:'核心主线',full:'展开细节',focus:'只看相关路径',unfocus:'返回全部路径',fit:'适应宽度',mapHint:'点击查看依据 · 虚线表示推断或输入未交代',evidence:'论点与依据',edit:'编辑解读',shortLabel:'图中简述',fullLabel:'完整表述',statusLabel:'依据状态',explicit:'原文明示',inferred:'模型／读者推断',not_in_input:'当前输入未交代',reason:'解释与推断理由',notes:'我的笔记',cancel:'取消',save:'保存修订',search:'搜索原文',close:'关闭详情',zoomIn:'放大',zoomOut:'缩小',noMatch:'未找到匹配段落。',empty:'当前视图没有节点。',missing:'当前输入中没有对应证据片段。请结合范围说明阅读。',editButton:'编辑／笔记',accept:'接受此解读',undoAccept:'撤销接受',exclude:'排除此项',restore:'恢复项目',updated:'已更新解读状态。',exported:'文件已导出。',imported:'图谱已导入，来源匹配检查通过。',importFailed:'导入失败：',invalid:'图谱格式或原文引用无效。',unsaved:'当前修改尚未导出。仍然替换图谱？',dirty:'有修改尚未导出',scopePrefix:'分析范围：',related:'原文对应的解读',relation:'关系：',readHint:'阅读提示',warning:'图中包含推断及输入未交代的内容。原文匹配不等于论证成立；请点击对应项目核对。',cycle:'存在有向环，已保留供检查。',count:'个论点',edges:'条关系',emptyDetail:'点击论点或连线，查看原文依据。',fallback:'这一表述尚无当前语言译文，显示已有文本。',originalNote:'引文保留论文原语言。',title:'论文论证图',tooLarge:'文件超过 15 MB。'},
en:{plain:'Plain language',technical:'Technical',plainMissing:'A plain-language version is not available for this item; the technical wording is shown.',homeTitle:'Understand the logic of a paper.',homeIntro:'Open a paper or import an existing argument map.',more:'More',original:'Source',outline:'Text outline',exportSVG:'Export figure · SVG',exportHTML:'Save reading report',exportJSON:'Export revised JSON',importJSON:'Import map · JSON',excluded:'Show excluded items',eyebrow:'THE LOGIC OF A PAPER',scope:'Paper & scope',paperLink:'Read the paper ↗',main:'Main thread',full:'Explore details',focus:'Related paths',unfocus:'All paths',fit:'Fit width',mapHint:'Click to inspect evidence · Dashed = inferred or absent from input',evidence:'Claim & evidence',edit:'Edit interpretation',shortLabel:'Short statement on the map',fullLabel:'Full statement',statusLabel:'Evidence status',explicit:'Explicit in source',inferred:'Model / reader inference',not_in_input:'Not in supplied text',reason:'Explanation & reasoning',notes:'My notes',cancel:'Cancel',save:'Save revision',search:'Search original text',close:'Close details',zoomIn:'Zoom in',zoomOut:'Zoom out',noMatch:'No matching passages.',empty:'No nodes in this view.',missing:'No supporting excerpt in the supplied text. Read with the stated scope in mind.',editButton:'Edit / notes',accept:'Accept interpretation',undoAccept:'Undo acceptance',exclude:'Exclude item',restore:'Restore item',updated:'Interpretation updated.',exported:'File exported.',imported:'Map imported; source spans checked.',importFailed:'Import failed: ',invalid:'Invalid map structure or source quotation.',unsaved:'Changes have not been exported. Replace this map?',dirty:'Changes not yet exported',scopePrefix:'Input scope: ',related:'Interpretations of this passage',relation:'Relation: ',readHint:'Reading notes',warning:'The map includes inferences and items absent from the supplied text. A matching quotation does not establish a valid argument; inspect the relevant items.',cycle:'A directed cycle is preserved for inspection.',count:'claims',edges:'relations',emptyDetail:'Select a claim or relation to inspect its source.',fallback:'No translation is available for this statement; existing text is shown.',originalNote:'Quotations stay in the original language.',title:'Paper argument map',tooLarge:'File exceeds 15 MB.'}
};
const roleNames={zh:{problem:'现实问题',prior:'已有认识',gap:'研究缺口',question:'研究问题',method:'研究设计',finding:'作者报告',contribution:'贡献主张',assumption:'必要条件',limitation:'待核对',joint:'联合推断'},en:{problem:'PROBLEM',prior:'PRIOR WORK',gap:'GAP',question:'QUESTION',method:'RESEARCH DESIGN',finding:'AUTHOR-REPORTED',contribution:'CONTRIBUTION',assumption:'ASSUMPTION',limitation:'TO CHECK',joint:'JOINT INFERENCE'}};
const plainRoles={zh:{problem:'为什么重要',prior:'已经知道什么',gap:'还不清楚什么',question:'这篇论文问什么',method:'作者怎么研究',finding:'作者报告的结果',contribution:'论文想增加什么',assumption:'解释成立的条件',limitation:'还要核对',joint:'需要合在一起看'},en:{problem:'WHY IT MATTERS',prior:'WHAT WE KNOW',gap:'WHAT IS STILL UNCLEAR',question:'THE QUESTION',method:'HOW THEY STUDIED IT',finding:'REPORTED RESULT',contribution:'WHAT THE PAPER ADDS',assumption:'WHAT MUST HOLD',limitation:'STILL TO CHECK',joint:'READ THESE TOGETHER'}};
const relationNames={zh:{motivates:'引出',addresses:'回应',supports:'支持',qualifies:'限定',contradicts:'反驳',requires:'共同需要',reports:'报告'},en:{motivates:'motivates',addresses:'addresses',supports:'supports',qualifies:'qualifies',contradicts:'contradicts',requires:'requires',reports:'reports'}};
const reviewNames={zh:{unreviewed:'尚未复核',accepted:'已接受解读',excluded:'已排除'},en:{unreviewed:'Not reviewed',accepted:'Interpretation accepted',excluded:'Excluded'}};
// Enum sets are separate from display language.
const roles=roleNames.en,relations=relationNames.en,statuses={explicit:1,inferred:1,not_in_input:1},reviews=reviewNames.en;
const t=k=>dictionaries[lang][k]||k, role=k=>(level==='plain'?plainRoles[lang]:roleNames[lang])[k], relation=k=>relationNames[lang][k];
const primary=()=>data.analysis.language.startsWith('en')?'en':'zh';
function originalField(x,key){return x[key+'_'+lang]||(lang===primary()?x[key]:null)||x[key]||'';}
function field(x,key){const isArgument=x.role||x.relation;if(level==='plain'&&isArgument&&['label','summary','rationale','caption'].includes(key)){const plain=originalField(x,'plain_'+key);if(plain)return plain;}return originalField(x,key);}
function keyFor(x,key){const base=level==='plain'&&(x.role||x.relation)?'plain_'+key:key;return Object.hasOwn(x,base+'_'+lang)||lang!==primary()?base+'_'+lang:base;}
function shortText(x){if(level==='plain'){const plain=x['plain_summary_'+lang]||x['plain_label_'+lang]||(lang===primary()?(x.plain_summary||x.plain_label):null);if(plain)return plain;}return x['summary_'+lang]||(lang===primary()?x.summary:x['label_'+lang])||x.summary||originalField(x,'label');}
function edgeText(e){return field(e,'caption')||relation(e.relation);}
function invalid(message){return Error(lang==='zh'?message:t('invalid'));}
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function svg(tag,attrs,text){const x=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,v);if(text!==undefined)x.textContent=text;return x;}
function onActivate(x,fn){x.addEventListener('click',fn);x.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',2200);}
function item(id){return data.nodes.find(x=>x.id===id)||data.edges.find(x=>x.id===id);}
function node(id){return data.nodes.find(x=>x.id===id);}
function safeURL(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
  function check(d){
    if(!d||typeof d!=='object'||Array.isArray(d)||d.schema_version!=='0.1')throw invalid('需要 schema_version 为 0.1 的图谱。');
    const nonempty=x=>typeof x==='string'&&x.trim().length>0;
    if(!d.paper||!nonempty(d.paper.title)||!['open_access','synthetic','user_supplied'].includes(d.paper.source_kind))throw invalid('论文信息不完整。');
    if(!d.analysis||!['language','input_scope','notice'].every(k=>nonempty(d.analysis[k])))throw invalid('缺少分析范围或说明。');
    for(const k of ['passages','nodes','edges','revisions'])if(!Array.isArray(d[k])||d[k].some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw invalid(k+' 必须是对象数组。');
    for(const x of [d.analysis,...d.nodes,...d.edges])for(const [k,v] of Object.entries(x))if((['summary','reading_title','caption','plain_label','plain_summary','plain_rationale','plain_caption'].includes(k)||/_(en|zh)$/.test(k))&&typeof v!=='string')throw invalid(k+' 必须是文本。');
    if(Object.hasOwn(d,'reader_preferences')){const p=d.reader_preferences;if(!p||typeof p!=='object'||Array.isArray(p)||!['zh','en'].includes(p.language||'zh')||!['core','full'].includes(p.mode||'core')||!['plain','technical'].includes(p.reading_level||'plain'))throw invalid('阅读偏好格式无效。');}
    if(d.nodes.length>300||d.edges.length>1500)throw invalid('本阅读器最多支持 300 个节点与 1500 条关系。请拆分为较小的论证图。');
    const ids=new Set();
    for(const x of [...d.passages,...d.nodes,...d.edges]){if(typeof x.id!=='string'||! /^[A-Za-z][A-Za-z0-9_-]*$/.test(x.id)||ids.has(x.id))throw invalid('存在无效或重复编号。');ids.add(x.id);}
    const pmap=new Map(d.passages.map(p=>[p.id,p]));
    const nmap=new Map(d.nodes.map(n=>[n.id,n]));
    for(const p of d.passages)if(!['text','section','locator'].every(k=>nonempty(p[k])))throw invalid(p.id+' 缺少原文或定位信息。');
    for(const x of [...d.nodes,...d.edges]){
      if(!Object.hasOwn(statuses,x.status)||!Object.hasOwn(reviews,x.review)||typeof x.note!=='string'||typeof x.rationale!=='string'||!Array.isArray(x.basis))throw invalid(x.id+' 的状态、笔记或来源格式错误。');
      if(x.status!=='not_in_input'&&!x.basis.length)throw invalid(x.id+' 需要原文依据。');
      if(x.status!=='explicit'&&!x.rationale.trim())throw invalid(x.id+' 需要说明推断理由或缺失范围。');
      for(const b of x.basis)if(!b||!pmap.has(b.passage_id)||!nonempty(b.quote)||!pmap.get(b.passage_id).text.includes(b.quote))throw invalid(x.id+' 的引用无法在对应原文中找到。');
    }
    for(const n of d.nodes)if(!Object.hasOwn(roles,n.role)||!nonempty(n.label)||typeof n.core!=='boolean')throw invalid(n.id+' 的节点格式错误。');
    for(const e of d.edges){
      if(!nmap.has(e.source)||!nmap.has(e.target)||e.source===e.target||!Object.hasOwn(relations,e.relation))throw invalid(e.id+' 的关系格式错误。');
      if(e.relation==='requires'&&nmap.get(e.target).role!=='joint')throw invalid(e.id+' 的必要前提必须指向联合推断。');
    }
    for(const n of d.nodes)if(n.role==='joint'&&new Set(d.edges.filter(e=>e.target===n.id&&e.relation==='requires').map(e=>e.source)).size<2)throw invalid(n.id+' 需要至少两个必要前提。');
  }

function warnings(){
const box=$('warnings');box.replaceChildren();
if([...data.nodes,...data.edges].some(x=>x.status!=='explicit'))box.append(el('p','',t('warning')));
const degree=new Map(data.nodes.map(n=>[n.id,0])),out=new Map(data.nodes.map(n=>[n.id,[]]));for(const e of data.edges){degree.set(e.target,degree.get(e.target)+1);out.get(e.source).push(e.target);}
const q=[...degree].filter(([,v])=>!v).map(([k])=>k);let visited=0;while(q.length){const id=q.pop();visited++;for(const n of out.get(id)){degree.set(n,degree.get(n)-1);if(!degree.get(n))q.push(n);}}if(visited<data.nodes.length)box.append(el('p','',t('cycle')));
}
function languageUI(){
document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.querySelectorAll('[data-i18n]').forEach(x=>x.textContent=t(x.dataset.i18n));
for(const mode of ['plain','technical'])$('level-'+mode).setAttribute('aria-pressed',String(level===mode));
for(const l of ['zh','en'])$('lang-'+l).setAttribute('aria-pressed',String(lang===l));
$('source-search').placeholder=t('search');$('source-search').setAttribute('aria-label',t('search'));
for(const [id,key] of [['close-inspector','close'],['zoom-in','zoomIn'],['zoom-out','zoomOut']])$(id).setAttribute('aria-label',t(key));
$('reading-title').textContent=(level==='plain'?originalField(data.analysis,'plain_reading_title'):'')||field(data.analysis,'reading_title')||field(data.nodes.find(n=>n.role==='question')||{},'label')||data.paper.title;
$('paper-title').textContent=data.paper.title;$('paper-meta').textContent=[data.paper.authors,data.paper.year].filter(Boolean).join(' · ');
$('source-kind').textContent=({zh:{synthetic:'合成文本示例',open_access:'开放获取论文',user_supplied:'用户提供文本'},en:{synthetic:'Synthetic example',open_access:'Open-access paper',user_supplied:'User-supplied text'}})[lang][data.paper.source_kind];
$('input-scope').textContent=t('scopePrefix')+field(data.analysis,'input_scope');$('notice').textContent=field(data.analysis,'notice');
const url=safeURL(data.paper.url);$('paper-link').hidden=!url;if(url)$('paper-link').href=url;
$('attribution').textContent=[data.paper.authors,data.paper.license,data.paper.url].filter(Boolean).join(' · ');
$('graph').setAttribute('aria-label',t('title'));warnings();dirtyUI();
}
function init(){check(data);lang=new URLSearchParams(location.search).get('lang')||data.reader_preferences?.language||'en';if(!dictionaries[lang])lang='en';level=data.reader_preferences?.reading_level||'plain';full=data.reader_preferences?.mode==='full';outline=false;selected=null;sourceSelected=null;focused=false;$('source-search').value='';$('show-excluded').checked=false;$('paper-info').open=false;$('more-menu').open=false;closeInspector();$('home-panel').hidden=true;$('reader-shell').hidden=false;document.querySelector('.paper-head').hidden=false;languageUI();document.title=data.paper.title+' · Paper Argument Map';renderGraph(true);renderSources();}
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
    if(!box.children.length)box.append(el('p','empty-results',t('noMatch')));
    if(scrollTo){const target=$('source-'+scrollTo);if(target)box.scrollTo({top:box.scrollTop+target.getBoundingClientRect().top-box.getBoundingClientRect().top-8,behavior:'instant'});}
  }

function panel(which){$('inspector').hidden=false;$('reader-shell').classList.add('inspector-open');$('detail').hidden=which!=='detail';$('source-panel').hidden=which!=='source';$('tab-detail').setAttribute('aria-pressed',String(which==='detail'));$('tab-source').setAttribute('aria-pressed',String(which==='source'));applyZoom();}
function closeInspector(){$('inspector').hidden=true;$('reader-shell').classList.remove('inspector-open');}
function selectPassage(pid){sourceSelected=pid;selected=null;focused=false;const box=$('detail');box.replaceChildren(el('h3','',t('related')));for(const x of [...data.nodes,...data.edges].filter(x=>x.basis.some(b=>b.passage_id===pid))){const b=el('button','source-jump',field(x,'label')||relation(x.relation));b.onclick=()=>select(x.id);box.append(b);}panel('detail');renderGraph();renderSources();}
function getVisible(){
const excluded=$('show-excluded').checked;
let ns=data.nodes.filter(n=>(excluded||n.review!=='excluded')&&(full||n.core||!data.nodes.some(x=>x.core))),ids=new Set(ns.map(n=>n.id));
let es=data.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&(excluded||e.review!=='excluded'));
if(focused&&selected){const focus=node(selected)?[selected]:[item(selected).source,item(selected).target],keep=new Set(focus);for(const direction of ['up','down']){const q=[...focus],seen=new Set(focus);while(q.length){const current=q.shift();for(const e of es){const next=direction==='up'?(e.target===current?e.source:null):(e.source===current?e.target:null);if(next&&!seen.has(next)){seen.add(next);keep.add(next);q.push(next);}}}}ns=ns.filter(n=>keep.has(n.id));es=es.filter(e=>keep.has(e.source)&&keep.has(e.target));}
return {ns,es};}
const measure=document.createElement('canvas').getContext('2d');
function wrap(text,width,font='500 16px'){measure.font=font+' "Segoe UI", "Microsoft YaHei", sans-serif';const tokens=text.match(/[A-Za-z0-9]+(?:[’'−–-][A-Za-z0-9]+)*|[^A-Za-z0-9]/gu)||[],lines=[];let line='';for(const token of tokens){if(measure.measureText(line+token).width>width&&line.trim()){if(/^[，。！？；：、,.!?;:）)\]”’]$/u.test(token)){const tail=line.match(/(?:[A-Za-z0-9]+|[^\s])$/u)?.[0]||'';const head=line.slice(0,line.length-tail.length).trim();if(head){lines.push(head);line=tail+token;continue;}}lines.push(line.trim());line='';}if(measure.measureText(token).width>width){for(const c of token){if(measure.measureText(line+c).width>width){lines.push(line.trim());line='';}line+=c;}}else line+=token;}if(line.trim())lines.push(line.trim());return lines;}
function route(points){if(!points.length)return '';let d=`M${points[0].x},${points[0].y}`;for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],r=Math.min(10,Math.hypot(b.x-a.x,b.y-a.y)/2,Math.hypot(c.x-b.x,c.y-b.y)/2),ab=Math.hypot(b.x-a.x,b.y-a.y)||1,bc=Math.hypot(c.x-b.x,c.y-b.y)||1;d+=` L${b.x-(b.x-a.x)*r/ab},${b.y-(b.y-a.y)*r/ab} Q${b.x},${b.y} ${b.x+(c.x-b.x)*r/bc},${b.y+(c.y-b.y)*r/bc}`;}const last=points.at(-1);return d+` L${last.x},${last.y}`;}
const figureStyle=`text{font-family:"Segoe UI","Microsoft YaHei",sans-serif}.graph-node{cursor:pointer;outline:none}.card{fill:#e6f3ff;stroke:#ccdde9;stroke-width:1.25}.graph-node.selected .card,.graph-node:focus .card{stroke:#176599;stroke-width:2.2}.graph-node.related .card{stroke:#619bc4;stroke-width:2}.graph-node.excluded{opacity:.4}.node-role{font-size:11px;letter-spacing:.6px;fill:#42789c;font-weight:600}.node-label{font-size:16px;fill:#145782;font-weight:500}.edge-line{fill:none;stroke:#8a969f;stroke-width:1.35}.edge-line.selected{stroke:#1d6b9d;stroke-width:2}.inferred-line{stroke-dasharray:6 4}.edge-hit{fill:none;stroke:transparent;stroke-width:14;cursor:pointer}.edge-label{cursor:pointer}.edge-label text{font-size:12px;font-weight:500;fill:#23628e}.edge-label rect{fill:#f5faff;stroke:#c5dbec;stroke-width:1}.edge-label:focus rect{stroke:#1d6b9d;stroke-width:2}.graph-node:hover .card{stroke:#72a3c6}`;
function narrowLayout(g,ns,es){
// A single reading column on phones; retain every real arrow, including back-links.
const ordered=[...ns].sort((a,b)=>g.node(a.id).y-g.node(b.id).y||g.node(a.id).x-g.node(b.id).x),index=new Map(ordered.map((n,i)=>[n.id,i]));
const skips=es.filter(e=>Math.abs(index.get(e.source)-index.get(e.target))>1).length,margin=20+Math.ceil(skips/2)*8,width=282+margin*2;let y=16,lane=0;
for(const n of ordered){const p=g.node(n.id);p.x=width/2;p.y=y+p.height/2;y+=p.height+90;}
for(const e of es){const a=g.node(e.source),b=g.node(e.target),p=g.edge({v:e.source,w:e.target,name:e.id}),down=b.y>a.y;p.mobile=true;
if(Math.abs(index.get(e.source)-index.get(e.target))===1){p.x=a.x;p.y=(a.y+(down?1:-1)*a.height/2+b.y+(down?-1:1)*b.height/2)/2;p.points=[{x:a.x,y:a.y+(down?1:-1)*(a.height/2+8)},{x:b.x,y:b.y+(down?-1:1)*(b.height/2+8)}];}
else{p.width=0;const side=lane%2?-1:1,offset=12+Math.floor(lane/2)*8,rail=a.x+side*(141+offset),sx=a.x+side*149,ty=b.y+(down?-12:12);p.points=[{x:sx,y:a.y},{x:rail,y:a.y},{x:rail,y:ty},{x:sx,y:ty}];lane++;}}
g.graph().width=width;g.graph().height=Math.max(180,y-22);
}
function renderGraph(reset=false){
const {ns,es}=getVisible(),graph=$('graph');graph.replaceChildren(svg('style',{},figureStyle));
$('graph-count').textContent=ns.length+' '+t('count')+' · '+es.length+' '+t('edges');$('focus-chain').hidden=!selected;$('focus-chain').textContent=t(focused?'unfocus':'focus');$('focus-chain').setAttribute('aria-pressed',String(focused));
$('view-map').setAttribute('aria-pressed',String(!full&&!outline));$('view-full').setAttribute('aria-pressed',String(full&&!outline));$('map-container').hidden=outline;$('outline').hidden=!outline;
const narrow=innerWidth<=760,W=narrow?282:324,textWidth=W-44,g=new dagre.graphlib.Graph({multigraph:true});g.setGraph({rankdir:'TB',nodesep:54,ranksep:62,marginx:40,marginy:28});g.setDefaultEdgeLabel(()=>({}));
const textLines=new Map(),edgeLines=new Map();for(const n of ns){const lines=wrap(shortText(n),textWidth);textLines.set(n.id,lines);g.setNode(n.id,{width:W,height:Math.max(104,58+lines.length*24)});}
for(const e of es){const lines=wrap(edgeText(e),170,'500 12px');edgeLines.set(e.id,lines);measure.font='500 12px "Segoe UI", "Microsoft YaHei", sans-serif';const width=Math.max(54,...lines.map(x=>measure.measureText(x).width))+24;g.setEdge(e.source,e.target,{width,height:lines.length*17+12,labelpos:'c',weight:['motivates','reports'].includes(e.relation)?3:1},e.id);}
dagre.layout(g);if(narrow)narrowLayout(g,ns,es);const routes=argumentRoutes(g,ns,es);naturalWidth=Math.max(g.graph().width||0,300);const height=Math.max(g.graph().height||0,180);graph.setAttribute('viewBox',`0 0 ${naturalWidth} ${height}`);graph.dataset.naturalHeight=height;
const defs=svg('defs'),marker=svg('marker',{id:'arrow',markerWidth:10,markerHeight:10,refX:8,refY:5,orient:'auto',markerUnits:'userSpaceOnUse',overflow:'visible'});marker.append(svg('path',{d:'M2,1 L8,5 L2,9',fill:'none',stroke:'#778894','stroke-width':1.4}));defs.append(marker);graph.append(defs);
const edgeLayer=svg('g'),labelLayer=svg('g');graph.append(edgeLayer);
for(const e of es){const pos=g.edge({v:e.source,w:e.target,name:e.id}),d=route(routes.get(e.id));edgeLayer.append(svg('path',{d,class:'edge-line'+(e.status!=='explicit'?' inferred-line':'')+(selected===e.id?' selected':''),'marker-end':'url(#arrow)','data-edge-id':e.id}));const hit=svg('path',{d,class:'edge-hit',tabindex:0,role:'button','aria-label':edgeText(e)+': '+field(node(e.source),'label')+' → '+field(node(e.target),'label'),'data-edge-hit':e.id});hit.append(svg('title',{},edgeText(e)));onActivate(hit,()=>select(e.id));edgeLayer.append(hit);
if(pos.width){const group=svg('g',{class:'edge-label',transform:`translate(${pos.x},${pos.y})`,tabindex:0,role:'button','aria-label':edgeText(e),'data-label-id':e.id});group.append(svg('rect',{x:-pos.width/2,y:-pos.height/2,width:pos.width,height:pos.height,rx:pos.height/2}));edgeLines.get(e.id).forEach((line,i)=>group.append(svg('text',{'text-anchor':'middle',y:-(edgeLines.get(e.id).length-1)*8.5+4+i*17},line)));onActivate(group,()=>select(e.id));labelLayer.append(group);}}
const related=new Set(sourceSelected?data.nodes.filter(n=>n.basis.some(b=>b.passage_id===sourceSelected)).map(n=>n.id):[]);if(selected&&!node(selected)){related.add(item(selected).source);related.add(item(selected).target);}
for(const n of ns){const p=g.node(n.id),x=p.x-p.width/2,y=p.y-p.height/2,group=svg('g',{transform:`translate(${x},${y})`,class:'graph-node'+(selected===n.id?' selected':'')+(related.has(n.id)?' related':'')+(n.review==='excluded'?' excluded':''),tabindex:0,role:'button','aria-label':role(n.role)+': '+field(n,'label'),'data-node-id':n.id});const card=svg('rect',{class:'card',width:p.width,height:p.height,rx:17});if(n.status==='not_in_input'){card.style.fill='#f2f6fa';card.style.strokeDasharray='5 3';}group.append(card,svg('text',{x:p.width/2,y:26,'text-anchor':'middle',class:'node-role'},role(n.role)));
textLines.get(n.id).forEach((line,i)=>group.append(svg('text',{x:p.width/2,y:54+i*24,'text-anchor':'middle',class:'node-label'},line)));group.append(svg('title',{},field(n,'label')));onActivate(group,()=>select(n.id));graph.append(group);}
graph.append(labelLayer);if(!ns.length)graph.append(svg('text',{x:20,y:70,fill:'#78827b','font-size':14},t('empty')));
if(reset)zoom=Math.min(1,Math.max(.8,($('map-container').clientWidth-40)/naturalWidth));applyZoom();renderOutline(ns,es);}
function applyZoom(){$('graph').style.width=naturalWidth*zoom+'px';$('graph').style.height=Number($('graph').dataset.naturalHeight||180)*zoom+'px';$('zoom-label').textContent=Math.round(zoom*100)+'%';}
function renderOutline(ns,es){const box=$('outline');box.replaceChildren();for(const n of ns){const card=el('article','outline-card'),button=el('button','',field(n,'label'));button.onclick=()=>select(n.id);card.append(el('small','',role(n.role)+' · '+t(n.status)),button);const links=el('div','outline-edges');for(const e of es.filter(e=>e.source===n.id)){const b=el('button','',edgeText(e)+' → '+field(node(e.target),'label'));b.onclick=()=>select(e.id);links.append(b);}card.append(links);box.append(card);}}
function select(id){selected=id;sourceSelected=null;$('source-search').value='';panel('detail');renderGraph();renderDetail();renderSources();}
function renderDetail(){const box=$('detail');box.replaceChildren();if(!selected){box.append(el('p','',t('emptyDetail')));return;}const x=item(selected),isNode=!!node(selected),top=el('div','detail-top');top.append(el('span','badge',isNode?role(x.role):t('relation')+relation(x.relation)),el('span','badge'+(x.status!=='explicit'?' inferred-badge':''),t(x.status)),el('span','badge',reviewNames[lang][x.review]));box.append(top,el('h3','',isNode?field(x,'label'):field(node(x.source),'label')+' → '+field(node(x.target),'label')));
if(level==='plain'&&!originalField(x,'plain_label')&&isNode)box.append(el('p','',t('plainMissing')));
if(lang!==primary()&&isNode&&!x['label_'+lang])box.append(el('p','',t('fallback')));
if(field(x,'rationale'))box.append(el('p','',field(x,'rationale')));if(!x.basis.length)box.append(el('p','muted',t('missing')));
for(const b of x.basis){const p=data.passages.find(p=>p.id===b.passage_id),jump=el('button','source-jump',p.id+' · '+p.locator+' ↗');jump.onclick=()=>{panel('source');$('source-search').value='';renderSources(p.id);};box.append(jump,el('blockquote','',b.quote));}
if(x.note)box.append(el('p','review-note',t('notes')+': '+x.note));const actions=el('div','detail-actions');for(const [label,fn] of [[t('editButton'),openEdit],[t(x.review==='accepted'?'undoAccept':'accept'),()=>review(x.review==='accepted'?'unreviewed':'accepted')],[t(x.review==='excluded'?'restore':'exclude'),()=>review(x.review==='excluded'?'unreviewed':'excluded')]]){const b=el('button','',label);b.onclick=fn;actions.append(b);}box.append(actions);}
function commitChanges(x,changes){const before={};for(const key of Object.keys(changes))before[key]=x[key]===undefined?null:clone(x[key]);Object.assign(x,changes);data.revisions.push({timestamp:new Date().toISOString(),item_id:x.id,before,after:clone(changes)});dirty=true;dirtyUI();warnings();renderGraph();renderSources();renderDetail();}
function review(state){commitChanges(item(selected),{review:state});toast(t('updated'));}
function dirtyUI(){$('dirty-state').textContent=dirty?t('dirty'):'';$('dirty-state').classList.toggle('dirty',dirty);}
function openEdit(){const x=item(selected);$('summary-field').hidden=$('label-field').hidden=!node(selected);$('edit-summary').value=field(x,'summary');$('edit-label').value=field(x,'label');$('edit-status').value=x.status;$('edit-rationale').value=field(x,'rationale');$('edit-note').value=x.note;$('edit-error').textContent='';$('edit-dialog').showModal();}
$('edit-form').onsubmit=e=>{e.preventDefault();const x=item(selected),changes={status:$('edit-status').value,note:$('edit-note').value.trim()};changes[keyFor(x,'rationale')]=$('edit-rationale').value.trim();if(node(selected)){changes[keyFor(x,'label')]=$('edit-label').value.trim();changes[keyFor(x,'summary')]=$('edit-summary').value.trim();if(!changes[keyFor(x,'label')]){$('edit-error').textContent=t('invalid');return;}}const candidate=clone(data);Object.assign(candidate.nodes.find(n=>n.id===selected)||candidate.edges.find(n=>n.id===selected),changes);try{check(candidate);}catch(err){$('edit-error').textContent=err.message;return;}commitChanges(x,changes);$('edit-dialog').close();};
$('cancel-edit').onclick=()=>$('edit-dialog').close();
function cleanData(){const d=clone(data);delete d.validation_warnings;d.reader_preferences={language:lang,mode:full?'full':'core',reading_level:level};return d;}
function packedJSON(d){return JSON.stringify(d,null,2).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function download(text,type,suffix,saved=true){const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download='paper-argument-map'+suffix;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);if(saved){dirty=false;dirtyUI();}toast(t('exported'));$('more-menu').open=false;}
$('export-json').onclick=()=>download(JSON.stringify(cleanData(),null,2)+'\n','application/json;charset=utf-8','.json');
$('export-html').onclick=()=>{const doc=document.documentElement.cloneNode(true);doc.querySelector('meta[name=argument-home]').content='';doc.querySelector('#argument-data').textContent=packedJSON(cleanData());doc.querySelector('#edit-dialog').removeAttribute('open');doc.querySelector('#toast').style.display='none';doc.querySelector('#more-menu').removeAttribute('open');download('<!doctype html>\n'+doc.outerHTML,'text/html;charset=utf-8','.html');};
$('export-svg').onclick=()=>{const graph=$('graph').cloneNode(true);graph.style.width=naturalWidth+'px';graph.style.height=graph.dataset.naturalHeight+'px';graph.setAttribute('width',naturalWidth);graph.setAttribute('height',graph.dataset.naturalHeight);graph.querySelectorAll('.edge-hit').forEach(x=>x.remove());graph.prepend(svg('desc',{},data.paper.title+' · '+field(data.analysis,'input_scope')+' · '+field(data.analysis,'notice')));download(new XMLSerializer().serializeToString(graph),'image/svg+xml;charset=utf-8','.svg',false);};
$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>15*1024*1024)throw Error(t('tooLarge'));const candidate=JSON.parse(await file.text());check(candidate);if(dirty&&!window.confirm(t('unsaved')))return;data=candidate;dirty=false;init();toast(t('imported'));}catch(err){toast(t('importFailed')+(lang==='en'?t('invalid'):err.message));}finally{e.target.value='';}};
for(const l of ['zh','en'])$('lang-'+l).onclick=()=>{lang=l;languageUI();renderGraph(true);renderDetail();renderSources();};
for(const mode of ['plain','technical'])$('level-'+mode).onclick=()=>{level=mode;languageUI();renderGraph(true);renderDetail();renderSources();};
function switchMap(all){full=all;outline=false;focused=false;renderGraph(true);}
$('view-map').onclick=()=>switchMap(false);$('view-full').onclick=()=>switchMap(true);$('view-outline').onclick=()=>{outline=true;$('more-menu').open=false;renderGraph();};
$('show-excluded').onchange=()=>renderGraph(true);$('focus-chain').onclick=()=>{focused=!focused;renderGraph(true);};
$('show-source').onclick=()=>{panel('source');renderSources(basis()[0]?.passage_id);$('more-menu').open=false;};$('tab-source').onclick=()=>{panel('source');renderSources(basis()[0]?.passage_id);};$('tab-detail').onclick=()=>panel('detail');$('close-inspector').onclick=closeInspector;
function showHome(){closeInspector();$('reader-shell').hidden=true;document.querySelector('.paper-head').hidden=true;$('home-panel').hidden=false;$('resume-paper').textContent=(level==='plain'?originalField(data.analysis,'plain_reading_title'):'')||field(data.analysis,'reading_title')||data.paper.title;window.scrollTo(0,0);}
$('home-view').onclick=e=>{const home=document.querySelector('meta[name=argument-home]').content;if(home){try{const url=new URL(home,location.href);if(['http:','https:','file:'].includes(url.protocol)&&url.origin===location.origin){url.searchParams.set('lang',lang);e.currentTarget.href=url.href;return;}}catch{}}e.preventDefault();showHome();};
$('resume-paper').onclick=()=>{$('home-panel').hidden=true;$('reader-shell').hidden=false;document.querySelector('.paper-head').hidden=false;renderGraph(true);};$('home-import').onclick=()=>$('import-file').click();
$('source-search').oninput=()=>renderSources();
$('zoom-in').onclick=()=>{zoom=Math.min(1.75,zoom+.1);applyZoom();};$('zoom-out').onclick=()=>{zoom=Math.max(.3,zoom-.1);applyZoom();};$('fit-view').onclick=()=>{zoom=Math.min(1.2,($('map-container').clientWidth-40)/naturalWidth);applyZoom();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeInspector();});window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
let narrow=innerWidth<=760;window.addEventListener('resize',()=>{const next=innerWidth<=760;if(next!==narrow){narrow=next;renderGraph(true);}});
try{init();}catch(err){$('notice').textContent=t('invalid')+' '+err.message;$('paper-info').open=true;console.error(err);}
})();
