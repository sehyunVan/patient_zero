/* Mechanical feedback is visual only. Existing click handlers own all game state. */
(()=>{
 const roots='#info-dialog, #lobby, #chapters, #overlay';
 const cardSelector='.skill-card,.rs-card,.portrait-card,.cs-card,.chapter-card[data-district]';
 const identity=['data-kit','data-agent','data-select','data-district','data-step','data-filter','data-cs-tab','data-utility-go','data-tab','data-rank','data-profile-tab','data-set','data-toggle','data-equipment-filter','data-claim','data-collection','data-exchange'];
 // 눌림 반동을 주지 않는 것들 — 단추가 아니라 **세계 안의 물건**이다.
 // 로비의 캐릭터는 화면을 가득 채운 일러스트라, 눌릴 때마다 통째로 움찔하면 UI 처럼 보인다.
 const noPress='#hub-hero';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const playing=new WeakMap();
 function isSelected(el){return el.matches('.selected,.focused,.on,[aria-pressed="true"]');}
 function frame(el){let f=el.querySelector(':scope > .mechanical-frame');if(!f){f=document.createElement('span');f.className='mechanical-frame';f.setAttribute('aria-hidden','true');f.innerHTML='<i class="mf-tl"></i><i class="mf-tr"></i><i class="mf-bl"></i><i class="mf-br"></i>';if(!el.querySelector('.equipment-check'))f.insertAdjacentHTML('beforeend','<b class="mf-check">✓</b>');el.appendChild(f);}return f;}
 function sync(){document.querySelectorAll(cardSelector).forEach(el=>{if(!el.closest(roots))return;const on=isSelected(el);if(on){frame(el);if(!el.classList.contains('mechanical-selected'))el.classList.add('mechanical-selected');}else if(el.classList.contains('mechanical-selected'))el.classList.remove('mechanical-selected');});}
 function animate(el){if(!el||!el.isConnected||el.disabled)return;playing.get(el)?.forEach(a=>a.cancel());if(motion.matches)return;const animations=[];animations.push(el.animate([{scale:'1'},{scale:'.974',offset:.32},{scale:'1.006',offset:.7},{scale:'1'}],{duration:390,easing:'ease-out'}));if(el.matches(cardSelector)&&isSelected(el)){const f=frame(el);f.querySelectorAll('i').forEach((corner,i)=>{animations.push(corner.animate([{translate:(i%2?-14:14)+'px '+(i<2?14:-14)+'px',opacity:0},{translate:'0 0',opacity:1}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'}));});const check=el.querySelector('.equipment-check,.mf-check');if(check)animations.push(check.animate([{scale:'.3',opacity:0},{scale:'1.15',opacity:1,offset:.75},{scale:'1',opacity:1}],{duration:180,delay:210,fill:'backwards'}));}playing.set(el,animations);}
 document.addEventListener('click',e=>{const el=e.target.closest('button,[role="button"]');if(!el||!el.closest(roots)||el.disabled||el.getAttribute('aria-disabled')==='true'||el.matches(noPress))return;const scope=el.closest(roots),id=el.id;const attrs=identity.filter(a=>el.hasAttribute(a)).map(a=>[a,el.getAttribute(a)]);const find=()=>{if(el.isConnected)return el;if(id)return document.getElementById(id);if(!attrs.length)return null;return scope.querySelector(attrs.map(([a,v])=>'['+a+'="'+CSS.escape(v)+'"]').join(''));};requestAnimationFrame(()=>{sync();animate(find());});},true);
 function init(){sync();const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='class'||r.attributeName==='aria-pressed'))sync();});document.querySelectorAll(roots).forEach(el=>observer.observe(el,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']}));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

