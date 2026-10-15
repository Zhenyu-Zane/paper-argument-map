/* Orthogonal routes avoid cards and other relations' captions. No network dependencies. */
function argumentRoutes(graph, nodes, edges) {
  const box = (p, pad) => ({ left:p.x-p.width/2-pad, right:p.x+p.width/2+pad, top:p.y-p.height/2-pad, bottom:p.y+p.height/2+pad });
  const nodeBoxes=nodes.map(n=>box(graph.node(n.id),8));
  const captions=edges.map(e=>({id:e.id,...box(graph.edge({v:e.source,w:e.target,name:e.id}),7)}));
  const segments=[], result=new Map();
  const inside=(p,r)=>p.x>r.left+.01&&p.x<r.right-.01&&p.y>r.top+.01&&p.y<r.bottom-.01;
  const cuts=(a,b,r)=>a.x===b.x ? a.x>r.left+.01&&a.x<r.right-.01&&Math.max(a.y,b.y)>r.top+.01&&Math.min(a.y,b.y)<r.bottom-.01 : a.y>r.top+.01&&a.y<r.bottom-.01&&Math.max(a.x,b.x)>r.left+.01&&Math.min(a.x,b.x)<r.right-.01;
  function port(e,source){
    const own=graph.node(source?e.source:e.target),other=graph.node(source?e.target:e.source),down=other.y>=own.y;
    const siblings=edges.filter(x=>(source?x.source===e.source:x.target===e.target)&&((graph.node(source?x.target:x.source).y>=own.y)===down)).sort((a,b)=>graph.node(source?a.target:a.source).x-graph.node(source?b.target:b.source).x||a.id.localeCompare(b.id));
    const i=siblings.findIndex(x=>x.id===e.id),x=own.x+(i-(siblings.length-1)/2)*Math.min(32,own.width/(siblings.length+1));
    return {tip:{x,y:own.y+(down?1:-1)*(own.height/2+8)},anchor:{x,y:own.y+(down?1:-1)*(own.height/2+18)}};
  }
  // A small binary heap keeps the route search responsive when the map has branches.
  class Heap {
    constructor(){this.a=[];}
    push(x){let i=this.a.length;this.a.push(x);while(i){const p=(i-1)>>1;if(this.a[p].f<=x.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=x;}
    pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].f<this.a[c].f)c++;if(this.a[c].f>=last.f)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return first;}
  }
  for(const e of edges){
    const pos=graph.edge({v:e.source,w:e.target,name:e.id});
    if(pos.mobile){result.set(e.id,pos.points);continue;}
    const start=port(e,true),end=port(e,false),via={x:pos.x,y:pos.y},obstacles=[...nodeBoxes,...captions.filter(c=>c.id!==e.id)];
    const round=n=>Math.round(n*100)/100;
    for(const p of [start.tip,start.anchor,end.tip,end.anchor,via]){p.x=round(p.x);p.y=round(p.y);}
    const xs=new Set([0,round(graph.graph().width),start.anchor.x,end.anchor.x,via.x]),ys=new Set([0,round(graph.graph().height),start.anchor.y,end.anchor.y,via.y]);
    for(const r of obstacles){xs.add(round(r.left-2));xs.add(round(r.right+2));ys.add(round(r.top-2));ys.add(round(r.bottom+2));}
    // Caption-level tracks offer separate lanes around, rather than through, neighboring labels.
    for(const c of captions){ys.add(round(c.top-13));ys.add(round(c.bottom+13));}
    const X=[...xs].sort((a,b)=>a-b),Y=[...ys].sort((a,b)=>a-b),nx=X.length,ny=Y.length;
    const points=Y.flatMap(y=>X.map(x=>({x,y}))),valid=points.map(p=>!obstacles.some(r=>inside(p,r))),passable=new Map();
    const index=p=>Y.indexOf(p.y)*nx+X.indexOf(p.x);
    function cost(a,b){let extra=0;for(const [c,d] of segments){if(a.x===b.x&&c.x===d.x&&Math.abs(a.x-c.x)<2){const overlap=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))-Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y));if(overlap>1)extra+=160+overlap*2;}else if(a.y===b.y&&c.y===d.y&&Math.abs(a.y-c.y)<2){const overlap=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))-Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x));if(overlap>1)extra+=160+overlap*2;}else if(a.x===b.x&&c.y===d.y&&a.x>Math.min(c.x,d.x)&&a.x<Math.max(c.x,d.x)&&c.y>Math.min(a.y,b.y)&&c.y<Math.max(a.y,b.y))extra+=18;else if(a.y===b.y&&c.x===d.x&&a.y>Math.min(c.y,d.y)&&a.y<Math.max(c.y,d.y)&&c.x>Math.min(a.x,b.x)&&c.x<Math.max(a.x,b.x))extra+=18;}return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+extra;}
    function search(from,to){
      const s=index(from),target=index(to),heap=new Heap(),dist=new Map([[s*3,0]]),parent=new Map();heap.push({key:s*3,f:0});let found;
      while(heap.a.length){const {key}=heap.pop(),v=Math.floor(key/3),direction=key%3,p=points[v],g=dist.get(key);if(v===target){found=key;break;}const ix=v%nx,iy=Math.floor(v/nx);
        for(const [n,dir] of [[ix? v-1:-1,1],[ix<nx-1?v+1:-1,1],[iy?v-nx:-1,2],[iy<ny-1?v+nx:-1,2]]){if(n<0||!valid[n])continue;const q=points[n],cache=Math.min(v,n)+':'+Math.max(v,n);if(!passable.has(cache))passable.set(cache,!obstacles.some(r=>cuts(p,q,r)));if(!passable.get(cache))continue;const next=n*3+dir,value=g+cost(p,q)+(direction&&direction!==dir?20:0);if(value<(dist.get(next)??Infinity)){dist.set(next,value);parent.set(next,key);heap.push({key:next,f:value+Math.abs(q.x-to.x)+Math.abs(q.y-to.y)});}}
      }
      if(found===undefined)throw Error('No unobstructed route for '+e.id);
      const path=[];for(let k=found;k!==undefined;k=parent.get(k))path.push(points[Math.floor(k/3)]);return path.reverse();
    }
    const raw=[start.tip,...search(start.anchor,via),...search(via,end.anchor).slice(1),end.tip],simplified=[];
    for(const p of raw){if(simplified.length&&p.x===simplified.at(-1).x&&p.y===simplified.at(-1).y)continue;while(simplified.length>1){const a=simplified.at(-2),b=simplified.at(-1);if((a.x===b.x&&b.x===p.x&&(b.y-a.y)*(p.y-b.y)>=0)||(a.y===b.y&&b.y===p.y&&(b.x-a.x)*(p.x-b.x)>=0))simplified.pop();else break;}simplified.push(p);}
    for(let i=1;i<simplified.length;i++)segments.push([simplified[i-1],simplified[i]]);result.set(e.id,simplified);
  }
  return result;
}
