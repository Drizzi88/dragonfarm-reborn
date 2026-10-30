/* Dragonfarm: Reborn — procedural living-world renderer, v0.6.
 * Procedural 3D meshes projected to Canvas 2D: no CDN, WebGL, or external assets.
 * 3D coordinates, orbiting camera, depth sorting, animated characters, world hotspots.
 */
'use strict';
const DragonWorld=(()=>{
  const TAU=Math.PI*2;
  const rgb=(hex)=>{const h=hex.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
  const tone=(h,amount)=>'#'+rgb(h).map(n=>Math.max(0,Math.min(255,Math.round(n*amount))).toString(16).padStart(2,'0')).join('');
  const hash=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v)};
  const places={
    farm:[
      {x:-5.7,z:-4.9,y:4.5,title:'Farmhouse',icon:'⌂',action:'go',id:'manage'},
      {x:6.0,z:-5.2,y:3.5,title:'Dragon stables',icon:'♞',action:'go',id:'stables'},
      {x:7,z:5.2,y:1.7,title:'Enclosures',icon:'♧',action:'go',id:'stables',requires:'range'},
      {x:-9,z:3.6,y:2.0,title:'Breeding',icon:'◇',action:'go',id:'breeding',requires:'breeding'},
      {x:-.3,z:-8.0,y:2.8,title:'Training',icon:'⚔',action:'go',id:'training',requires:'training'},
      {x:-4.8,z:7.7,y:2.5,title:'Hatchery',icon:'✧',action:'go',id:'breeding',requires:'hatchery'},
      {x:12,z:2.1,y:2.5,title:'Clinic',icon:'✚',action:'go',id:'healer',requires:'clinic'}
    ],
    city:[
      {x:-8.5,z:3,y:3.2,title:'Dragon dealer',icon:'♞',action:'go',id:'market'},
      {x:8.5,z:2.7,y:3.2,title:'Provisions',icon:'❧',action:'go',id:'market'},
      {x:0,z:-6.9,y:5.2,title:'Grand arena',icon:'⚔',action:'go',id:'arena'},
      {x:9,z:-6.7,y:4.0,title:'Tavern',icon:'✦',action:'go',id:'tavern'},
      {x:-10,z:-7.1,y:4.1,title:'Bank',icon:'♜',action:'go',id:'bank'},
      {x:0,z:7.2,y:1,title:'City gates',icon:'⌂',action:'go',id:'island'}
    ]};
  const cameraState={farm:{yaw:-.78,elev:.72,zoom:25,panX:0,panY:0},city:{yaw:-.78,elev:.72,zoom:25,panX:0,panY:0}};
  let active=null;
  const escapeHtml=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sceneHTML(type,st){const activePlaces=places[type].filter(p=>!p.requires||st.buildings[p.requires]);return `<section class="scene scene-${type} scene-3d" aria-label="Interactive three-dimensional ${type} environment">
    <canvas class="world-canvas" role="img" aria-label="Animated isometric ${type} with rotatable camera, buildings and ${type==='farm'?'your dragons':'citizens'}"></canvas>
    <div class="scene-vignette"></div><div class="scene-corner scene-corner-tl"></div><div class="scene-corner scene-corner-tr"></div>
    <div class="scene-title world-title"><small>ALTERICA · LIVING 3D ESTATE</small>${type==='farm'?'The Dragon Farm':'The City of Alterica'}</div>
    <div class="scene-season">✧ &nbsp; MONTH ${st.month} &nbsp; · &nbsp; ${['Winter','Spring','Summer','Autumn'][Math.floor((st.month-1)/3)%4]}</div>
    <div class="world-hotspots">${activePlaces.map(p=>`<button data-world-point="${activePlaces.indexOf(p)}" data-action="${p.action}" data-id="${escapeHtml(p.id)}" class="world-hotspot" title="Visit ${escapeHtml(p.title)}" aria-label="Visit ${escapeHtml(p.title)}" style="left:-200px;top:-200px"><span class="world-hotspot-symbol">${p.icon}</span><span class="world-hotspot-label">${escapeHtml(p.title)}</span></button>`).join('')}</div>
    <div class="world-controls" aria-label="Camera controls"><button type="button" data-world-control="left" aria-label="Rotate left" title="Rotate left">↶</button><button type="button" data-world-control="right" aria-label="Rotate right" title="Rotate right">↷</button><button type="button" data-world-control="up" aria-label="Zoom in" title="Zoom in">＋</button><button type="button" data-world-control="down" aria-label="Zoom out" title="Zoom out">－</button><button type="button" data-world-control="reset" aria-label="Reset camera" title="Reset camera">⌖</button>${type==='farm'?'<button type="button" data-world-control="focus" aria-label="Focus on dragons" title="Focus on your dragon enclosure">♞</button>':''}<button type="button" data-world-control="anim" aria-label="Pause animations" aria-pressed="false" title="Pause or resume animations">Ⅱ</button></div>
    <div class="scene-subtitle world-instructions"><span class="scene-compass">✥</span><span>Drag to orbit · Shift/right-drag to pan · Wheel to zoom · Click buildings or dragons</span></div>
    <span class="world-hover" aria-hidden="true"></span>
  </section>`}
  class Renderer{
    constructor(type,canvas,st){this.type=type;this.canvas=canvas;this.root=canvas.closest('.scene-3d');this.ctx=canvas.getContext('2d',{alpha:false});this.st=st;this.cam=cameraState[type];this.points=places[type].filter(p=>!p.requires||st.buildings[p.requires]);this.raf=0;this.time=0;this.start=performance.now();this.last=0;this.lowMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);this.paused=this.lowMotion;this.drag=null;this.moved=false;this.mouse={x:-1,y:-1};this.hover=null;this.w=1000;this.h=600;this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.root);this.bind();this.resize();this.frame(performance.now());}
    resize(){const r=this.root.getBoundingClientRect();if(!r.width||!r.height)return;this.w=r.width;this.h=r.height;const dpr=Math.min(1.75,window.devicePixelRatio||1);this.canvas.width=Math.max(1,Math.round(this.w*dpr));this.canvas.height=Math.max(1,Math.round(this.h*dpr));this.canvas.style.width='100%';this.canvas.style.height='100%';this.ctx.setTransform(dpr,0,0,dpr,0,0);if(!this.cam.initialized){this.cam.zoom=this.w<650?Math.max(12,Math.min(16,this.w/27)):this.cam.zoom;this.cam.initialized=true}}
    bind(){this.down=e=>{if(e.button!==0&&e.button!==2)return;e.preventDefault();this.drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};this.moved=false;this.canvas.setPointerCapture(e.pointerId);this.canvas.style.cursor=this.drag.pan?'move':'grabbing'};
      this.move=e=>{const r=this.canvas.getBoundingClientRect();this.mouse.x=e.clientX-r.left;this.mouse.y=e.clientY-r.top;if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>2)this.moved=true;this.drag.x=e.clientX;this.drag.y=e.clientY;if(this.drag.pan){this.cam.panX+=dx;this.cam.panY+=dy}else{this.cam.yaw+=dx*.009;this.cam.elev=Math.max(.3,Math.min(1.28,this.cam.elev+dy*.006))}};
      this.up=e=>{const tapped=this.drag&&!this.moved;this.drag=null;this.canvas.style.cursor='grab';
        if(!tapped)return;
        // Coordinate picking also works when browsers retain pointer capture on the canvas.
        const sr=this.root.getBoundingClientRect();const x=e.clientX-sr.left,y=e.clientY-sr.top;
        const button=[...this.root.querySelectorAll('.world-hotspot')].find(b=>{if(b.style.visibility==='hidden')return false;const r=b.getBoundingClientRect();return e.clientX>=r.left-8&&e.clientX<=r.right+8&&e.clientY>=r.top-8&&e.clientY<=r.bottom+14});
        if(button&&typeof handleAction==='function'){handleAction(button);return}
        if(this.type==='farm'&&typeof dBy==='function'){const d=this.dragonLabels.find(d=>Math.abs(d.x-x)<45&&Math.abs(d.y-12-y)<32);if(d){selected=d.id;rosterOpen=true;render()}}
      };this.wheel=e=>{e.preventDefault();this.zoom(e.deltaY<0?1.12:1/1.12)};this.context=e=>e.preventDefault();
      this.canvas.addEventListener('pointerdown',this.down);this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerup',this.up);this.canvas.addEventListener('pointercancel',this.up);this.canvas.addEventListener('wheel',this.wheel,{passive:false});this.canvas.addEventListener('contextmenu',this.context);
      this.control=e=>{const button=e.target.closest('button[data-world-control]');if(!button)return;const a=button.dataset.worldControl;if(a==='left')this.cam.yaw-=Math.PI/8;if(a==='right')this.cam.yaw+=Math.PI/8;if(a==='up')this.zoom(1.18);if(a==='down')this.zoom(1/1.18);if(a==='reset')Object.assign(this.cam,{yaw:-.78,elev:.72,zoom:this.w<650?Math.max(12,Math.min(16,this.w/27)):this.baseZoom(),panX:0,panY:0});if(a==='focus'&&this.type==='farm'){this.cam.zoom=this.w<650?28:35;const pos=this.dragonPos(0),p=this.point(pos[0],1,pos[1]);this.cam.panX+=this.w*.51-p.x;this.cam.panY+=this.h*.47-p.y};if(a==='anim'){this.paused=!this.paused;button.textContent=this.paused?'▶':'Ⅱ';button.setAttribute('aria-label',this.paused?'Resume animations':'Pause animations');button.setAttribute('aria-pressed',String(this.paused))}};
      this.root.querySelector('.world-controls').addEventListener('click',this.control);if(this.paused){const toggle=this.root.querySelector('[data-world-control=anim]');toggle.textContent='▶';toggle.setAttribute('aria-label','Resume animations');toggle.setAttribute('aria-pressed','true')}
      this.key=e=>{if(!this.canvas.isConnected||e.target.matches('input,textarea,select,button'))return;if(e.key==='q'||e.key==='Q')this.cam.yaw-=.16;if(e.key==='e'||e.key==='E')this.cam.yaw+=.16};window.addEventListener('keydown',this.key);
    }
    baseZoom(){return Math.min(27,Math.max(13,this.w/40))}
    zoom(v){this.cam.zoom=Math.max(11,Math.min(60,this.cam.zoom*v))}
    stop(){cancelAnimationFrame(this.raf);this.observer.disconnect();this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.up);this.canvas.removeEventListener('wheel',this.wheel);this.canvas.removeEventListener('contextmenu',this.context);this.root.querySelector('.world-controls').removeEventListener('click',this.control);window.removeEventListener('keydown',this.key)}
    point(x,y,z){const c=this.cam,C=Math.cos(c.yaw),S=Math.sin(c.yaw),V=Math.sin(c.elev),H=Math.cos(c.elev);return {x:this.w/2+(x*C-z*S)*c.zoom+c.panX,y:this.h*.55+(x*S+z*C)*V*c.zoom-y*H*c.zoom+c.panY}}
    depth(x,z){return x*Math.sin(this.cam.yaw)+z*Math.cos(this.cam.y)}
    shape(points,color,stroke=null,strokeWidth=1){const ctx=this.ctx;ctx.beginPath();points.forEach((p,i)=>{const q=this.point(...p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=strokeWidth;ctx.stroke()}}
    path(points,color,width=2){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const q=this.point(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke()}
    ellipse(x,y,z,rx,rz,color,alpha=1){const pts=Array.from({length:24},(_,i)=>[x+Math.cos(i/24*TAU)*rx,y,z+Math.sin(i/24*TAU)*rz]);this.ctx.globalAlpha=alpha;this.shape(pts,color);this.ctx.globalAlpha=1}
    prism(x,z,w,d,h,color,roof=null,roofHeight=1.2){const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,y0=0,y1=h;
      this.ellipse(x,.035,z,w*.72,d*.72,'#172e22',.24);
      const faces=[
        {d:this.depth(x,z0),pts:[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],fill:tone(color,.75)},
        {d:this.depth(x1,z),pts:[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],fill:tone(color,.86)},
        {d:this.depth(x,z1),pts:[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],fill:tone(color,1.05)},
        {d:this.depth(x0,z),pts:[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],fill:tone(color,.95)}];
      faces.sort((a,b)=>a.d-b.d).forEach(f=>this.shape(f.pts,f.fill,'#413e31',.7));
      if(roof){const roofs=[
        {d:this.depth(x,(z0+z)/2),pts:[[x0-.42,h,z0-.36],[x1+.42,h,z0-.36],[x1+.42,h+roofHeight,z],[x0-.42,h+roofHeight,z]],fill:tone(roof,.84)},
        {d:this.depth(x,(z1+z)/2),pts:[[x0-.42,h+roofHeight,z],[x1+.42,h+roofHeight,z],[x1+.42,h,z1+.36],[x0-.42,h,z1+.36]],fill:tone(roof,1.12)},
        {d:this.depth(x0,z),pts:[[x0-.42,h,z0-.36],[x0-.42,h,z1+.36],[x0-.42,h+roofHeight,z]],fill:tone(roof,.75)},
        {d:this.depth(x1,z),pts:[[x1+.42,h,z0-.36],[x1+.42,h,z1+.36],[x1+.42,h+roofHeight,z]],fill:tone(roof,.93)}];
        roofs.sort((a,b)=>a.d-b.d).forEach(f=>this.shape(f.pts,f.fill,'#513829',1));
      }else this.shape([[x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1]],tone(color,1.26),'#756e52',.7);
    }
    windows(x,z,w,d,h,number=2){for(let i=0;i<number;i++){const u=(i+1)/(number+1);this.shape([[x-w/2+w*u-.25,1.55,z+d/2+.02],[x-w/2+w*u+.25,1.55,z+d/2+.02],[x-w/2+w*u+.25,2.35,z+d/2+.02],[x-w/2+w*u-.25,2.35,z+d/2+.02]],'#f6d49c','#6c543e',2)}
      this.shape([[x+w/2+.04,.05,z+.2],[x+w/2+.04,.05,z+1.1],[x+w/2+.04,1.8,z+1.1],[x+w/2+.04,1.8,z+.2]],'#473e2c','#9e7e51',2)}
    cylinder(x,z,y,rad,height,color,sides=9){const rings=Array.from({length:sides},(_,i)=>{const a=TAU*i/sides;return [x+rad*Math.cos(a),z+rad*Math.sin(a)]});rings.map((a,i)=>({a,b:rings[(i+1)%sides],i})).sort((aa,bb)=>this.depth((aa.a[0]+aa.b[0])/2,(aa.a[1]+aa.b[1])/2)-this.depth((bb.a[0]+bb.b[0])/2,(bb.a[1]+bb.b[1])/2)).forEach(({a,b,i})=>{const shade=.66+.4*((i%sides)/sides);this.shape([[a[0],y,a[1]],[b[0],y,b[1]],[b[0],y+height,b[1]],[a[0],y+height,a[1]]],tone(color,shade));});this.shape(rings.map(t=>[t[0],y+height,t[1]]),tone(color,1.12));}
    cone(x,z,y,r,height,color,sides=10){Array.from({length:sides},(_,i)=>i).sort((a,b)=>this.depth(x+r*Math.cos((a+.5)*TAU/sides),z+r*Math.sin((a+.5)*TAU/sides))-this.depth(x+r*Math.cos((b+.5)*TAU/sides),z+r*Math.sin((b+.5)*TAU/sides))).forEach(i=>{let a=i*TAU/sides,b=(i+1)*TAU/sides;this.shape([[x+r*Math.cos(a),y,z+r*Math.sin(a)],[x+r*Math.cos(b),y,z+r*Math.sin(b)],[x,y+height,z]],tone(color,.70+(i/sides)*.56))})}
    tower(x,z,fort=false){this.ellipse(x,.01,z,2,1.7,'#0d231d',.23);this.cylinder(x,z,0,fort?1.65:.65,fort?5.5:3.3,fort?'#c3b4a0':'#b9a986',9);this.cone(x,z,fort?5.3:3.1,fort?2.2:1,fort?2.9:1.4,fort?'#7e4d40':'#576d63')}
    tree(x,z,scale=1){this.ellipse(x,.01,z,.88*scale,.72*scale,'#24432e',.2);this.cylinder(x,z,0,.17*scale,1.1*scale,'#665038',6);this.cone(x,z,.65*scale,1.15*scale,2.7*scale,hash(x,z)>.5?'#426e51':'#385b48',9);this.cone(x,z,1.85*scale,.89*scale,2.35*scale,'#588868',9)}
    fence(x0,z0,x1,z1){const n=Math.max(2,Math.round(Math.hypot(x1-x0,z1-z0)));for(let i=0;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;this.cylinder(x,z,0,.105,1.18,'#90704d',5)}this.path([[x0,.75,z0],[x1,.75,z1]],'#ccb083',3);this.path([[x0,.3,z0],[x1,.3,z1]],'#9c744d',3)}
    walls(x,z,w,d,missingFront=false){const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2;this.fence(a,c,b,c);this.fence(a,c,a,e);this.fence(b,c,b,e);if(!missingFront){this.fence(a,e,x-1,e);this.fence(x+1,e,b,e)}}
    stonePath(x0,z0,x1,z1,width=2.2,color='#b5a78b'){const dx=x1-x0,dz=z1-z0,ln=Math.max(.1,Math.hypot(dx,dz)),wx=-dz/ln*width/2,wz=dx/ln*width/2;this.shape([[x0+wx,.035,z0+wz],[x0-wx,.035,z0-wz],[x1-wx,.035,z1-wz],[x1+wx,.035,z1+wz]],color,'#8c8368',1.4);for(let i=0;i<ln/1.2;i++){const t=(i+.3)/(ln/1.2),xx=x0+dx*t,zz=z0+dz*t;this.path([[xx-.22,.06,zz-.21],[xx+.18,.06,zz+.13]],'#827e69',.7)}}
    flag(x,z,y,color){this.cylinder(x,z,0,.07,y,'#ccb98a',6);const w=Math.sin(this.time*2.1+x)*.25;this.shape([[x,y-.05,z],[x+1.1,y-.22+w,z],[x+1.26,y-.83+w,z],[x,y-.72,z]],color,'#eed6a3',.9)}
    lake(x,z,rx,rz){this.ellipse(x,.02,z,rx,rz,'#49878a');this.ellipse(x,.035,z,rx*.88,rz*.87,'#6daeb0',.75);const c=this.ctx;c.strokeStyle='#d2f1cf66';c.lineWidth=1.5;for(let i=0;i<8;i++){const p=this.point(x+(hash(i,4)-.5)*rx*1.4,.05,z+(hash(i,8)-.5)*rz*1.2);c.beginPath();c.ellipse(p.x,p.y,8+i%3*4,2,0,0,TAU);c.stroke()}}
    // Articulated dragon model. All anatomical anchors exist in world space so
    // orbit/zoom/elevation change the model naturally; the projected surfaces
    // use gradients for a painterly, hand-rendered appearance.
    orb(p,rx,ry,base,light='#fff1ca',dark=null,tilt=-.2){const c=this.ctx,q=this.point(...p),sz=Math.max(.4,this.cam.zoom/25),w=rx*sz,h=ry*sz;
      const g=c.createRadialGradient(q.x-w*.34,q.y-h*.48,1,q.x,q.y,w*1.4);g.addColorStop(0,light);g.addColorStop(.34,base);g.addColorStop(1,dark||tone(base,.59));c.fillStyle=g;c.beginPath();c.ellipse(q.x,q.y,w,h,tilt,0,TAU);c.fill();c.strokeStyle=dark||tone(base,.58);c.lineWidth=1.2;c.stroke();return q;}
    limb(points,color,width,highlight=null){const c=this.ctx;c.lineJoin='round';c.lineCap='round';this.path(points,tone(color,.57),width+3);this.path(points,color,width);if(highlight)this.path(points,highlight,Math.max(1,width*.24))}
    // Articulated dragon model. All anatomical anchors exist in world space so
    // orbit/zoom/elevation change the model naturally; the projected surfaces
    // use gradients for a painterly, hand-rendered appearance.
    orb(p,rx,ry,base,light='#fff1ca',dark=null,tilt=-.2){const c=this.ctx,q=this.point(...p),sz=Math.max(.4,this.cam.zoom/25),w=rx*sz,h=ry*sz;
      const g=c.createRadialGradient(q.x-w*.34,q.y-h*.48,1,q.x,q.y,w*1.4);g.addColorStop(0,light);g.addColorStop(.34,base);g.addColorStop(1,dark||tone(base,.59));c.fillStyle=g;c.beginPath();c.ellipse(q.x,q.y,w,h,tilt,0,TAU);c.fill();c.strokeStyle=dark||tone(base,.58);c.lineWidth=1.2;c.stroke();return q;}
    limb(points,color,width,highlight=null){const c=this.ctx;c.lineJoin='round';c.lineCap='round';this.path(points,tone(color,.57),width+3);this.path(points,color,width);if(highlight)this.path(points,highlight,Math.max(1,width*.24))}
    dragon(dr,index){const sp=SPECIES_COLOR[dr.kind]||SPECIES_COLOR.ember,n=index,t=this.time,phase=(t*.41+n*1.93)%18,rest=phase>12.5&&phase<16,move=phase<10;
      const origin=this.dragonPos(n),s=(.85+Math.min(1,(dr.age||8)/18)*.39),heading=Math.sin(t*.34+n*.9)*.24;
      let x=origin[0]+(move?Math.sin(t*.42+n*2.7)*.66:.22*Math.sin(n)),z=origin[1]+(move?Math.cos(t*.31+n*1.5)*.56:.14*Math.cos(n)),
        flight=sp.flight&&this.st.buildings.range&&this.st.buildings.dome&&phase>4&&phase<10,
        alt=flight?(1.2+Math.sin(t*.8+n)*.27):0,
        step=move&&!flight?Math.sin(t*3.1+n*1.7)*.16:0,
        breathe=Math.sin(t*1.9+n*.72)*.045,
        yy=alt+(rest?.03:.11)+breathe;
      const pt=(u,h,v)=>[x+u*Math.cos(heading)-v*Math.sin(heading),h+yy,z+u*Math.sin(heading)+v*Math.cos(heading)];
      const col=sp.body,accent=sp.accent,shade=tone(col,.65),dark=tone(col,.48),high=tone(col,1.22);
      this.ellipse(x,.01,z,s*1.22,s*.82,'#13261e',flight?.12:.29);
      if(dr.id===this.st.__selectedDragon){this.ellipse(x,.03,z,s*1.43,s*.98,'#edd194',.19);}
      // Tail: articulated, tapering, with a diamond-shaped arrow tip.
      const wag=Math.sin(t*1.8+n)*.34;
      const tail=[pt(-.66,.65*s,0),pt(-1.27,.6*s,wag*.30),pt(-1.92,.35*s,wag*.62),pt(-2.5,.32*s,wag*.88)];
      this.limb(tail,shade,Math.max(3,8.5*s*this.cam.zoom/25),high);
      const tip=tail[3];this.shape([tip,pt(-2.75,.5*s,wag*.96),pt(-2.9,.22*s,wag*.92),pt(-2.45,.2*s,wag*.87)],sp.wing,'#2c352c',1.1);
      // Hind and far-side legs: joint-driven walking with four separate toes.
      for(const side of [-1,1]){const far=side===-1;const v=side*.45*s;
        for(const u of [-.65,.56]){const gait=step*(u<0?-1:1)*(far?-1:1),h=rest?.32:.64;
          const top=pt(u,h*s,v),knee=pt(u+(u<0?-.12:.12),.35*s,v+.07*side),foot=pt(u+(u<0?-.22:.14)+gait,.08*s+Math.max(0,gait)*.30,v+side*.08);
          if(far)this.limb([top,knee,foot],shade,5.4*s*this.cam.zoom/25,sp.body);
        }
      }
      // Membranous wings: articulated elbow/tip, scalloped trailing edge,
      // different frame phases when idling, stretching, or actively flying.
      if(sp.flight){const spread=flight?1.18:phase>10&&phase<12.5?.74:.49;
        const flap=flight?Math.sin(t*6.5+n)*.8:Math.sin(t*1.4+n)*.11;
        for(const side of [-1,1]){const wingRoot=pt(-.25,.94*s,side*.27*s),
          elbow=pt(-.61,(1.42+flap*.45)*s,side*(.87+spread*.32)*s),
          tip=pt(-1.06,(1.56+flap*.93)*s,side*(1.22+spread*1.55)*s),
          s1=pt(-1.29,(.88+flap*.32)*s,side*(1.1+spread*.98)*s),
          s2=pt(-1.33,(.82+flap*.25)*s,side*(.68+spread*.41)*s),
          base=pt(-.89,.79*s,side*.24*s);
          this.shape([wingRoot,elbow,tip,s1,s2,base],tone(sp.wing,side===-1?.88:1.10),'#3e3a2e',1.15);
          this.shape([wingRoot,elbow,s2,base],sp.wing,null);
          this.path([wingRoot,elbow,tip],accent,Math.max(1.5,2.1*s));
          this.path([elbow,s1],tone(sp.wing,.60),1.6);
          this.path([wingRoot,s2],tone(sp.wing,.60),1.3);
          for(let k=0;k<3;k++){let q=this.point(...[s1,s2,tip][k]);this.ctx.fillStyle=tone(sp.wing,.75);this.ctx.beginPath();this.ctx.arc(q.x,q.y,1.5,0,TAU);this.ctx.fill()}
        }
      }
      // Torso & plated back; round anatomical silhouette with individual scales.
      const body=this.orb(pt(0,.79*s,0),29*s,17*s,col,high,dark,-.18);
      const c=this.ctx,fac=this.cam.zoom/25;
      for(let k=0;k<9;k++){const pos=this.point(...pt(-.55+k*.18,(1.10+Math.sin(k*.9)*.03)*s,sideSign(k)*.06));
        c.fillStyle=k%2?tone(accent,.91):accent;c.beginPath();c.moveTo(pos.x-4*s*fac,pos.y+2*s*fac);c.lineTo(pos.x,pos.y-6*s*fac);c.lineTo(pos.x+4*s*fac,pos.y+2*s*fac);c.fill();}
      // Scale patches are stable, not jittering randomly frame to frame.
      for(let row=0;row<3;row++)for(let j=0;j<5;j++){
        const u=-.55+j*.25+(row%2)*.12,sc=pt(u,(.88-row*.12)*s,.50*s);
        const q=this.point(...sc);c.fillStyle=accent+'4d';c.beginPath();c.moveTo(q.x-3.5*fac,q.y);c.quadraticCurveTo(q.x,q.y-4*fac,q.x+3.7*fac,q.y);c.quadraticCurveTo(q.x,q.y+2.5*fac,q.x-3.5*fac,q.y);c.fill();}
      // Near-side legs overlap the belly, making the walking motion clear.
      for(const u of [-.65,.56]){const gait=step*(u<0?-1:1),side=.49*s,top=pt(u,(rest?.42:.63)*s,side),knee=pt(u+(u<0?-.09:.1),.28*s,side+.02),foot=pt(u+(u<0?-.16:.16)+gait,.09*s+Math.max(0,gait)*.30,side+.16);
        this.limb([top,knee,foot],col,6*s*fac,high);
        for(let toe=-1;toe<=1;toe++)this.path([foot,pt(u+(u<0?-.19:.23)+gait,.055*s,side+.23+toe*.13)],accent,Math.max(1.1,1.6*fac));
      }
      // Neck with raised crest, skull, tapered jaw and expressive eyes.
      const nod=Math.sin(t*.83+n)*.09+(rest?-.16:0);
      const neck=[pt(.62,.88*s,-.12*s),pt(.91,1.22*s,-.16*s),pt(1.13,(1.52+nod)*s,-.16*s)];
      this.limb(neck,shade,11*s*fac,col);
      for(let h=0;h<3;h++){let q=this.point(...pt(.76+h*.13,(1.05+h*.17+nod*.4)*s,-.26*s));c.fillStyle=accent;c.beginPath();c.moveTo(q.x-4*fac,q.y+2*fac);c.lineTo(q.x,q.y-9*fac);c.lineTo(q.x+4*fac,q.y+3*fac);c.fill()}
      const skull=pt(1.24,(1.56+nod)*s,-.15*s),snout=pt(1.61,(1.44+nod)*s,-.12*s);
      this.orb(skull,12*s,9*s,col,accent,dark,-.15);
      this.orb(snout,11*s,5.3*s,tone(col,1.1),accent,shade,.18);
      this.path([pt(1.41,(1.36+nod)*s,-.05*s),pt(1.68,(1.34+nod)*s,-.08*s)],dark,1.7);
      for(const v of [-.22,.11]){const horn=[pt(1.13,(1.64+nod)*s,v),pt(.99,(1.93+nod)*s,v),pt(.83,(2.02+nod)*s,v+.09)];this.limb(horn,accent,Math.max(2,3.4*fac),'#fff2cc')}
      const eye=this.point(...pt(1.4,(1.62+nod)*s,.06*s));c.fillStyle='#ffedd0';c.beginPath();c.ellipse(eye.x,eye.y,3.4*fac,2.4*fac,-.13,0,TAU);c.fill();c.fillStyle='#132b27';c.beginPath();c.ellipse(eye.x+.6*fac,eye.y,.95*fac,2.0*fac,-.12,0,TAU);c.fill();
      const nose=this.point(...pt(1.76,(1.47+nod)*s,-.11*s));c.fillStyle=dark;c.beginPath();c.arc(nose.x,nose.y,1.4*fac,0,TAU);c.fill();
      // Intermittent breath mist and ember sparks, species dependent.
      if(!this.lowMotion && ((t+n*3.7)%11)<2.3){for(let i=0;i<5;i++){
        const age=((t+n*3.7+i*.25)%2.3),q=this.point(...pt(1.8+age*.65,(1.48+nod+age*.36)*s,-.1+age*.06));
        c.globalAlpha=Math.max(0,(1-age/2.3)*.55);c.fillStyle=dr.kind==='ember'?'#f7b45b':dr.kind==='tide'?'#a8efea':'#e4e1cc';c.beginPath();c.arc(q.x,q.y,(1.5+age*2.2)*fac,0,TAU);c.fill();c.globalAlpha=1;}}
      const label=this.point(...pt(.03,(2.3+(flight?alt*.1:0))*s,0));this.dragonLabels.push({x:label.x,y:label.y,name:dr.name,selected:dr.id===this.st.__selectedDragon,id:dr.id});
      function sideSign(j){return j%2===0?1:-1}
    }
    person(x,z,index=0,task='walk'){const t=this.time,pace=this.lowMotion?0:t*(task==='guard'?.5:.65),u=task==='stationary'?0:Math.sin(pace+index*1.39),v=task==='stationary'?0:Math.cos(pace*.76+index*1.83);
      const xx=x+u*(task==='guard'?.28:.76),zz=z+v*.36,fac=this.cam.zoom/25;
      const clothes=['#a36d50','#506f87','#a48254','#557d65','#8c675a','#665e92'][index%6],skin=['#e1b48d','#bd8b6d','#d8a77a'][index%3];
      const swing=this.lowMotion?0:Math.sin(t*3.5+index)*.18;
      this.ellipse(xx,.015,zz,.21,.15,'#182f28',.24);
      for(const side of [-1,1]){this.limb([[xx,.57,zz+side*.1],[xx+side*swing*.35,.29,zz+side*.13],[xx+side*swing*.5,.06,zz+side*.15]],'#62503d',Math.max(2,3.4*fac));}
      this.cylinder(xx,zz,.53,.185,.52,clothes,7);
      for(const side of [-1,1])this.limb([[xx+side*.13,.99,zz],[xx+side*.23,.69,zz+side*swing*.16]],skin,Math.max(1.5,2.3*fac));
      this.orb([xx,1.15,zz],4.4,5.2,skin,'#f0c29e','#9b6f58',0);
      if(index%3===1){const q=this.point(xx,1.29,zz);this.ctx.fillStyle='#523e2a';this.ctx.beginPath();this.ctx.ellipse(q.x,q.y-2*fac,5*fac,2.6*fac,0,Math.PI,TAU);this.ctx.fill()}
      if(task==='guard'){this.path([[xx+.24,.1,zz],[xx+.24,1.58,zz]],'#d4c7aa',1.7);this.flag(xx+.24,zz,1.67,'#b78354')}
    }
    smoke(x,z,y,seed=0){if(this.lowMotion)return;const c=this.ctx;for(let j=0;j<5;j++){const t=(this.time*.19+j*.23+seed)%1.35,p=this.point(x+Math.sin(t*4+seed)*t*.52,y+t*3.3,z+t*.25),r=(2.8+t*8)*this.cam.zoom/25;c.fillStyle='#f6eee1';c.globalAlpha=Math.max(0,.21*(1-t/1.35));c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.fill()}c.globalAlpha=1}
    barrels(x,z){for(let i=0;i<2;i++){const bx=x+i*.46;this.cylinder(bx,z+(i%2)*.22,0,.23,.65,'#865e3b',9);this.path([[bx-.17,.17,z],[bx+.19,.17,z]],'#d9aa65',1.5);this.path([[bx-.17,.49,z],[bx+.19,.49,z]],'#c9a071',1.5)}}
    sacks(x,z){for(let i=0;i<3;i++){const xx=x+(i%2)*.45,zz=z+Math.floor(i/2)*.42,y=i===2?.38:0;const c=this.ctx,p=this.point(xx,y+.25,zz);c.fillStyle=i===2?'#c0a77a':'#d8be8f';c.strokeStyle='#826a48';c.lineWidth=1;c.beginPath();c.ellipse(p.x,p.y,8*this.cam.zoom/25,5*this.cam.zoom/25,-.2,0,TAU);c.fill();c.stroke()}}
    hay(x,z){this.cone(x,z,0,.76,.95,'#ab8a4e',10);for(let i=0;i<10;i++){const a=i*TAU/10,r=.68,p=this.point(x+Math.cos(a)*r,.12,z+Math.sin(a)*r);this.ctx.strokeStyle=i%2?'#e3c67b':'#d6b56b';this.ctx.beginPath();this.ctx.moveTo(p.x-4,p.y+2);this.ctx.lineTo(p.x+4,p.y-3);this.ctx.stroke()}}
    garden(x,z){this.ellipse(x,.023,z,3.1,2.08,'#556e41',.9);
      for(let r=0;r<4;r++){const zz=z-1.3+r*.88;this.shape([[x-2.35,.06,zz-.24],[x+2.35,.06,zz-.24],[x+2.35,.06,zz+.24],[x-2.35,.06,zz+.24]],'#695b3e');
        for(let j=0;j<10;j++){const xx=x-2.1+j*.45,wig=.11*Math.sin(this.time*.8+xx*2);this.path([[xx,.07,zz],[xx+wig,.37,zz+.12]],r%2?'#9eae65':'#79a65b',2.4)}}
      this.fence(x-2.7,z-1.96,x+2.7,z-1.96)}
    well(x,z){this.cylinder(x,z,0,.83,.86,'#b1ae93',12);this.ellipse(x,.9,z,.65,.56,'#31565a');
      for(const side of [-1,1])this.cylinder(x+side*.81,z,0,.1,2.1,'#886a48',6);
      this.shape([[x-1.1,2.12,z-.25],[x+1.1,2.12,z-.25],[x,2.85,z]],'#805640','#604334',1.2);
      this.path([[x,1.8,z],[x,1.02,z]],'#ded5b1',2.2)}
    cart(x,z,seed=0){const t=this.time*.15+seed,xx=x+(this.lowMotion?0:Math.sin(t)*.85),zz=z+(this.lowMotion?0:Math.cos(t*.8)*.42);
      this.ellipse(xx,.02,zz,1.4,.57,'#1c2d26',.2);this.prism(xx,zz,1.5,.85,.65,'#8b6341');
      for(const side of [-1,1]){const wheel=this.point(xx+.4,.25,zz+side*.55),c=this.ctx,rr=8*this.cam.zoom/25;c.fillStyle='#4b3c2a';c.beginPath();c.arc(wheel.x,wheel.y,rr,0,TAU);c.fill();c.strokeStyle='#c39b65';c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(wheel.x-rr,wheel.y);c.lineTo(wheel.x+rr,wheel.y);c.moveTo(wheel.x,wheel.y-rr);c.lineTo(wheel.x,wheel.y+rr);c.stroke()}
      this.sacks(xx-.2,zz);this.person(xx+1.05,zz,seed+2)}
    chickens(x,z){for(let i=0;i<3;i++){const a=this.time*.33+i*2.2,xx=x+Math.sin(a)*.5+i*.24,zz=z+Math.cos(a*.83)*.28;
      this.orb([xx,.25,zz],4.5,4,'#e9e2c4','#fff5d9','#a49b7c',0);
      const head=this.point(xx+.17,.41,zz);this.ctx.fillStyle='#cc9b56';this.ctx.beginPath();this.ctx.moveTo(head.x+3,head.y);this.ctx.lineTo(head.x+8,head.y+2);this.ctx.lineTo(head.x+3,head.y+4);this.ctx.fill()}}
    lantern(x,z,y=2.1){this.cylinder(x,z,0,.065,y,'#675b43',6);const p=this.point(x,y,z),c=this.ctx;
      const glow=c.createRadialGradient(p.x,p.y,1,p.x,p.y,16);glow.addColorStop(0,'#ffe5a8b0');glow.addColorStop(1,'#ffe19a00');c.fillStyle=glow;c.fillRect(p.x-16,p.y-16,32,32);
      c.fillStyle='#f2bf69';c.fillRect(p.x-3,p.y-4,6,8);c.strokeStyle='#4d4330';c.strokeRect(p.x-3,p.y-4,6,8)}
    flowerPatch(x,z){for(let j=0;j<8;j++){const a=j*2.4,r=.2+j*.074,xx=x+Math.sin(a)*r,zz=z+Math.cos(a)*r,p=this.point(xx,.14,zz),c=this.ctx;c.fillStyle=j%3===0?'#d9a58b':j%3===1?'#e3ce88':'#c6d6a7';c.beginPath();c.arc(p.x,p.y,Math.max(1,1.8*this.cam.zoom/25),0,TAU);c.fill()}}
    door(x,z,w,d,h,color='#423f32'){this.shape([[x-.52,.02,z+d/2+.035],[x+.52,.02,z+d/2+.035],[x+.52,h*.65,z+d/2+.035],[x-.52,h*.65,z+d/2+.035]],color,'#b69265',2);
      const p=this.point(x+.33,h*.29,z+d/2+.07);this.ctx.fillStyle='#ecd298';this.ctx.beginPath();this.ctx.arc(p.x,p.y,2,0,TAU);this.ctx.fill()}
    shingle(x,z,w,d,h,roofHeight){for(let row=0;row<4;row++){let t=(row+1)/5;const y=h+roofHeight*(1-t),zz=z+d*.5*t;
        this.path([[x-w/2-.24,y,zz],[x+w/2+.24,y,zz]],'#4e382f',.85)}
      for(let i=0;i<7;i++){let xx=x-w/2+(i+.5)*w/7;
        this.path([[xx,h+roofHeight,z],[xx+.17,h+roofHeight*.14,z+d/2]],'#a78668',.6)}}
    egg(x,z,i,kind){const sp=SPECIES_COLOR[kind]||SPECIES_COLOR.ember;
      this.ellipse(x,.02,z,.44,.35,'#3c3028',.34);this.orb([x,.49,z],9,12,sp.accent,'#ffedc9',tone(sp.body,.83),.12);
      for(let j=0;j<5;j++){const p=this.point(x+Math.sin(j*2.7)*.23,.6+Math.cos(j)*.19,z+.2);this.ctx.fillStyle=sp.body;this.ctx.globalAlpha=.46;this.ctx.beginPath();this.ctx.arc(p.x,p.y,1.5+Math.abs(j%2),0,TAU);this.ctx.fill()}this.ctx.globalAlpha=1}
    scaffold(x,z){this.ellipse(x,.035,z,1.7,1.3,'#957c59',.75);
      for(const dx of [-1,1])for(const dz of [-1,1]){this.cylinder(x+dx*1.1,z+dz*.9,0,.095,1.6,'#ae8b5b',5)}
      for(const y of [.58,1.26]){this.path([[x-1.2,y,z-.9],[x+1.2,y,z-.9]],'#d0ad6c',2.7);this.path([[x-1.2,y,z+.9],[x+1.2,y,z+.9]],'#d0ad6c',2.7)}
      this.flag(x,z-.8,2.1,'#d8a04f');this.barrels(x+.9,z+.5)}
    environmentFX(){const c=this.ctx,t=this.time,season=(Math.floor((this.st.month-1)/3)%4);
      // Seasonal drifting atmosphere, separate from simulation clock; subtle by design.
      for(let i=0;i<(this.lowMotion?0:27);i++){
        const k=hash(i,66),q=hash(i,29),speed=season===0?.037:.018;
        const xx=((k+t*speed*(i%3+1))%1)*this.w,yy=((q+t*(season===0?.055:.020)*(1+i%3))%1)*this.h;
        const r=season===0?1.5:season===3?1.8:1.1;
        c.globalAlpha=season===0?.5:season===3?.35:.16;c.fillStyle=season===0?'#eaf5f0':season===3?'#e1b875':'#ffebbc';
        c.beginPath();c.ellipse(xx,yy,r*1.2,r*.75,season===3?Math.sin(t+i)*.8:0,0,TAU);c.fill();}
      c.globalAlpha=1;
      // Overhead bird silhouettes make the horizon feel open and inhabited.
      for(let i=0;i<3;i++){const xx=((hash(i,21)+t*.009*(i+1))%1)*this.w,yy=this.h*(.16+hash(i,28)*.13)+Math.sin(t*.45+i)*7;
        c.strokeStyle='#3b5b52';c.globalAlpha=.42;c.lineWidth=1.6;c.beginPath();c.moveTo(xx-7,yy);c.quadraticCurveTo(xx-3,yy-5,xx,yy+1);c.quadraticCurveTo(xx+3,yy-5,xx+7,yy);c.stroke();}c.globalAlpha=1}
    grass(){const ctx=this.ctx;const isCity=this.type==='city';const grad=ctx.createLinearGradient(0,0,0,this.h);if(isCity){grad.addColorStop(0,'#8faebb');grad.addColorStop(.47,'#e0c8a0');grad.addColorStop(1,'#7d9672')}else{grad.addColorStop(0,'#8caeb1');grad.addColorStop(.55,'#b9c9a7');grad.addColorStop(1,'#5b805e')}ctx.fillStyle=grad;ctx.fillRect(0,0,this.w,this.h);
      // Mountains and distant light are drawn in screen-space behind the 3D terrain.
      ctx.fillStyle=isCity?'#789087':'#6f9990';ctx.beginPath();ctx.moveTo(0,this.h*.37);for(let x=0;x<=this.w+20;x+=20){const y=this.h*(.31+.065*Math.sin(x/107)+.025*Math.sin(x/41));ctx.lineTo(x,y)}ctx.lineTo(this.w,this.h);ctx.lineTo(0,this.h);ctx.fill();
      const sky=ctx.createRadialGradient(this.w*.82,this.h*.22,1,this.w*.82,this.h*.22,this.w*.4);sky.addColorStop(0,'#ffedb766');sky.addColorStop(1,'#fff8df00');ctx.fillStyle=sky;ctx.fillRect(0,0,this.w,this.h);
      const winter=((Math.floor((this.st.month-1)/3)%4)===0);this.shape([[-19,-.45,-15],[19,-.45,-15],[19,-.45,15],[-19,-.45,15]],isCity?'#71836a':winter?'#557368':'#4e7753');
      for(let x=-18;x<18;x+=2){for(let z=-14;z<14;z+=2){const rnd=hash(x,z),c=isCity?(rnd>.65?'#89987c':rnd>.3?'#829473':'#788e70'):(winter?(rnd>.6?'#688177':rnd>.3?'#637c72':'#60786f'):(rnd>.6?'#678c64':rnd>.3?'#648a62':'#63895f'));this.shape([[x,-.38,z],[x+2,-.38,z],[x+2,-.38,z+2],[x,-.38,z+2]],c)}}
      for(let i=0;i<110;i++){const x=hash(i,12)*35-17,z=hash(i,91)*27-13;if((Math.abs(x)<2.5||Math.abs(z)<2.3)||Math.abs(x)>17.3||Math.abs(z)>13.1)continue;const p=this.point(x,-.32,z);ctx.fillStyle=i%3===0?'#bbba8c':'#497953';ctx.fillRect(p.x,p.y,1.1,2.4)}
    }
    farm(){const b=this.st.buildings;this.stonePath(-6,-4,-6,8,2.3,'#aaa68a');this.stonePath(-6,1,9,1,2.1,'#c4bba0');this.stonePath(3,-6,3,9,1.8,'#afa78c');this.stonePath(-6,-5,4,-5,2.2,'#d1c5a3');
      this.lake(-12,9,3.1,1.6);
      this.walls(6,-4,6.8,6.4,true);
      if(b.range)this.walls(7,5.3,9,6.2,true);
      if(b.breeding)this.walls(-11,4.1,6,5,true);
      this.drawSorted(this.farmModels());
    }
    farmModels(){const b=this.st.buildings,models=[];const add=(x,z,fn)=>models.push({depth:this.depth(x,z),fn});
      for(let i=0;i<25;i++){const x=hash(i,40)*34-17,z=hash(i,29)*25-12.5;if((x>-10&&x<12&&z>-9&&z<10)||Math.abs(x)<3||Math.abs(z)<2)continue;add(x,z,()=>this.tree(x,z,.65+hash(i,17)*.45))}
      add(-6,-5,()=>{this.prism(-6,-5,5.6,4.0,3.15,'#c9bd9d','#875548',1.65);this.windows(-6,-5,5.6,4,3.15,3);this.cylinder(-8,-6.3,3.35,.38,1.45,'#a58f77',6);this.flag(-6.6,-5.6,5.75,'#cc835a');this.door(-6,-5,5.6,4,3.15);this.shingle(-6,-5,5.6,4,3.15,1.65);this.smoke(-8,-6.3,4.9)});
      // Stable buildings scale directly with owned capacity; initial stable is already in place.
      for(let i=0;i<Math.min(6,b.stable);i++){let x=4.4+(i%2)*3.5,z=-6.6+Math.floor(i/2)*3.4;add(x,z,()=>{this.prism(x,z,2.9,2.6,2.15,'#bea37b','#735248',1.15);this.windows(x,z,2.9,2.6,2.2,1);this.door(x,z,2.9,2.6,2.15,'#443e2d');this.shingle(x,z,2.9,2.6,2.15,1.15)})}
      if(b.range){add(8,4,()=>{this.ellipse(7,.055,5.3,3.9,2.8,'#aaad78',.7);this.cylinder(4.6,2.8,0,.22,2,'#bbaa81',7);this.cylinder(9.4,2.8,0,.22,2,'#bbaa81',7);if(b.dome){const ctx=this.ctx,p=this.point(7,0,5.3);ctx.strokeStyle='#bdf7f1bb';ctx.lineWidth=2.3;ctx.beginPath();ctx.ellipse(p.x,p.y-47,Math.max(60,this.cam.zoom*3.8),Math.max(32,this.cam.zoom*2.9),0,Math.PI,TAU);ctx.stroke();ctx.fillStyle='#a9e9f310';ctx.fill();}})}
      if(b.training)add(0,-8,()=>{this.ellipse(0,.04,-8,3,2.4,'#cfb78c',.8);this.prism(0,-8,3,2.3,1.65,'#997e61','#765449',.9);this.flag(-1.4,-8.8,4,'#c97254');this.flag(1.5,-8.8,4,'#d5c181')});
      if(b.breeding)add(-11,4,()=>{this.ellipse(-11,.05,4,2.7,2,'#c1a378',.6);this.prism(-11,4,2.9,2.4,1.7,'#c7b087','#8a6853',.8)});
      if(b.hatchery)add(-5,8,()=>{this.cylinder(-5,8,0,1.6,2.4,'#c2aa8c');this.cone(-5,8,2.4,2.1,2.9,'#a96149');this.cylinder(-5,8,5.0,.20,.7,'#e9bc80')});
      if(b.clinic)add(12,2,()=>{this.prism(12,2,3.1,3.1,2.4,'#d3c7a9','#61897b',1.2);this.windows(12,2,3.1,3.1,2.4,1);this.flag(11.6,2,4.6,'#faf1d6')});
      for(let i=0;i<b.tower;i++){const x=i%2?14:-14,z=i<2?-7:10;add(x,z,()=>this.tower(x,z))}
      for(let i=0;i<this.st.dragons.length;i++){let d=this.st.dragons[i],pos=this.dragonPos(i);add(pos[0],pos[1],()=>this.dragon(d,i))}
      // The people actually present depend on staff and estate facilities.
      for(let i=0;i<Math.min(10,2+(this.st.staff?.keepers||0)+(this.st.staff?.guards||0));i++){
        const keeper=i<2+(this.st.staff?.keepers||0),x=keeper?(i%2)*1.55-6.9:(i%2?13:-13),z=keeper?i*.85-2.8:i*1.2-7;
        add(x,z,()=>this.person(x,z,i,keeper?'walk':'guard'))}
      add(-11,0,()=>this.garden(-11,0));
      add(-1.5,3,()=>this.well(-1.5,3));
      add(-3,5,()=>this.chickens(-3,5));
      add(1.0,5.5,()=>this.cart(1,5.5,2));
      add(-8,-1,()=>this.barrels(-8,-1));
      add(-4.5,-2,()=>this.hay(-4.5,-2));
      add(3.3,-4.0,()=>this.sacks(3.3,-4.0));
      add(-2.8,-4.7,()=>this.lantern(-2.8,-4.7));
      add(9.1,-1.9,()=>this.lantern(9.1,-1.9));
      add(-7,2.6,()=>this.flowerPatch(-7,2.6));
      add(-5,1.5,()=>this.flowerPatch(-5,1.5));
      if(b.training)add(0,-8,()=>this.person(1.8,-7.8,7));
      if(b.hatchery)add(-5,8,()=>{this.sacks(-3.5,8);this.smoke(-5,8,5.0,2)});
      if(b.breeding)add(-11,4,()=>this.hay(-9.8,4));
      for(let i=0;i<this.st.eggs.length;i++){const egg=this.st.eggs[i],px=b.hatchery?-5.6+i*1.2:-10.8+i*1.2,pz=b.hatchery?9.2:5.5;
        add(px,pz,()=>this.egg(px,pz,i,egg.kind))}
      const sites={stable:[4.4+(b.stable%2)*3.5,-6.6+Math.floor(b.stable/2)*3.4],range:[7,5],dome:[7,5],training:[0,-8],breeding:[-11,4],hatchery:[-5,8],clinic:[12,2],tower:[-14,-7]};
      for(const c of this.st.construction||[]){const v=sites[c.id]||[11,9];add(v[0],v[1],()=>{this.scaffold(v[0],v[1]);this.person(v[0]+1.7,v[1]+.7,9)})}

      return models}
    dragonPos(n){if(this.st.buildings.range)return [7+(n%3-1)*2.1,5+Math.floor(n/3)*1.5];return [5.7+(n%2)*2,-2+Math.floor(n/2)*1.8]}
    city(){this.stonePath(-16,0,16,0,5.5,'#c8baa0');this.stonePath(0,-13,0,12.8,5,'#cabda2');this.ellipse(0,.055,0,4.0,3.25,'#e5d0a7',.7);
      for(let z=-11;z<=9;z+=2){this.path([[z%4?-.65:.65,.08,z],[z%4?1.1:-1.1,.08,z+.6]],'#9a9482',1)}
      this.drawSorted(this.cityModels());
    }
    cityModels(){const models=[],add=(x,z,fn)=>models.push({depth:this.depth(x,z),fn});
      // City hall / arena, merchants, tavern, counting house, town walls.
      add(0,-7,()=>{this.cylinder(0,-7,0,4.2,2.2,'#bdb09a',12);this.cylinder(0,-7,2.1,3.7,1.35,'#88745d',12);for(let i=0;i<12;i++){let a=i*TAU/12,x=Math.cos(a)*3.95,z=-7+Math.sin(a)*3.95;this.cylinder(x,z,0,.38,3.0,'#c4bba9',7)}this.cone(0,-7,3.35,4.9,3.0,'#92584d',14);this.flag(0,-7,7.3,'#d7b468')});
      add(-9,2.8,()=>{this.prism(-9,2.8,5,4.2,2.5,'#c9b198','#a36451',1.5);this.windows(-9,2.8,5,4.2,2.5,3);this.flag(-8.2,1.8,4.6,'#ca694d')});
      add(9,2.8,()=>{this.prism(9,2.8,5.2,4.2,2.65,'#d2ba95','#73936d',1.6);this.windows(9,2.8,5.2,4.2,2.65,3);this.flag(9,2.8,5.2,'#87b781')});
      add(9,-7,()=>{this.prism(9,-7,5.5,4.1,3.0,'#d2b195','#985f4c',1.7);this.windows(9,-7,5.5,4.1,3,3);this.flag(9,-7,5.7,'#e8bc7d')});
      add(-10,-7,()=>{this.prism(-10,-7,5,4.4,3.45,'#c9b69c','#66798d',1.7);this.windows(-10,-7,5,4.4,3.45,2);this.flag(-10,-7,5.7,'#b3c2df')});
      // White limestone gateway.
      add(0,10.2,()=>{this.tower(-3.5,10,true);this.tower(3.5,10,true);this.prism(0,10,7,1.4,2.7,'#b7b09d',null,0);this.flag(-3.5,10,8.1,'#d4a967');this.flag(3.5,10,8.1,'#d4a967')});
      for(let i=0;i<16;i++){const x=i%2===0?-15.3:15.3,z=-12+Math.floor(i/2)*3.1;add(x,z,()=>this.prism(x,z,1.5,2.2,1.35,'#aea189','#827067',.9))}
      for(let i=0;i<13;i++){const x=(i%5-2)*2.3,z=(Math.floor(i/5)-1)*3.9;add(x,z,()=>{this.person(x,z,i);if(i%3===0){this.prism(x-.5,z-.7,1,1.0,.65,'#8f7859','#bba27e',.4)}})}
      for(let i=0;i<22;i++){const x=hash(i,38)*31-15.5,z=hash(i,56)*23-11.5;if((Math.abs(x)<12&&Math.abs(z)<9)||Math.abs(x)>15.5)continue;add(x,z,()=>this.tree(x,z,.6+hash(i,44)*.4))}
      add(0,0,()=>{this.cylinder(0,0,0,.95,1.1,'#aea38d',10);this.cylinder(0,0,1.1,.37,1.4,'#a5a79e',10);this.ellipse(0,2.55,0,1.5,.65,'#8cc3ca',.32)});
      add(-5.5,2.4,()=>this.cart(-5.5,2.4,5));
      add(5.9,2.8,()=>{this.barrels(5.9,2.8);this.sacks(5.1,2.8)});
      add(-5,-2.7,()=>this.lantern(-5,-2.7,2.9));
      add(5,-3.1,()=>this.lantern(5,-3.1,2.9));
      add(2.8,5.7,()=>this.flowerPatch(2.8,5.7));
      add(-2.8,5.7,()=>this.flowerPatch(-2.8,5.7));
      return models}
    drawSorted(models){models.sort((a,b)=>a.depth-b.depth).forEach(o=>o.fn())}
    labels(){const c=this.ctx;
      this.dragonLabels.forEach(d=>{if(d.x<0||d.x>this.w||d.y<0||d.y>this.h)return;const name=d.name.slice(0,18);c.font='600 11px system-ui';const tw=c.measureText(name).width;c.fillStyle=d.selected?'#765329d9':'#182c29dc';c.fillRect(d.x-tw/2-7,d.y-19,tw+14,18);c.strokeStyle=d.selected?'#ffdda0':'#d8b67a66';c.lineWidth=1;c.strokeRect(d.x-tw/2-7,d.y-19,tw+14,18);c.textAlign='center';c.fillStyle=d.selected?'#fff0b3':'#f8e8c8';c.fillText(name,d.x,d.y-6)});
    }
    hotspots(){const p=this.root.querySelectorAll('[data-world-point]');for(const btn of p){const dest=this.points[Number(btn.dataset.worldPoint)];if(!dest)continue;const v=this.point(dest.x,dest.y,dest.z);const left=v.x+'px',top=Math.max(82,Math.min(this.h-68,v.y))+'px';const visible=(v.x>25&&v.x<this.w-25&&v.y>-45&&v.y<this.h+40)?'visible':'hidden';// Avoid invalidating all marker layouts on every animation frame.
      if(btn.style.left!==left)btn.style.left=left;
      if(btn.style.top!==top)btn.style.top=top;
      if(btn.style.visibility!==visible)btn.style.visibility=visible;
    } }
    frame(t){if(!this.canvas.isConnected)return;const delta=Math.min(50,Math.max(0,t-this.last));this.last=t;if(!this.paused)this.time+=delta/1000;this.dragonLabels=[];
      this.grass();if(this.type==='farm')this.farm();else this.city();this.environmentFX();this.labels();this.hotspots();this.raf=requestAnimationFrame(u=>this.frame(u))}
  }
  const SPECIES_COLOR={ember:{body:'#bd705c',wing:'#8c514c',accent:'#f6c18b',flight:true},verdant:{body:'#6d9f77',wing:'#456e61',accent:'#c0d4a0',flight:true},tide:{body:'#74a5b9',wing:'#567a9a',accent:'#c7f0ef',flight:true},stone:{body:'#a59b85',wing:'#727768',accent:'#d9c8a1',flight:false},dune:{body:'#cfab73',wing:'#aa7b52',accent:'#f8d49d',flight:false},royal:{body:'#b28bbf',wing:'#775a99',accent:'#eed2f7',flight:true}};
  return {sceneHTML,attach(type,st){if(active){active.stop();active=null}if(type!=='farm'&&type!=='city')return;const canvas=document.querySelector('.world-canvas');if(!canvas)return;const current={...st,__selectedDragon:typeof selected!=='undefined'?selected:null};active=new Renderer(type,canvas,current)},detach(){if(active){active.stop();active=null}},debug(){return active?{type:active.type,zoom:active.cam.zoom,yaw:active.cam.yaw,elevation:active.cam.elev,width:active.w,height:active.h,dragons:active.st.dragons.length,paused:active.paused,staff:active.st.staff}:null}};
})();
