/* Cat Tales V2.5 — real-photo cat peeks, triggered by deliberate user actions.
 * Decorative only: no camera or audio analysis, timers/loops for continuous motion, backend calls or tracking. */
(function(){
  "use strict";
  const peek=document.getElementById("cat-real-peek");
  const toggle=document.getElementById("cat-cameo-toggle");
  if(!peek||!toggle)return;
  const zh=document.documentElement.lang.toLowerCase().startsWith("zh");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const labelOn=zh?"🐾 真实猫咪探头：开启":"🐾 Real-cat peeks: On";
  const labelOff=zh?"🐾 真实猫咪探头：关闭":"🐾 Real-cat peeks: Off";
  let enabled=!reduced.matches,shown=false,flip=0,timeout=null,last=0;
  function hide(){
    if(timeout!==null){clearTimeout(timeout);timeout=null;}
    peek.dataset.visible="false";
    shown=false;
  }
  function status(){
    const usable=!reduced.matches;
    if(!usable){enabled=false;hide();}
    toggle.disabled=!usable;
    toggle.setAttribute("aria-pressed",String(enabled));
    toggle.textContent=enabled?labelOn:labelOff;
    if(!usable)toggle.title=zh?"系统已开启减少动态效果；实拍猫照片仍会静态显示在顶部。":"Reduced motion is enabled. The real-cat photo remains still in the hero.";
    else toggle.removeAttribute("title");
  }
  function cameo(){
    if(!enabled||document.hidden||reduced.matches||!peek.querySelector("img")?.complete)return;
    const now=Date.now();
    if(shown||now-last<2300)return;
    const panel=peek.closest(".live-panel");
    if(!panel)return;
    const rect=panel.getBoundingClientRect();
    // Do not summon photos outside the part of the page the user is actually using.
    if(rect.bottom<70||rect.top>window.innerHeight-45)return;
    last=now;flip++;
    peek.dataset.side=flip%2===0?"left":"right";
    peek.dataset.height=flip%3===0?"lower":"upper";
    peek.dataset.visible="true";
    shown=true;
    timeout=setTimeout(hide,2200);
  }
  toggle.addEventListener("click",()=>{
    if(reduced.matches)return;
    enabled=!enabled;
    if(!enabled)hide();
    status();
  });
  // Appear once after a purposeful user action, never by randomly animating in a loop.
  for(const selector of ["#start","#cat-note-make","#enable-sound"]){
    document.querySelector(selector)?.addEventListener("click",()=>{setTimeout(cameo,120);});
  }
  document.getElementById("compose")?.addEventListener("submit",()=>{setTimeout(cameo,120);});
  document.querySelectorAll(".hero-cat-photo,.cat-photo-peek img").forEach(img=>{
    img.addEventListener("error",()=>{
      if(img.closest(".cat-photo-peek")){hide();peek.style.display="none";}
      else{
        img.style.display="none";
        const fallback=document.createElement("span");
        fallback.className="cat-photo-fallback";fallback.textContent="🐈";
        img.parentElement?.insertBefore(fallback,img.nextSibling);
      }
    });
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden)hide();});
  window.addEventListener("pagehide",hide);
  if(typeof reduced.addEventListener==="function")reduced.addEventListener("change",status);
  status();
})();
