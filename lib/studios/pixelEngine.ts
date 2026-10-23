// @ts-nocheck
/* Ported from samples/GraphitePad-Pixel-Studio.html. */
import { toggleTheme } from "@/lib/theme";
import { DB32 } from "@/lib/studios/defaults";

type SaveFn = (content: unknown, thumbnail?: string) => Promise<unknown>;
type ExportFn = (filename: string, dataUrl: string) => Promise<{ path?: string }>;
export type PixelEngineApi = { destroy: () => void; saveNow: (withThumbnail?: boolean) => Promise<void>; thumbnail: () => string };

export function createPixelEngine(root: HTMLElement, initial: any, callbacks: { onSave: SaveFn; onExport: ExportFn; onSaved?: () => void }): PixelEngineApi {
const data = initial && typeof initial === "object" ? initial : {};
let ready = false, destroyed = false, saveTimer = 0, thumbTimer = 0, saveChain: Promise<void> = Promise.resolve(), saveLabel = "", backRequested = false;
const $=i=>root.querySelector('#'+i),gc=$('g'),gx=gc.getContext('2d'),prevC=$('prevC'),px=prevC.getContext('2d');
const dpr=Math.max(1,devicePixelRatio||1),CHUNK=128;
let W=innerWidth,H=innerHeight;
/* v.x, v.y: screen position of world pixel (0,0); v.z: screen pixels per world pixel (0.5 to 64) */
const v={x:Math.round(W/2),y:Math.round(H/2),z:12};
const ds=data.settings??{};
const S={tool:'pencil',fg:'#26262b',bg:'#f7f3ea',size:1,pxPerf:true,fillShp:false,dith:0,mode:'clutch',guide:'inf',bgStyle:'paper',grid:true,tiled:false,sym:0,symX:0,symY:0,onion:false,lx:W/2,ly:H/2,pxX:0,pxY:0,ctrl:false,ctrlX:W/2,ctrlY:H/2,clutchLock:false,pen:false,playing:false,fps:8,exportScale:4,palette:'db32',...ds,lx:W/2,ly:H/2,pxX:0,pxY:0,ctrl:false,ctrlX:W/2,ctrlY:H/2,pen:false,playing:false};
const PALS={
db32:DB32,
pico8:['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'],
sweetie16:['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57'],
gb:['#0f380f','#306230','#8bac0f','#9bbc0f'],
endesga:['#be4a2f','#d77643','#ead4aa','#e4a672','#b86f50','#733e39','#3e2731','#a22633','#e43b44','#f77622','#feae34','#fee761','#63c74d','#3e8948','#265c42','#193c3e','#124e89','#0099db','#2ce8f5','#ffffff','#c0cbdc','#8b9bb4','#5a6988','#3a4466']
};
let pal=Array.isArray(data.palette)&&data.palette.length?[...data.palette]:(PALS[ds.palette]?[...PALS[ds.palette]]:[...PALS.db32]),layers=[],numF=1,actL=0,actF=0,hist=[],redo=[],refImg=null,D=null,curveSt=null,sel=null,clip=null,pan=null,dragSym=null,space=false,playTm=0,st=0,wheelTs=0,undoTs=0;
const h=(t,x,f,c,ti)=>{const e=document.createElement(t);e.textContent=x;if(f)e.onclick=f;if(c)e.className=c;if(ti)e.title=ti;return e};

/* Infinite Auto-Expanding Cel Engine:
   Each cel has world origin (x, y) and an offscreen canvas c of size (w, h).
   Whenever drawing reaches outside [x, y, x+w, y+h], ensureCel expands the canvas in CHUNK (128px) increments in any direction (-x, -y, +x, +y). */
function mkRawCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function mkCel(x=-64,y=-64,w=128,h=128){return{x,y,c:mkRawCanvas(w,h)}}
function cloneCel(cel){const c=mkRawCanvas(cel.c.width,cel.c.height);c.getContext('2d').drawImage(cel.c,0,0);return{x:cel.x,y:cel.y,c}}
function ensureCel(cel,x0,y0,x1,y1){
const pad=16,minX=Math.min(x0,x1)-pad,minY=Math.min(y0,y1)-pad,maxX=Math.max(x0,x1)+pad,maxY=Math.max(y0,y1)+pad;
const curX1=cel.x+cel.c.width,curY1=cel.y+cel.c.height;
if(minX>=cel.x&&minY>=cel.y&&maxX<curX1&&maxY<curY1)return false;
const nx=minX<cel.x?Math.floor(minX/CHUNK)*CHUNK:cel.x;
const ny=minY<cel.y?Math.floor(minY/CHUNK)*CHUNK:cel.y;
const nx1=maxX>=curX1?Math.ceil((maxX+1)/CHUNK)*CHUNK:curX1;
const ny1=maxY>=curY1?Math.ceil((maxY+1)/CHUNK)*CHUNK:curY1;
const nw=Math.max(CHUNK,nx1-nx),nh=Math.max(CHUNK,ny1-ny);
const nc=mkRawCanvas(nw,nh);
nc.getContext('2d').drawImage(cel.c,cel.x-nx,cel.y-ny);
cel.x=nx;cel.y=ny;cel.c=nc;return true}

function addLayer(n){const cels=[];for(let f=0;f<numF;f++)cels.push(mkCel());const l={n,vis:true,op:1,cels};layers.push(l);return l}
const curCel=()=>layers[actL]&&layers[actL].cels[actF];

/* colour helpers */
function hexRgba(hex){const v=parseInt(hex.slice(1),16);return[(v>>16)&255,(v>>8)&255,v&255,255]}
function rgbHex(r,g,b){return'#'+[r,g,b].map(x=>Math.max(0,Math.min(255,x|0)).toString(16).padStart(2,'0')).join('')}
function shadeCol(r,g,b,dir){
const hex=rgbHex(r,g,b),idx=pal.indexOf(hex);
if(idx>=0&&idx+dir>=0&&idx+dir<pal.length)return hexRgba(pal[idx+dir]);
const step=dir*18;return[Math.max(0,Math.min(255,r+step)),Math.max(0,Math.min(255,g+step)),Math.max(0,Math.min(255,b+step)),255]}

/* history: snapshot whole sprite state before mutating actions */
function snapState(){return{numF,actL,actF,layers:layers.map(l=>({n:l.n,vis:l.vis,op:l.op,cels:l.cels.map(c=>cloneCel(c))}))}}
function restoreState(s){numF=s.numF;actL=Math.min(s.actL,s.layers.length-1);actF=Math.min(s.actF,s.numF-1);
layers=s.layers.map(l=>({n:l.n,vis:l.vis,op:l.op,cels:l.cels.map(c=>cloneCel(c))}));
sel=null;curveSt=null;render();ui();save()}
function pushHist(before){hist.push(before);if(hist.length>45)hist.shift();redo=[];btns();save()}
function undo(){
undoTs=performance.now();S.ctrlX=S.lx;S.ctrlY=S.ly;
if(curveSt){curveSt=null;render();info();return}
if(D){if(D.pts&&D.pts.length>2)finish();else{D=null;S.pen=false;render();info()}}
if(!hist.length)return;
redo.push(snapState());restoreState(hist.pop());btns()}
function redoF(){
undoTs=performance.now();S.ctrlX=S.lx;S.ctrlY=S.ly;
if(D){D=null;S.pen=false}
if(!redo.length)return;
hist.push(snapState());restoreState(redo.pop());btns()}
const btns=()=>{$('bUndo').disabled=!hist.length;$('bRedo').disabled=!redo.length};

/* world pixel coordinate conversion (unbounded in (-inf, +inf)) */
const toPx=(sx,sy)=>({x:Math.floor((sx-v.x)/v.z),y:Math.floor((sy-v.y)/v.z)});

/* compute tight world pixel bounding box across visible layers */
function celOpaqueBounds(cel){
const w=cel.c.width,h=cel.c.height,d=cel.c.getContext('2d').getImageData(0,0,w,h).data;
let x0=w,y0=h,x1=-1,y1=-1;
for(let y=0;y<h;y++){const row=y*w*4;for(let x=0;x<w;x++)if(d[row+x*4+3]>0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
return x1<x0?null:[cel.x+x0,cel.y+y0,cel.x+x1+1,cel.y+y1+1]}

function frameBounds(fIdx=actF){
if(S.guide!='inf'){const[gw,gh]=S.guide.split('x').map(Number),hw=Math.floor(gw/2),hh=Math.floor(gh/2);
let a=-hw,b=-hh,c=gw-hw,d=gh-hh;
layers.forEach(l=>{if(!l.vis||!l.cels[fIdx])return;const q=celOpaqueBounds(l.cels[fIdx]);if(q){a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[2]);d=Math.max(d,q[3])}});
return[a,b,c,d]}
let a=1e9,b=1e9,c=-1e9,d=-1e9;
layers.forEach(l=>{if(!l.vis||!l.cels[fIdx])return;const q=celOpaqueBounds(l.cels[fIdx]);if(q){a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[2]);d=Math.max(d,q[3])}});
return a>c?[-16,-16,16,16]:[a,b,c,d]}

function allFramesBounds(){
let a=1e9,b=1e9,c=-1e9,d=-1e9;
for(let f=0;f<numF;f++){const q=frameBounds(f);a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[2]);d=Math.max(d,q[3])}
return a>c?[-16,-16,16,16]:[a,b,c,d]}

/* low-level pixel plotting on a working cel buffer */
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function ditherHit(x,y,pat){
const mx=((x%4)+4)&3,my=((y%4)+4)&3,bv=BAYER[my][mx];
if(pat==0)return((x+y)&1)==0;
if(pat==1)return bv<4;
if(pat==2)return bv<12;
return((x-y)&3)==0}

function plotDot(wCel,x,y,tool,useBg){
const sz=S.size,r0=-Math.floor((sz-1)/2),r1=Math.floor(sz/2),fg=hexRgba(useBg?S.bg:S.fg),bg=hexRgba(useBg?S.fg:S.bg);
const cw=wCel.c.width,ch=wCel.c.height,ox=wCel.x,oy=wCel.y,d=wCel.id.data;
for(let dy=r0;dy<=r1;dy++)for(let dx=r0;dx<=r1;dx++){
if(sz>2&&dx*dx+dy*dy>(sz/2+.3)*(sz/2+.3))continue;
const px=x+dx,py=y+dy;
if(sel&&!sel.float&&(px<sel.x||px>=sel.x+sel.w||py<sel.y||py>=sel.y+sel.h))continue;
const lx=px-ox,ly=py-oy;if(lx<0||lx>=cw||ly<0||ly>=ch)continue;
const i=(ly*cw+lx)*4;
if(tool=='erase'){d[i]=d[i+1]=d[i+2]=d[i+3]=0}
else if(tool=='dither'){const c=ditherHit(px,py,S.dith)?fg:bg;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255}
else if(tool=='shade'){if(d[i+3]==0)continue;const sc=shadeCol(d[i],d[i+1],d[i+2],useBg?-1:1);d[i]=sc[0];d[i+1]=sc[1];d[i+2]=sc[2];d[i+3]=255}
else{d[i]=fg[0];d[i+1]=fg[1];d[i+2]=fg[2];d[i+3]=255}}}

function plotSym(wCel,x,y,tool,useBg){
plotDot(wCel,x,y,tool,useBg);
const sx=2*S.symX-1-x,sy=2*S.symY-1-y;
if(S.sym==1||S.sym==3)plotDot(wCel,sx,y,tool,useBg);
if(S.sym==2||S.sym==3)plotDot(wCel,x,sy,tool,useBg);
if(S.sym==3)plotDot(wCel,sx,sy,tool,useBg)}

function ensureWorkCel(wCel,x,y){
const pad=S.size+8,sx=2*S.symX-1-x,sy=2*S.symY-1-y;
const x0=(S.sym==1||S.sym==3?Math.min(x,sx):x)-pad,x1=(S.sym==1||S.sym==3?Math.max(x,sx):x)+pad;
const y0=(S.sym==2||S.sym==3?Math.min(y,sy):y)-pad,y1=(S.sym==2||S.sym==3?Math.max(y,sy):y)+pad;
if(x0>=wCel.x&&y0>=wCel.y&&x1<wCel.x+wCel.c.width&&y1<wCel.y+wCel.c.height)return;
wCel.ctx.putImageData(wCel.id,0,0);
ensureCel(wCel,x0,y0,x1,y1);
const b= {x:wCel.base.x,y:wCel.base.y,c:cloneCel(wCel.base).c};
ensureCel(b,wCel.x,wCel.y,wCel.x+wCel.c.width-1,wCel.y+wCel.c.height-1);
wCel.base=b;
wCel.ctx=wCel.c.getContext('2d');
wCel.id=wCel.ctx.getImageData(0,0,wCel.c.width,wCel.c.height);
wCel.baseId=wCel.base.c.getContext('2d').getImageData(0,0,wCel.c.width,wCel.c.height)}

/* Bresenham line, Pixel-Perfect filter, shapes, flood fill, gradient */
function bresLine(x0,y0,x1,y1){
const pts=[];let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
for(;;){pts.push({x:x0,y:y0});if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}
return pts}

function filterPxPerfect(pts){
if(pts.length<3)return pts;
const out=[pts[0]];
for(let i=1;i<pts.length-1;i++){
const p=out[out.length-1],c=pts[i],n=pts[i+1];
const lCorner=(Math.abs(p.x-c.x)+Math.abs(p.y-c.y)==1)&&(Math.abs(n.x-c.x)+Math.abs(n.y-c.y)==1)&&(p.x!=n.x&&p.y!=n.y);
if(!lCorner)out.push(c)}
out.push(pts[pts.length-1]);
return out}

function snapLineEnd(a,b,sh){
if(!sh)return b;
const dx=b.x-a.x,dy=b.y-a.y,adx=Math.abs(dx),ady=Math.abs(dy);
if(adx==0&&ady==0)return b;
const r=ady/(adx||1e-6);
if(r<.22)return{x:b.x,y:a.y};
if(r>4.5)return{x:a.x,y:b.y};
if(r>=.38&&r<=.68){const w=Math.round(adx/2)*2;return{x:a.x+(dx<0?-w:w),y:a.y+(dy<0?-w/2:w/2)}}
if(r>=1.45&&r<=2.6){const h=Math.round(ady/2)*2;return{x:a.x+(dx<0?-h/2:h/2),y:a.y+(dy<0?-h:h)}}
const m=Math.max(adx,ady);return{x:a.x+(dx<0?-m:m),y:a.y+(dy<0?-m:m)}}

function shapePixels(t,a,b,ctrl,filled){
const pts=[];
if(t=='line')return bresLine(a.x,a.y,b.x,b.y);
if(t=='curve'){
const c=ctrl||{x:Math.round((a.x+b.x)/2),y:Math.round((a.y+b.y)/2)};
const steps=Math.max(12,Math.hypot(b.x-a.x,b.y-a.y)*3|0);let lx=a.x,ly=a.y;
for(let i=0;i<=steps;i++){const u=i/steps,u1=1-u,nx=Math.round(u1*u1*a.x+2*u1*u*c.x+u*u*b.x),ny=Math.round(u1*u1*a.y+2*u1*u*c.y+u*u*b.y);
bresLine(lx,ly,nx,ny).forEach(p=>pts.push(p));lx=nx;ly=ny}
return pts}
const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);
if(t=='rect'){
for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(filled||y==y0||y==y1||x==x0||x==x1)pts.push({x,y});
return pts}
if(t=='ell'){
const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=(x1-x0)/2,ry=(y1-y0)/2;
if(rx<.5&&ry<.5)return[{x:x0,y:y0}];
for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
const nx=(x-cx)/(rx+.35),ny=(y-cy)/(ry+.35),d=nx*nx+ny*ny;
if(filled){if(d<=1)pts.push({x,y})}
else{const inx=(x-cx)/Math.max(.2,rx-.65),iny=(y-cy)/Math.max(.2,ry-.65);if(d<=1&&(inx*inx+iny*iny>=1||x==x0||x==x1||y==y0||y==y1))pts.push({x,y})}}
return pts}
return pts}

function floodFillCel(cel,sx,sy,col,contig){
const fb=frameBounds(actF);
const bx0=sel?sel.x:Math.min(fb[0]-32,sx-32),by0=sel?sel.y:Math.min(fb[1]-32,sy-32);
const bx1=sel?sel.x+sel.w-1:Math.max(fb[2]+32,sx+32),by1=sel?sel.y+sel.h-1:Math.max(fb[3]+32,sy+32);
ensureCel(cel,bx0,by0,bx1,by1);
const cw=cel.c.width,ch=cel.c.height,ox=cel.x,oy=cel.y,cx=cel.c.getContext('2d'),id=cx.getImageData(0,0,cw,ch),d=id.data;
const lx0=sx-ox,ly0=sy-oy;if(lx0<0||lx0>=cw||ly0<0||ly0>=ch)return;
const si=(ly0*cw+lx0)*4,tr=d[si],tg=d[si+1],tb=d[si+2],ta=d[si+3];
if(tr==col[0]&&tg==col[1]&&tb==col[2]&&ta==col[3])return;
if(!contig){
for(let i=0;i<d.length;i+=4)if(d[i]==tr&&d[i+1]==tg&&d[i+2]==tb&&d[i+3]==ta){d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=col[3]}
cx.putImageData(id,0,0);return}
const minLX=Math.max(0,bx0-ox),minLY=Math.max(0,by0-oy),maxLX=Math.min(cw-1,bx1-ox),maxLY=Math.min(ch-1,by1-oy);
const vis=new Uint8Array(cw*ch),q=[lx0,ly0];vis[ly0*cw+lx0]=1;
while(q.length){const y=q.pop(),x=q.pop(),i=(y*cw+x)*4;
d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=col[3];
[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].forEach(([nx,ny])=>{
if(nx>=minLX&&nx<=maxLX&&ny>=minLY&&ny<=maxLY&&!vis[ny*cw+nx]){
const ni=(ny*cw+nx)*4;if(d[ni]==tr&&d[ni+1]==tg&&d[ni+2]==tb&&d[ni+3]==ta){vis[ny*cw+nx]=1;q.push(nx,ny)}}})}
cx.putImageData(id,0,0)}

function drawGrad(wCel,a,b,useBg){
const fg=hexRgba(useBg?S.bg:S.fg),bg=hexRgba(useBg?S.fg:S.bg),dx=b.x-a.x,dy=b.y-a.y,L2=Math.max(1,dx*dx+dy*dy);
const x0=sel?sel.x:Math.min(a.x,b.x),x1=sel?sel.x+sel.w-1:Math.max(a.x,b.x);
const y0=sel?sel.y:Math.min(a.y,b.y),y1=sel?sel.y+sel.h-1:Math.max(a.y,b.y);
const cw=wCel.c.width,ch=wCel.c.height,ox=wCel.x,oy=wCel.y,d=wCel.id.data;
for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
const lx=x-ox,ly=y-oy;if(lx<0||lx>=cw||ly<0||ly>=ch)continue;
const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/L2)),thr=BAYER[((y%4)+4)&3][((x%4)+4)&3]/16,c=t<=thr?fg:bg,i=(ly*cw+lx)*4;
d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255}}

function fillPolygon(wCel,pts,useBg){
if(pts.length<3)return;
const fg=hexRgba(useBg?S.bg:S.fg),cw=wCel.c.width,ch=wCel.c.height,ox=wCel.x,oy=wCel.y,d=wCel.id.data;
let yMin=1e9,yMax=-1e9;pts.forEach(p=>{yMin=Math.min(yMin,p.y);yMax=Math.max(yMax,p.y)});
for(let y=yMin;y<=yMax;y++){const xs=[];
for(let i=0,j=pts.length-1;i<pts.length;j=i++){const pi=pts[i],pj=pts[j];if((pi.y<=y&&pj.y>y)||(pj.y<=y&&pi.y>y))xs.push(pi.x+(y-pi.y)*(pj.x-pi.x)/(pj.y-pi.y))}
xs.sort((a,b)=>a-b);
for(let k=0;k<xs.length-1;k+=2){for(let x=Math.ceil(xs[k]);x<=Math.floor(xs[k+1]);x++){
const lx=x-ox,ly=y-oy;if(lx>=0&&lx<cw&&ly>=0&&ly<ch){const idx=(ly*cw+lx)*4;d[idx]=fg[0];d[idx+1]=fg[1];d[idx+2]=fg[2];d[idx+3]=255}}}}
pts.forEach(p=>plotSym(wCel,p.x,p.y,'pencil',useBg))}

/* rendering infinite canvas, checker/paper background, layers, onion skin, tile preview, grid, selection & cursor */
const checkerPatCanvas=mkRawCanvas(32,32);
function updateCheckerPat(){
const c=checkerPatCanvas.getContext('2d'),ck1=getComputedStyle(document.documentElement).getPropertyValue('--ck1').trim()||'#f2efe8',ck2=getComputedStyle(document.documentElement).getPropertyValue('--ck2').trim()||'#e5e1d6';
c.fillStyle=ck1;c.fillRect(0,0,32,32);c.fillStyle=ck2;c.fillRect(16,0,16,16);c.fillRect(0,16,16,16)}
updateCheckerPat();

function drawFrameToCtx(cx,fIdx,ox,oy,z){
layers.forEach((l,li)=>{if(!l.vis)return;cx.globalAlpha=l.op;
const cel=(li==actL&&fIdx==actF&&D&&D.wCel)?D.wCel:l.cels[fIdx];
if(cel)cx.drawImage(cel.c,Math.round(ox+cel.x*z),Math.round(oy+cel.y*z),Math.round(cel.c.width*z),Math.round(cel.c.height*z))});
if(fIdx==actF&&sel&&sel.floatC){cx.globalAlpha=1;cx.drawImage(sel.floatC,Math.round(ox+sel.x*z),Math.round(oy+sel.y*z),Math.round(sel.w*z),Math.round(sel.h*z))}
cx.globalAlpha=1}

function buildBoundedComp(fIdx,b){
const bw=Math.max(1,b[2]-b[0]),bh=Math.max(1,b[3]-b[1]),out=mkRawCanvas(bw,bh),ox=out.getContext('2d');
ox.imageSmoothingEnabled=false;
layers.forEach((l,li)=>{if(!l.vis)return;ox.globalAlpha=l.op;
const cel=(li==actL&&fIdx==actF&&D&&D.wCel)?D.wCel:l.cels[fIdx];
if(cel)ox.drawImage(cel.c,cel.x-b[0],cel.y-b[1])});
if(fIdx==actF&&sel&&sel.floatC){ox.globalAlpha=1;ox.drawImage(sel.floatC,sel.x-b[0],sel.y-b[1])}
ox.globalAlpha=1;return out}

function render(){
gx.setTransform(dpr,0,0,dpr,0,0);
gx.imageSmoothingEnabled=false;
const ox=Math.round(v.x),oy=Math.round(v.y),z=v.z;

/* 1. Infinite Backdrop */
if(S.bgStyle=='checker'){
const pat=gx.createPattern(checkerPatCanvas,'repeat');
gx.fillStyle=pat;gx.fillRect(0,0,W,H)}
else{
const bgMap={paper:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()||'#f7f3ea',tan:'#d8c7aa',dark:'#1b1d22'};
gx.fillStyle=bgMap[S.bgStyle]||'#f7f3ea';gx.fillRect(0,0,W,H)}

/* 2. Reference trace image */
if(refImg&&refImg.vis!==false){
gx.save();gx.globalAlpha=refImg.op;const sc=refImg.sc/100,rw=refImg.w*sc*z,rh=refImg.h*sc*z;
gx.drawImage(refImg.img,Math.round(ox+refImg.x*z),Math.round(oy+refImg.y*z),Math.round(rw),Math.round(rh));gx.restore()}

/* 3. Onion skinning */
if(S.onion&&numF>1){
if(actF>0){const b=frameBounds(actF-1),oc=buildBoundedComp(actF-1,b);gx.save();gx.globalAlpha=.28;gx.filter='sepia(1) hue-rotate(-35deg) saturate(3)';gx.drawImage(oc,Math.round(ox+b[0]*z),Math.round(oy+b[1]*z),Math.round(oc.width*z),Math.round(oc.height*z));gx.restore()}
if(actF<numF-1){const b=frameBounds(actF+1),oc=buildBoundedComp(actF+1,b);gx.save();gx.globalAlpha=.22;gx.filter='sepia(1) hue-rotate(140deg) saturate(3)';gx.drawImage(oc,Math.round(ox+b[0]*z),Math.round(oy+b[1]*z),Math.round(oc.width*z),Math.round(oc.height*z));gx.restore()}}

/* 4. Tiled 3x3 repeat preview around artwork bounds */
const fb=frameBounds(actF),curComp=buildBoundedComp(actF,fb);
if(S.tiled){
const tw=(fb[2]-fb[0])*z,th=(fb[3]-fb[1])*z;
gx.save();gx.globalAlpha=.38;
for(let ty=-1;ty<=1;ty++)for(let tx=-1;tx<=1;tx++)if(tx||ty)gx.drawImage(curComp,Math.round(ox+fb[0]*z+tx*tw),Math.round(oy+fb[1]*z+ty*th),Math.round(tw),Math.round(th));
gx.restore()}

/* 5. Active composite layers across the infinite canvas */
drawFrameToCtx(gx,actF,ox,oy,z);

/* 6. Update mini preview in right panel */
prevC.width=curComp.width;prevC.height=curComp.height;
px.imageSmoothingEnabled=false;px.clearRect(0,0,prevC.width,prevC.height);px.drawImage(curComp,0,0);

/* 7. Infinite Grid: 1px pixel grid (when z >= 6) + 16px tile grid */
if(S.grid){
const vx0=Math.floor(-ox/z),vy0=Math.floor(-oy/z),vx1=Math.ceil((W-ox)/z),vy1=Math.ceil((H-oy)/z);
if(z>=6){
gx.strokeStyle='rgba(90,90,100,.14)';gx.lineWidth=1;gx.beginPath();
for(let x=vx0;x<=vx1;x++){const sx=Math.round(ox+x*z)+.5;gx.moveTo(sx,0);gx.lineTo(sx,H)}
for(let y=vy0;y<=vy1;y++){const sy=Math.round(oy+y*z)+.5;gx.moveTo(0,sy);gx.lineTo(W,sy)}
gx.stroke()}
if(z>=2){
const step=16;gx.strokeStyle='rgba(70,105,175,.18)';gx.lineWidth=1;gx.beginPath();
for(let x=Math.floor(vx0/step)*step;x<=vx1;x+=step){const sx=Math.round(ox+x*z)+.5;gx.moveTo(sx,0);gx.lineTo(sx,H)}
for(let y=Math.floor(vy0/step)*step;y<=vy1;y+=step){const sy=Math.round(oy+y*z)+.5;gx.moveTo(0,sy);gx.lineTo(W,sy)}
gx.stroke()}
/* world origin (0,0) subtle cross */
gx.strokeStyle='rgba(60,100,190,.35)';gx.lineWidth=1;gx.beginPath();
gx.moveTo(ox+.5,0);gx.lineTo(ox+.5,H);gx.moveTo(0,oy+.5);gx.lineTo(W,oy+.5);gx.stroke()}

/* 8. Optional Guide Box (when user chooses a reference tile size, while still allowing infinite drawing outside) */
if(S.guide!='inf'){
const[gw,gh]=S.guide.split('x').map(Number),hw=Math.floor(gw/2),hh=Math.floor(gh/2);
gx.save();gx.setLineDash([6,4]);gx.strokeStyle='rgba(38,38,43,.55)';gx.lineWidth=1.5;
gx.strokeRect(Math.round(ox-hw*z)+.5,Math.round(oy-hh*z)+.5,Math.round(gw*z),Math.round(gh*z));gx.restore()}

/* 9. Draggable Symmetry Axes */
if(S.sym){
gx.save();gx.setLineDash([6,5]);gx.strokeStyle='rgba(200,60,60,.7)';gx.lineWidth=1.3;gx.beginPath();
const sx=Math.round(ox+S.symX*z)+.5,sy=Math.round(oy+S.symY*z)+.5;
if(S.sym==1||S.sym==3){gx.moveTo(sx,0);gx.lineTo(sx,H)}
if(S.sym==2||S.sym==3){gx.moveTo(0,sy);gx.lineTo(W,sy)}
gx.stroke();gx.setLineDash([]);
gx.fillStyle='rgba(200,60,60,.9)';
if(S.sym==1||S.sym==3){gx.beginPath();gx.arc(sx,52,5,0,6.3);gx.fill()}
if(S.sym==2||S.sym==3){gx.beginPath();gx.arc(98,sy,5,0,6.3);gx.fill()}
gx.restore()}

/* 10. Marquee Selection Box */
if(sel){
gx.save();gx.strokeStyle='#fff';gx.lineWidth=1.5;gx.strokeRect(Math.round(ox+sel.x*z),Math.round(oy+sel.y*z),Math.round(sel.w*z),Math.round(sel.h*z));
gx.setLineDash([4,4]);gx.strokeStyle='#26262b';gx.strokeRect(Math.round(ox+sel.x*z),Math.round(oy+sel.y*z),Math.round(sel.w*z),Math.round(sel.h*z));gx.restore()}

/* 11. Hover Pixel Brush Cursor (everywhere on the infinite canvas!) */
if(S.tool!='move'){
const sz=S.size,r0=-Math.floor((sz-1)/2),bx=Math.round(ox+(S.pxX+r0)*z),by=Math.round(oy+(S.pxY+r0)*z),bw=Math.max(2,Math.round(sz*z));
gx.save();gx.strokeStyle=(getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||'#26262b');gx.lineWidth=1.5;
gx.strokeRect(bx+.5,by+.5,bw-1,bw-1);
gx.strokeStyle='rgba(255,255,255,.75)';gx.lineWidth=1;
gx.strokeRect(bx+1.5,by+1.5,Math.max(1,bw-3),Math.max(1,bw-3));
gx.restore()}}

function fit(){
const b=frameBounds(actF),bw=Math.max(16,b[2]-b[0]),bh=Math.max(16,b[3]-b[1]);
const rawZ=Math.min((W-260)/bw,(H-220)/bh);
v.z=rawZ>=1?Math.max(1,Math.min(48,Math.floor(rawZ))):.5;
v.x=Math.round(W/2-(b[0]+b[2])/2*v.z);v.y=Math.round(H/2-(b[1]+b[3])/2*v.z);
$('zv').textContent=Math.round(v.z*100/12)+'%';render();scheduleSave()}

function zoomAt(sx,sy,f){
const ZSTEPS=[.5,.75,1,2,3,4,5,6,8,10,12,16,20,24,32,48,64];
let idx=ZSTEPS.findIndex(z=>z>=v.z);if(idx<0)idx=ZSTEPS.length-1;
const nIdx=Math.max(0,Math.min(ZSTEPS.length-1,idx+(f>1?1:-1))),nz=ZSTEPS[nIdx];
if(nz==v.z)return;
const wx=(sx-v.x)/v.z,wy=(sy-v.y)/v.z;v.z=nz;v.x=Math.round(sx-wx*nz);v.y=Math.round(sy-wy*nz);
$('zv').textContent=Math.round(v.z*100/12)+'%';render()}

function resize(){W=innerWidth;H=innerHeight;gc.width=W*dpr;gc.height=H*dpr;gc.style.width=W+'px';gc.style.height=H+'px';render()}

/* selection helpers */
function commitSel(){
if(!sel||!sel.floatC)return;
const cel=curCel();if(cel){ensureCel(cel,sel.x,sel.y,sel.x+sel.w,sel.y+sel.h);cel.c.getContext('2d').drawImage(sel.floatC,sel.x-cel.x,sel.y-cel.y)}
sel.floatC=null;sel.float=false}

function liftSel(){
if(!sel||sel.floatC)return;
const cel=curCel();if(!cel)return;
ensureCel(cel,sel.x,sel.y,sel.x+sel.w,sel.y+sel.h);
const fc=mkRawCanvas(sel.w,sel.h);fc.getContext('2d').drawImage(cel.c,sel.x-cel.x,sel.y-cel.y,sel.w,sel.h,0,0,sel.w,sel.h);
cel.c.getContext('2d').clearRect(sel.x-cel.x,sel.y-cel.y,sel.w,sel.h);
sel.floatC=fc;sel.float=true}

/* drawing session on the infinite pixel plane */
function focusCanvas(){if(document.activeElement&&document.activeElement!==document.body&&document.activeElement!==gc)document.activeElement.blur();window.focus();gc.focus({preventScroll:true})}
const isClutchActive=()=>S.ctrl||S.clutchLock;

function sampleColorAt(px,py){
for(let li=layers.length-1;li>=0;li--){const l=layers[li];if(!l.vis)continue;const cel=l.cels[actF];if(!cel)continue;
const lx=px-cel.x,ly=py-cel.y;if(lx>=0&&lx<cel.c.width&&ly>=0&&ly<cel.c.height){
const d=cel.c.getContext('2d').getImageData(lx,ly,1,1).data;if(d[3]>0)return rgbHex(d[0],d[1],d[2])}}
return null}

function begin(e,fromClutch){
const l=layers[actL];if(!l||!l.vis)return;
const p=toPx(e.clientX,e.clientY),useBg=(e.button==2||e.shiftKey)&&S.tool!='line'&&S.tool!='rect'&&S.tool!='ell';
S.pxX=p.x;S.pxY=p.y;
if(S.tool=='eyedrop'||e.altKey){
const hex=sampleColorAt(p.x,p.y);if(hex){if(useBg){S.bg=hex;$('colBg').value=hex}else{S.fg=hex;$('col').value=hex}ui()}
return}
const before=snapState(),cel=curCel();
if(S.tool=='bucket'){
pushHist(before);floodFillCel(cel,p.x,p.y,hexRgba(useBg?S.bg:S.fg),!e.ctrlKey);
render();save();return}
if(S.tool=='select'){
if(sel&&p.x>=sel.x&&p.x<sel.x+sel.w&&p.y>=sel.y&&p.y<sel.y+sel.h){
pushHist(before);liftSel();D={t:'moveSel',ox:p.x-sel.x,oy:p.y-sel.y,clutch:!!fromClutch};S.pen=true;return}
commitSel();sel=null;D={t:'select',a:p,cur:p,clutch:!!fromClutch};S.pen=true;render();return}

ensureCel(cel,p.x-S.size-8,p.y-S.size-8,p.x+S.size+8,p.y+S.size+8);
const wCel=cloneCel(cel);wCel.base=cloneCel(cel);
wCel.ctx=wCel.c.getContext('2d');
wCel.id=wCel.ctx.getImageData(0,0,wCel.c.width,wCel.c.height);
wCel.baseId=wCel.base.c.getContext('2d').getImageData(0,0,wCel.c.width,wCel.c.height);
ensureWorkCel(wCel,p.x,p.y);

D={t:S.tool,before,cel,wCel,a:p,cur:p,pts:[p],useBg,clutch:!!fromClutch,dist:0};
if(['pencil','erase','dither','shade','contour'].includes(S.tool)){
plotSym(wCel,p.x,p.y,S.tool=='contour'?'pencil':S.tool,useBg);
wCel.ctx.putImageData(wCel.id,0,0)}
S.pen=true;render();info()}

function mv(e){
const p=toPx(e.clientX,e.clientY);S.pxX=p.x;S.pxY=p.y;
if(!D){render();return}
if(D.t=='moveSel'){if(sel){sel.x=p.x-D.ox;sel.y=p.y-D.oy;render()}return}
if(D.t=='select'){
const x0=Math.min(D.a.x,p.x),y0=Math.min(D.a.y,p.y),x1=Math.max(D.a.x,p.x),y1=Math.max(D.a.y,p.y);
sel={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,float:false,floatC:null};render();return}
const last=D.pts[D.pts.length-1];
if(p.x===last.x&&p.y===last.y)return;
D.dist+=Math.hypot(p.x-last.x,p.y-last.y);
D.cur=p;
ensureWorkCel(D.wCel,p.x,p.y);
if(['pencil','erase','dither','shade','contour'].includes(D.t)){
const seg=bresLine(last.x,last.y,p.x,p.y);
for(let i=1;i<seg.length;i++){ensureWorkCel(D.wCel,seg[i].x,seg[i].y);D.pts.push(seg[i])}
if(D.t=='pencil'&&S.pxPerf&&S.size==1){
D.wCel.id.data.set(D.wCel.baseId.data);
filterPxPerfect(D.pts).forEach(pt=>plotSym(D.wCel,pt.x,pt.y,'pencil',D.useBg))}
else if(D.t=='contour'){
D.wCel.id.data.set(D.wCel.baseId.data);
fillPolygon(D.wCel,D.pts,D.useBg)}
else{
for(let i=1;i<seg.length;i++)plotSym(D.wCel,seg[i].x,seg[i].y,D.t,D.useBg)}
D.wCel.ctx.putImageData(D.wCel.id,0,0);render();return}
/* shapes & gradient */
const b=snapLineEnd(D.a,p,e.shiftKey);D.cur=b;
ensureWorkCel(D.wCel,b.x,b.y);
D.wCel.id.data.set(D.wCel.baseId.data);
if(D.t=='grad'){drawGrad(D.wCel,D.a,b,D.useBg)}
else{shapePixels(D.t,D.a,b,null,S.fillShp).forEach(pt=>plotSym(D.wCel,pt.x,pt.y,'pencil',D.useBg))}
D.wCel.ctx.putImageData(D.wCel.id,0,0);render()}

function finish(){
if(!D)return;const d=D;D=null;S.pen=false;
if(d.t=='select'||d.t=='moveSel'){render();info();return}
if(d.t=='curve'&&!curveSt&&Math.hypot(d.cur.x-d.a.x,d.cur.y-d.a.y)>=1){
curveSt={before:d.before,cel:d.cel,wCel:d.wCel,a:d.a,b:d.cur,ctrl:{x:Math.round((d.a.x+d.cur.x)/2),y:Math.round((d.a.y+d.cur.y)/2)},useBg:d.useBg};
info();return}
pushHist(d.before);
d.cel.x=d.wCel.x;d.cel.y=d.wCel.y;d.cel.c=mkRawCanvas(d.wCel.c.width,d.wCel.c.height);
d.cel.c.getContext('2d').drawImage(d.wCel.c,0,0);
render();info()}

/* pointer, wheel, keys & CTRL Auto-Clutch */
function symHit(sx,sy){
if(!S.sym)return null;
const ax=Math.round(v.x+S.symX*v.z),ay=Math.round(v.y+S.symY*v.z);
if((S.sym==1||S.sym==3)&&Math.abs(sx-ax)<9&&sy<90)return'x';
if((S.sym==2||S.sym==3)&&Math.abs(sy-ay)<9&&sx<140)return'y';
return null}

gc.onpointerenter=()=>focusCanvas();
gc.onpointerdown=e=>{
e.preventDefault();focusCanvas();
const p=toPx(e.clientX,e.clientY);S.lx=e.clientX;S.ly=e.clientY;S.pxX=p.x;S.pxY=p.y;
if(curveSt){
pushHist(curveSt.before);curveSt.cel.x=curveSt.wCel.x;curveSt.cel.y=curveSt.wCel.y;
curveSt.cel.c=mkRawCanvas(curveSt.wCel.c.width,curveSt.wCel.c.height);
curveSt.cel.c.getContext('2d').drawImage(curveSt.wCel.c,0,0);
curveSt=null;render();info();return}
const sh=symHit(e.clientX,e.clientY);
if(sh){dragSym=sh;gc.setPointerCapture(e.pointerId);return}
let hand=e.button==1||(space&&S.mode!='flow')||S.tool=='move';
if(hand){pan={sx:e.clientX,sy:e.clientY,x:v.x,y:v.y,ref:S.tool=='move'&&refImg&&!space};gc.setPointerCapture(e.pointerId);return}
if(S.mode!='flow'){gc.setPointerCapture(e.pointerId);if(D)finish();begin(e,false)}
else if(D)finish();else begin(e,false)};

gc.onpointermove=e=>{
const prevX=S.lx,prevY=S.ly;S.lx=e.clientX;S.ly=e.clientY;
const p=toPx(e.clientX,e.clientY);S.pxX=p.x;S.pxY=p.y;
if(dragSym){if(dragSym=='x')S.symX=p.x;else S.symY=p.y;render();return}
if(pan){
if(pan.ref&&refImg){refImg.x+=(e.clientX-pan.sx)/v.z;refImg.y+=(e.clientY-pan.sy)/v.z;pan.sx=e.clientX;pan.sy=e.clientY}
else{v.x=Math.round(pan.x+(e.clientX-pan.sx));v.y=Math.round(pan.y+(e.clientY-pan.sy))}
render();return}
if(curveSt){
const m={x:(curveSt.a.x+curveSt.b.x)/2,y:(curveSt.a.y+curveSt.b.y)/2};
curveSt.ctrl={x:Math.round(2*p.x-m.x),y:Math.round(2*p.y-m.y)};
ensureWorkCel(curveSt.wCel,curveSt.ctrl.x,curveSt.ctrl.y);
curveSt.wCel.id.data.set(curveSt.wCel.baseId.data);
shapePixels('curve',curveSt.a,curveSt.b,curveSt.ctrl,false).forEach(pt=>{ensureWorkCel(curveSt.wCel,pt.x,pt.y);plotSym(curveSt.wCel,pt.x,pt.y,'pencil',curveSt.useBg)});
curveSt.wCel.ctx.putImageData(curveSt.wCel.id,0,0);
D={wCel:curveSt.wCel};render();D=null;return}
const now=performance.now();
const clutchNow=(S.ctrl||S.clutchLock||(e.ctrlKey&&S.mode=='clutch'))&&(now-wheelTs>180)&&(now-undoTs>260)&&S.tool!='move';
if(clutchNow&&!D){
if(S.clutchLock||Math.hypot(e.clientX-S.ctrlX,e.clientY-S.ctrlY)>2){
begin({clientX:prevX||e.clientX,clientY:prevY||e.clientY,shiftKey:e.shiftKey,button:0},true)}
}else if(!clutchNow&&D&&D.clutch){finish();return}
if(D){const l=(e.getCoalescedEvents&&e.getCoalescedEvents())||[];(l.length?l:[e]).forEach(mv)}
else render();
info()};

const up=()=>{if(dragSym){dragSym=null;scheduleSave();return}if(pan){pan=null;scheduleSave();return}if(D&&!D.clutch&&S.mode!='flow')finish();else if(D&&D.t=='moveSel')scheduleSave()};
gc.onpointerup=up;gc.onpointercancel=up;
gc.oncontextmenu=e=>e.preventDefault();
gc.addEventListener('wheel',e=>{
e.preventDefault();wheelTs=performance.now();
if(D&&D.clutch&&D.dist<=1)D=null;
if(e.ctrlKey||e.metaKey)zoomAt(e.clientX,e.clientY,e.deltaY<0?1.2:.84);
else{v.x=Math.round(v.x-(e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX));v.y=Math.round(v.y-(e.shiftKey&&!e.deltaX?0:e.deltaY));render()}
scheduleSave()},{passive:false});

const KEYS={b:'pencil',p:'pencil',s:'shade',d:'dither',e:'erase',g:'bucket',j:'grad',i:'eyedrop',l:'line',u:'curve',r:'rect',o:'ell',k:'contour',m:'select',v:'move'};
const isTyping=e=>{const el=e.target,tag=el&&el.tagName;if(tag==='TEXTAREA'||tag==='SELECT')return true;if(tag==='INPUT'){const type=el.type;return type!=='range'&&type!=='color'&&type!=='checkbox'}return false};
const onKeyDown=e=>{
const k=(e.key||'').toLowerCase(),code=e.code||'';
if(isTyping(e)&&e.key!=='Escape')return;
if((e.metaKey||e.ctrlKey)&&(k=='z'||k=='y'||code=='KeyZ'||code=='KeyY')){
e.preventDefault();e.stopPropagation();
if(document.activeElement&&document.activeElement!==gc)document.activeElement.blur();
(k=='y'||code=='KeyY'||e.shiftKey)?redoF():undo();return}
if((e.metaKey||e.ctrlKey)&&k=='c'&&sel){
e.preventDefault();const c= buildBoundedComp(actF,[sel.x,sel.y,sel.x+sel.w,sel.y+sel.h]);clip=c;return}
if((e.metaKey||e.ctrlKey)&&k=='x'&&sel){
e.preventDefault();pushHist(snapState());const cel=curCel();ensureCel(cel,sel.x,sel.y,sel.x+sel.w,sel.y+sel.h);
const c=mkRawCanvas(sel.w,sel.h);c.getContext('2d').drawImage(cel.c,sel.x-cel.x,sel.y-cel.y,sel.w,sel.h,0,0,sel.w,sel.h);clip=c;
cel.c.getContext('2d').clearRect(sel.x-cel.x,sel.y-cel.y,sel.w,sel.h);sel=null;render();return}
if((e.metaKey||e.ctrlKey)&&k=='v'&&clip){
e.preventDefault();commitSel();const p=toPx(W/2,H/2);sel={x:p.x-Math.floor(clip.width/2),y:p.y-Math.floor(clip.height/2),w:clip.width,h:clip.height,float:true,floatC:mkRawCanvas(clip.width,clip.height)};
sel.floatC.getContext('2d').drawImage(clip,0,0);S.tool='select';ui();render();return}
if(e.key=='Control'){if(!S.ctrl){S.ctrl=true;S.ctrlX=S.lx;S.ctrlY=S.ly;ui();render()}return}
if(e.key=='Escape'){commitSel();sel=null;curveSt=null;if(D)D=null;S.clutchLock=false;ui();render();return}
if(e.key=='Delete'||e.key=='Backspace'){if(sel){pushHist(snapState());if(sel.floatC)sel=null;else{const cel=curCel();cel.c.getContext('2d').clearRect(sel.x-cel.x,sel.y-cel.y,sel.w,sel.h);sel=null}render();return}}
if(code=='Space'){e.preventDefault();if(document.activeElement&&document.activeElement!==gc)document.activeElement.blur();if(e.repeat)return;
if(S.mode=='flow'){D?finish():begin({clientX:S.lx,clientY:S.ly,button:0},false)}else space=true;return}
if(e.key=='Enter'){e.preventDefault();togglePlay();return}
if(e.metaKey||e.ctrlKey||e.altKey)return;
if(k=='x'){$('swapCol').click();return}
if(k==','){$('prevF').click();return}
if(k=='.'){$('nextF').click();return}
if(KEYS[k]){pick(KEYS[k]);return}
if(k=='['||k==']'){$('size').value=Math.max(1,Math.min(24,+$('size').value+(k==']'?1:-1)));$('size').oninput({target:$('size')})}
else if(k=='+'||k=='=')zoomAt(W/2,H/2,1.25);else if(k=='-')zoomAt(W/2,H/2,.8);else if(k=='0')fit()};
window.addEventListener('keydown',onKeyDown,true);

const onKeyUp=e=>{
if(e.key=='Control'){S.ctrl=false;if(D&&D.clutch)finish();ui();render()}
if(e.code=='Space')space=false};
window.addEventListener('keyup',onKeyUp,true);
const onBlur=()=>{S.ctrl=false;space=false;if(D&&D.clutch)finish();ui()};
window.addEventListener('blur',onBlur);

/* pixel art sprite operations on active cel: 1px outline, flip H/V, rotate 90° */
$('outlineBtn').onclick=()=>{
const cel=curCel(),b=celOpaqueBounds(cel);if(!b)return;
pushHist(snapState());ensureCel(cel,b[0]-2,b[1]-2,b[2]+2,b[3]+2);
const cw=cel.c.width,ch=cel.c.height,cx=cel.c.getContext('2d'),src=cx.getImageData(0,0,cw,ch),dst=cx.getImageData(0,0,cw,ch),fg=hexRgba(S.fg),sd=src.data,dd=dst.data;
for(let y=1;y<ch-1;y++)for(let x=1;x<cw-1;x++){
const i=(y*cw+x)*4;if(sd[i+3]>0)continue;
if(sd[(y*cw+x-1)*4+3]>0||sd[(y*cw+x+1)*4+3]>0||sd[((y-1)*cw+x)*4+3]>0||sd[((y+1)*cw+x)*4+3]>0){dd[i]=fg[0];dd[i+1]=fg[1];dd[i+2]=fg[2];dd[i+3]=255}}
cx.putImageData(dst,0,0);render();save()};

$('flipH').onclick=()=>{
const cel=curCel(),b=celOpaqueBounds(cel);if(!b)return;
pushHist(snapState());const w=b[2]-b[0],h=b[3]-b[1],t=mkRawCanvas(w,h);
t.getContext('2d').drawImage(cel.c,b[0]-cel.x,b[1]-cel.y,w,h,0,0,w,h);
const cx=cel.c.getContext('2d');cx.clearRect(b[0]-cel.x,b[1]-cel.y,w,h);
cx.save();cx.translate(b[0]-cel.x+w,b[1]-cel.y);cx.scale(-1,1);cx.drawImage(t,0,0);cx.restore();render();save()};

$('flipV').onclick=()=>{
const cel=curCel(),b=celOpaqueBounds(cel);if(!b)return;
pushHist(snapState());const w=b[2]-b[0],h=b[3]-b[1],t=mkRawCanvas(w,h);
t.getContext('2d').drawImage(cel.c,b[0]-cel.x,b[1]-cel.y,w,h,0,0,w,h);
const cx=cel.c.getContext('2d');cx.clearRect(b[0]-cel.x,b[1]-cel.y,w,h);
cx.save();cx.translate(b[0]-cel.x,b[1]-cel.y+h);cx.scale(1,-1);cx.drawImage(t,0,0);cx.restore();render();save()};

$('rot90').onclick=()=>{
const cel=curCel(),b=celOpaqueBounds(cel);if(!b)return;
pushHist(snapState());const w=b[2]-b[0],h=b[3]-b[1],cx0=Math.round((b[0]+b[2])/2),cy0=Math.round((b[1]+b[3])/2);
const t=mkRawCanvas(w,h);t.getContext('2d').drawImage(cel.c,b[0]-cel.x,b[1]-cel.y,w,h,0,0,w,h);
const nx0=cx0-Math.floor(h/2),ny0=cy0-Math.floor(w/2);
cel.c.getContext('2d').clearRect(b[0]-cel.x,b[1]-cel.y,w,h);
ensureCel(cel,nx0,ny0,nx0+h,ny0+w);
const cx=cel.c.getContext('2d');cx.save();cx.translate(nx0-cel.x+h/2,ny0-cel.y+w/2);cx.rotate(Math.PI/2);cx.drawImage(t,-w/2,-h/2);cx.restore();render();save()};

/* UI wiring */
function pick(t){finish();commitSel();curveSt=null;S.tool=t;gc.style.cursor=t=='move'?'grab':'crosshair';ui();render();scheduleSave()}
[['pencil','Pencil','Pencil (B / P) — 1px pixel-perfect or sized brush'],['shade','Shading','LibreSprite Shading Ink (S) — shifts pixels along palette ramp'],['dither','Dither','Bayer Dither Brush (D) — mixes FG & BG colours'],['erase','Eraser','Eraser (E)'],['bucket','Bucket','Flood Fill (G) — hold Ctrl to replace colour globally'],['grad','Gradient','Bayer Dithered Pixel Gradient (J)'],['eyedrop','Eyedrop','Colour Picker (I or Alt+click)'],['sep'],['line','Line','Pixel Line (L) — hold Shift for 45° & 2:1 isometric snap'],['curve','Curve','Bendable Pixel Curve (U)'],['rect','Rect','Pixel Rectangle (R) — toggle Fill in top bar'],['ell','Oval','Midpoint Pixel Oval / Circle (O)'],['contour','Contour','Filled Freehand Contour (K)'],['sep'],['select','Select','Marquee Select & Move Pixels (M)'],['move','Move / pan','Move Reference Image or Pan Infinite Canvas (V)']].forEach(a=>{
if(a[0]=='sep'){const d=document.createElement('div');d.className='sep';$('rail').append(d);return}
const b=h('button',a[1],()=>pick(a[0]),'',a[2]);b.dataset.t=a[0];$('rail').append(b)});

$('col').oninput=e=>{S.fg=e.target.value;ui();scheduleSave()};
$('colBg').oninput=e=>{S.bg=e.target.value;ui();scheduleSave()};
$('swapCol').onclick=()=>{const t=S.fg;S.fg=S.bg;S.bg=t;$('col').value=S.fg;$('colBg').value=S.bg;ui();scheduleSave()};
$('size').oninput=e=>{S.size=+e.target.value;$('sizeVal').textContent=S.size;render();scheduleSave()};
$('pxPerf').onclick=()=>{S.pxPerf=!S.pxPerf;ui();scheduleSave()};
$('fillShp').onclick=()=>{S.fillShp=!S.fillShp;ui();scheduleSave()};
$('dithPat').onchange=e=>{S.dith=+e.target.value;scheduleSave()};
$('mode').onchange=e=>{finish();S.mode=e.target.value;info();scheduleSave()};
$('clutchBtn').onclick=()=>{S.clutchLock=!S.clutchLock;if(!S.clutchLock&&D&&D.clutch)finish();ui();scheduleSave()};
$('csize').onchange=e=>{S.guide=e.target.value;render();info();scheduleSave()};
$('bgStyle').onchange=e=>{S.bgStyle=e.target.value;render();scheduleSave()};
$('gridBtn').onclick=()=>{S.grid=!S.grid;ui();render();scheduleSave()};
$('tileBtn').onclick=()=>{S.tiled=!S.tiled;ui();render();scheduleSave()};
$('sym').onchange=e=>{S.sym=+e.target.value;render();scheduleSave()};
$('onionBtn').onclick=()=>{S.onion=!S.onion;ui();render();scheduleSave()};
$('zo').onclick=()=>{zoomAt(W/2,H/2,.8);scheduleSave()};$('zi').onclick=()=>{zoomAt(W/2,H/2,1.25);scheduleSave()};$('zv').onclick=()=>{v.z=12;v.x=Math.round(W/2);v.y=Math.round(H/2);$('zv').textContent='100%';render();scheduleSave()};
$('fit').onclick=()=>{fit();scheduleSave()};
$('bUndo').onclick=undo;$('bRedo').onclick=redoF;

/* palette & layers & frames */
$('palSel').onchange=e=>{S.palette=e.target.value;pal=[...PALS[e.target.value]];ui();scheduleSave()};
$('addSw').onclick=()=>{if(!pal.includes(S.fg))pal.push(S.fg);ui();scheduleSave()};
$('addL').onclick=()=>{pushHist(snapState());addLayer('Layer '+(layers.length+1));actL=layers.length-1;ui();render();save()};
$('mergeL').onclick=()=>{if(actL<=0)return;pushHist(snapState());const top=layers[actL],bot=layers[actL-1];
for(let f=0;f<numF;f++){const tc=top.cels[f],bc=bot.cels[f];ensureCel(bc,tc.x,tc.y,tc.x+tc.c.width,tc.y+tc.c.height);
const ctx=bc.c.getContext('2d');ctx.globalAlpha=top.op;ctx.drawImage(tc.c,tc.x-bc.x,tc.y-bc.y);ctx.globalAlpha=1}
layers.splice(actL,1);actL--;ui();render();save()};
$('clr').onclick=()=>{pushHist(snapState());const cel=curCel();cel.c.getContext('2d').clearRect(0,0,cel.c.width,cel.c.height);render();save()};
$('lop').oninput=e=>{layers[actL].op=+e.target.value;render();save()};

/* animation timeline */
function togglePlay(){
S.playing=!S.playing;$('playBtn').textContent=S.playing?'⏸ Pause':'▶ Play';$('playBtn').classList.toggle('on',S.playing);
clearInterval(playTm);if(S.playing)playTm=setInterval(()=>{actF=(actF+1)%numF;ui();render()},1000/S.fps)}
$('playBtn').onclick=togglePlay;
$('fps').oninput=e=>{S.fps=+e.target.value;$('fpsVal').textContent=S.fps;if(S.playing){togglePlay();togglePlay()}scheduleSave()};
$('prevF').onclick=()=>{actF=(actF-1+numF)%numF;ui();render();scheduleSave()};
$('nextF').onclick=()=>{actF=(actF+1)%numF;ui();render();scheduleSave()};
$('addF').onclick=()=>{pushHist(snapState());layers.forEach(l=>l.cels.splice(actF+1,0,mkCel()));numF++;actF++;ui();render();save()};
$('dupF').onclick=()=>{pushHist(snapState());layers.forEach(l=>l.cels.splice(actF+1,0,cloneCel(l.cels[actF])));numF++;actF++;ui();render();save()};
$('delF').onclick=()=>{if(numF<2)return;pushHist(snapState());layers.forEach(l=>l.cels.splice(actF,1));numF--;actF=Math.min(actF,numF-1);ui();render();save()};

/* reference image */
function setRef(src){const im=new Image();im.onload=()=>{const w=Math.min(128,im.width),h=Math.round(im.height*w/im.width);refImg={img:im,src,x:-Math.floor(w/2),y:-Math.floor(h/2),w,h,op:.35,sc:100,vis:true};render();ui();scheduleSave()};im.src=src}
const getF=fs=>{for(const f of fs){if(!/^image\//.test(f.type)||f.size>14*1024*1024)continue;const reader=new FileReader();reader.onload=()=>setRef(String(reader.result));reader.readAsDataURL(f)}};
$('img').onclick=()=>$('file').click();$('file').onchange=e=>{getF(e.target.files);e.target.value=''};
$('clrRef').onclick=()=>{refImg=null;render();ui();scheduleSave()};
$('rop').oninput=e=>{if(refImg){refImg.op=+e.target.value;render();scheduleSave()}};
$('rsc').oninput=e=>{if(refImg){refImg.sc=+e.target.value;render();scheduleSave()}};
const onDragOver=e=>e.preventDefault();
const onDrop=e=>{e.preventDefault();if(e.dataTransfer?.files)getF(e.dataTransfer.files)};
const onPaste=e=>{const fs=[...(e.clipboardData?.items||[])].map(i=>i.getAsFile()).filter(Boolean);if(fs.length)getF(fs)};
window.addEventListener('dragover',onDragOver);window.addEventListener('drop',onDrop);window.addEventListener('paste',onPaste);
root.addEventListener('change',e=>{if(e.target.closest('#bar,#panel,#timeline'))e.target.blur()});
function refsCleanup(){if(refImg&&refImg.img)refImg.img.src=''}

/* exports: auto-crops to drawn artwork bounds (or guide bounds) on the infinite canvas */
$('save').onclick=()=>{void exportPng().then(()=>callbacks.onSaved?.()).catch(e=>console.error(e))};

$('saveSheet').onclick=()=>{void exportSheet().then(()=>callbacks.onSaved?.()).catch(e=>console.error(e))};

function delL(i){if(layers.length<2)return;pushHist(snapState());layers.splice(i,1);actL=Math.min(actL,layers.length-1);ui();render();save()}
function ui(){
const pg=$('palGrid');pg.innerHTML='';
pal.forEach(c=>{const b=h('button','',()=>{S.fg=c;$('col').value=c;ui();scheduleSave()},'sw'+(c==S.fg?' on':'')+(c==S.bg?' bg-on':''),c+' (Left: FG, Right/Shift: BG)');
b.style.background=c;b.oncontextmenu=e=>{e.preventDefault();S.bg=c;$('colBg').value=c;ui();scheduleSave()};pg.append(b)});

const ll=$('ll');ll.innerHTML='';
for(let i=layers.length-1;i>=0;i--){const l=layers[i],r=h('div','',null,'row'+(i==actL?' on':''));
r.append(
h('button',l.vis?'●':'○',()=>{l.vis=!l.vis;ui();render();save()},'mini','Show / hide layer'),
h('button',l.n,()=>{actL=i;ui();render();scheduleSave()},'nm','Select layer'),
h('button','✕',()=>delL(i),'mini','Delete layer'));
ll.append(r)}
$('lop').value=layers[actL]?layers[actL].op:1;$('mergeL').disabled=actL<=0;
$('rop').disabled=$('rsc').disabled=$('clrRef').disabled=!refImg;

const fl=$('fList');fl.innerHTML='';
for(let f=0;f<numF;f++){
const b=h('button','F'+(f+1),()=>{actF=f;ui();render();scheduleSave()},'fchip'+(f==actF?' on':''),'Frame '+(f+1));fl.append(b)}
$('delF').disabled=numF<2;

root.querySelectorAll('#rail button').forEach(b=>b.classList.toggle('on',b.dataset.t==S.tool));
$('pxPerf').classList.toggle('on',S.pxPerf);$('fillShp').classList.toggle('on',S.fillShp);
$('gridBtn').classList.toggle('on',S.grid);$('tileBtn').classList.toggle('on',S.tiled);$('onionBtn').classList.toggle('on',S.onion);
$('clutchBtn').classList.toggle('clutch-on',isClutchActive());
$('clutchBtn').textContent=S.clutchLock?'Clutch: LOCKED':S.ctrl?'Clutch: DRAWING':'Ctrl Clutch';
btns();info()}

function info(){
const n={pencil:'Pencil',shade:'Shading Ink',dither:'Bayer Dither',erase:'Eraser',bucket:'Flood Bucket',grad:'Pixel Gradient',eyedrop:'Eyedropper',line:'Pixel Line',curve:curveSt?'Curve (move & click to bend)':'Pixel Curve',rect:'Rectangle',ell:'Oval',contour:'Filled Contour',select:'Marquee Select',move:'Move / Pan'}[S.tool];
const b=frameBounds(actF),bw=b[2]-b[0],bh=b[3]-b[1];
const cl=isClutchActive()?'<b class="cl">CTRL CLUTCH ON (glide finger to paint pixels)</b>':'hold <b>Ctrl</b> + move finger to auto-draw';
$('status').innerHTML='<b>'+n+'</b> ['+S.pxX+', '+S.pxY+'] · Bounds '+bw+'×'+bh+'px (∞ canvas · F'+(actF+1)+'/'+numF+') · '+(S.mode=='flow'?(S.pen?'<b>pen DOWN</b>':'pen UP'):cl)+' · 2-finger scroll pans · pinch zooms'+(saveLabel?' · <b>'+saveLabel+'</b>':'')}

/* per-art autosave and thumbnails */
function serialize(){
return {
kind:'pixel',version:1,
frames:numF,activeLayer:actL,activeFrame:actF,
view:{x:v.x,y:v.y,z:v.z},
settings:{tool:S.tool,fg:S.fg,bg:S.bg,size:S.size,pxPerf:S.pxPerf,fillShp:S.fillShp,dith:S.dith,mode:S.mode,guide:S.guide,bgStyle:S.bgStyle,grid:S.grid,tiled:S.tiled,sym:S.sym,symX:S.symX,symY:S.symY,onion:S.onion,fps:S.fps,exportScale:S.exportScale,palette:S.palette},
palette:pal.slice(),
layers:layers.map(l=>({name:l.n,vis:l.vis,op:l.op,cels:l.cels.map(c=>({x:c.x,y:c.y,w:c.c.width,h:c.c.height,u:c.c.toDataURL()}))})),
ref:refImg?{src:refImg.src,x:refImg.x,y:refImg.y,w:refImg.w,h:refImg.h,op:refImg.op,sc:refImg.sc,vis:refImg.vis}:null
}}

function thumbnail(){
const b=frameBounds(actF),comp=buildBoundedComp(actF,b);
const o=mkRawCanvas(480,360),ox=o.getContext('2d');
const paper=getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()||'#f7f3ea';
ox.fillStyle=paper;ox.fillRect(0,0,o.width,o.height);ox.imageSmoothingEnabled=false;
const bw=Math.max(1,comp.width),bh=Math.max(1,comp.height);
const sc=Math.min((o.width-32)/bw,(o.height-32)/bh,8);
const dw=Math.max(1,Math.floor(bw*sc)),dh=Math.max(1,Math.floor(bh*sc));
ox.drawImage(comp,Math.floor((o.width-dw)/2),Math.floor((o.height-dh)/2),dw,dh);
return o.toDataURL('image/png')}

async function saveNow(withThumbnail=false){
if(!ready||destroyed)return;
clearTimeout(saveTimer);
const run=saveChain.then(async()=>{
saveLabel='Saving…';info();
try{const thumb=withThumbnail?thumbnail():undefined;await callbacks.onSave(serialize(),thumb);saveLabel='Saved';info();callbacks.onSaved?.()}
catch(e){saveLabel='Save failed';info();console.error(e)}});
saveChain=run.catch(()=>undefined);
await run}

function scheduleSave(){
if(!ready||destroyed)return;
clearTimeout(saveTimer);
saveTimer=window.setTimeout(()=>void saveNow(false),900);
clearTimeout(thumbTimer);
thumbTimer=window.setTimeout(()=>void saveNow(true),5000)}

function save(){scheduleSave()}

function load(){
const srcl=Array.isArray(data.layers)&&data.layers.length?data.layers:null;
numF=Math.max(1,(data.frames|0)||1);
actL=Math.max(0,(data.activeLayer|0)||0);
actF=Math.min(Math.max(0,(data.activeFrame|0)||0),numF-1);
if(data.view){v.x=+data.view.x||0;v.y=+data.view.y||0;v.z=Math.max(.5,Math.min(64,+data.view.z||12))}
if(!srcl){addLayer('Background');addLayer('Artwork');actL=1;return}
srcl.forEach(o=>{
const l={n:o.name||o.n||'Layer',vis:o.vis!==false,op:typeof o.op==='number'?o.op:1,cels:[]};
for(let f=0;f<numF;f++){
const ci=o.cels&&o.cels[f];
const cw=Math.max(1,ci&&ci.w?ci.w:128),chh=Math.max(1,ci&&ci.h?ci.h:128);
const cel=mkCel(ci?ci.x:-64,ci?ci.y:-64,cw,chh);
if(ci&&ci.u){const im=new Image();im.onload=()=>{cel.c.getContext('2d').drawImage(im,0,0);render();ui()};im.src=ci.u}
l.cels.push(cel)}
layers.push(l)});
actL=Math.min(actL,layers.length-1);
if(data.ref&&data.ref.src){
const im=new Image();
refImg={img:im,src:data.ref.src,x:data.ref.x||0,y:data.ref.y||0,w:data.ref.w||64,h:data.ref.h||64,op:data.ref.op??.35,sc:data.ref.sc??100,vis:data.ref.vis!==false};
im.onload=()=>render();im.src=data.ref.src}}

function exportPng(){
const b=frameBounds(actF),comp=buildBoundedComp(actF,b),sc=Math.max(1,Math.min(16,S.exportScale||4));
const o=mkRawCanvas(comp.width*sc,comp.height*sc),ox=o.getContext('2d');ox.imageSmoothingEnabled=false;
ox.drawImage(comp,0,0,o.width,o.height);
return callbacks.onExport(`pixel-${comp.width}x${comp.height}-f${actF+1}.png`,o.toDataURL('image/png'))}

function exportSheet(){
const b=allFramesBounds(),fw=Math.max(1,b[2]-b[0]),fh=Math.max(1,b[3]-b[1]),sc=Math.max(1,Math.min(16,S.exportScale||4));
const o=mkRawCanvas(fw*numF*sc,fh*sc),ox=o.getContext('2d');ox.imageSmoothingEnabled=false;
for(let f=0;f<numF;f++){const comp=buildBoundedComp(f,b);ox.drawImage(comp,f*fw*sc,0,fw*sc,fh*sc)}
return callbacks.onExport(`spritesheet-${fw}x${fh}-${numF}f.png`,o.toDataURL('image/png'))}

/* load, then render and expose the engine API */
load();
if(!layers.length){addLayer('Background');addLayer('Artwork');actL=1}
addEventListener('resize',resize);
resize();
$('col').value=S.fg;$('colBg').value=S.bg;$('size').value=S.size;$('sizeVal').textContent=S.size;
$('pxPerf').classList.toggle('on',S.pxPerf);$('fillShp').classList.toggle('on',S.fillShp);
$('dithPat').value=String(S.dith);$('mode').value=S.mode;$('csize').value=S.guide;$('bgStyle').value=S.bgStyle;
$('sym').value=String(S.sym);$('fps').value=S.fps;$('fpsVal').textContent=S.fps;$('expScale').value=S.exportScale||4;
$('palSel').value=S.palette||'db32';
$('themeBtn').onclick=()=>{toggleTheme();updateCheckerPat();render()};
updateCheckerPat();render();ui();ready=true;

return {
destroy(){
destroyed=true;clearTimeout(saveTimer);clearTimeout(thumbTimer);clearTimeout(st);clearInterval(playTm);
removeEventListener('resize',resize);
window.removeEventListener('keydown',onKeyDown,true);window.removeEventListener('keyup',onKeyUp,true);window.removeEventListener('blur',onBlur);
window.removeEventListener('dragover',onDragOver);window.removeEventListener('drop',onDrop);window.removeEventListener('paste',onPaste);
refsCleanup();
},
saveNow,
thumbnail
};
}
