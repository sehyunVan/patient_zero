/* B: infection pulse at the actual pointer position, independent of UI actions. */
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const active=new Map();let layer;
 function remove(fx){clearTimeout(active.get(fx));active.delete(fx);fx.getAnimations({subtree:true}).forEach(a=>a.cancel());fx.remove();}
 function clear(){for(const fx of [...active.keys()])remove(fx);if(layer?.matches(':popover-open'))layer.hidePopover();}
 function surface(){if(!layer){layer=document.createElement('div');layer.id='touch-infection-layer';layer.setAttribute('aria-hidden','true');if(typeof layer.showPopover==='function')layer.setAttribute('popover','manual');document.body.appendChild(layer);}
 if(typeof layer.showPopover==='function'){if(layer.matches(':popover-open'))layer.hidePopover();layer.showPopover();}else{const host=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;if(layer.parentNode!==host)host.appendChild(layer);}
 return layer;}
 function pulse(e){if(e.pointerType==='mouse'&&e.button!==0)return;const host=surface();while(active.size>=8)remove(active.keys().next().value);const bounds=host.getBoundingClientRect();const fx=document.createElement('span');fx.className='touch-infection-fx';fx.style.left=(e.clientX-bounds.left)+'px';fx.style.top=(e.clientY-bounds.top)+'px';host.appendChild(fx);
 const add=cls=>{const n=document.createElement('i');n.className=cls;fx.appendChild(n);return n;};
 const animate=(el,frames,duration,delay=0)=>el.animate(frames,{duration,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 if(reduced.matches){fx.classList.add('reduced');add('touch-infection-ring');add('touch-infection-core');active.set(fx,setTimeout(()=>remove(fx),240));return;}
 for(let i=0;i<2;i++){const ring=add('touch-infection-ring');animate(ring,[{scale:'.1',opacity:.85},{scale:String(i?2.1:2.7),opacity:0}],650,i*90);}
 const dot=add('touch-infection-core');animate(dot,[{scale:'1',opacity:1},{scale:'.3',opacity:0}],420);
 for(let i=0;i<14;i++){const bit=add('touch-infection-bit'),angle=i*Math.PI*2/14,distance=46+i%3*16;animate(bit,[{translate:'0 0',opacity:1},{translate:Math.cos(angle)*distance+'px '+Math.sin(angle)*distance+'px',opacity:0}],560+i*10);}
 active.set(fx,setTimeout(()=>remove(fx),780));
 }
 document.addEventListener('pointerdown',pulse,{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});window.addEventListener('blur',clear);window.addEventListener('pagehide',clear);reduced.addEventListener('change',clear);
})();
