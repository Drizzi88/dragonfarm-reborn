/* Dragonfarm Reborn v0.7: interactive German beginner tutorial.
   No network or external dependencies. Progress lives inside the existing save. */
'use strict';
window.DragonTutorial=(()=>{
  const STEPS=[
    {id:'city',title:'Auf in die Hauptstadt',text:'Auf der Inselkarte liegt rechts die Hauptstadt Alterica. Dort kannst du Drachen, Futter und Dienstleistungen kaufen. Reise zunächst in die Stadt.',tip:'Klicke auf „Town“ in der unteren Leiste oder direkt auf die Stadt der Inselkarte.',place:'city',go:'In die Stadt',selectors:['.scene-island [data-action="go"][data-id="city"]','.dock-nav [data-action="go"][data-id="city"]']},
    {id:'market',title:'Besuche den Drachenhändler',text:'Im Handelsviertel findest du lebende Drachen. Achte vor dem Kauf auf Preis, Gewicht und Eigenschaften. Für jeden Drachen brauchst du einen freien Stall.',tip:'Öffne den „Market“ über den Stadtplan, die Stadtmarker oder die untere Navigation.',place:'market',go:'Zum Markt',selectors:['.world-hotspot[data-action="go"][data-id="market"]','.dock-nav [data-action="go"][data-id="market"]']},
    {id:'bought',title:'Dein erster Drache',text:'Du hast bereits einen Stall und 2.500 Gold Startkapital. Kaufe einen transportierbaren Drachen. Er landet zunächst im Laderaum deines Wagens, nicht sofort auf der Farm.',tip:'Nutze beim Drachenhändler eine aktive „Buy“-Schaltfläche. Ist ein Drache zu schwer, wähle einen leichteren oder verbessere später deinen Wagen.',place:'market',tab:'dragons',go:'Drachenhändler öffnen',selectors:['[data-action="purchase"]:not([disabled])']},
    {id:'deliveredDragon',title:'Bringe deinen Drachen nach Hause',text:'Der Kauf allein genügt nicht: Deine Fracht wartet in der Stadt. Schicke den Wagen zurück zur Farm, damit der Drache seinen Stall beziehen kann.',tip:'Drücke unter „Wagon loading bay“ auf „Send wagon(s) home“.',place:'market',go:'Zum Laderaum',selectors:['[data-action="transport"]:not([disabled])']},
    {id:'farmSeen',title:'Besichtige deine Drachenfarm',text:'Auf deiner Farm ist dein neuer Drache nun tatsächlich zu sehen und bewegt sich durch seine Umgebung. Hier errichtest du später zusätzliche Ställe und Anlagen.',tip:'Reise zu „My farm“. Mit der Maus kannst du die Kamera drehen und mit dem Rad zoomen.',place:'farm',go:'Zur Farm',selectors:['.dock-nav [data-action="go"][data-id="farm"]']},
    {id:'bookOpened',title:'Das Drachenbuch',text:'Öffne das Drachenbuch oben rechts oder klicke direkt auf deinen Drachen. Dort findest du Gesundheit, Stimmung, Stärke und Schönheit sowie die Futtereinstellungen.',tip:'Das Buchsymbol befindet sich oben rechts. Du kannst auch auf einen Eintrag in der Drachenliste klicken.',go:'Drachenbuch zeigen',special:'book',selectors:['.topbar [data-action="roster"]','.dragon-tile[data-action="select"]']},
    {id:'feedBought',title:'Besorge zusätzliches Futter',text:'Du startest mit acht Einheiten Standardfutter. Kaufe jetzt fünf weitere Einheiten beim Händler, damit dein Vorrat nicht unerwartet knapp wird.',tip:'Öffne „Feed & provisions“ im Markt und kaufe bei „Ordinary feed“ fünf Einheiten. Die Fracht muss danach noch transportiert werden.',place:'market',tab:'feed',go:'Zum Futterhändler',selectors:['[data-action="food"][data-id="basic"][data-val="5"]']},
    {id:'feedDelivered',title:'Futter mit dem Wagen liefern',text:'Auch das frisch gekaufte Futter bleibt zunächst in der Stadt. Schicke den Wagen erneut nach Hause. Danach steht es in deinem Lager zur Verfügung.',tip:'Drücke auf „Send wagon(s) home“. Das Futter wird bei Monatswechsel entsprechend der Ration verbraucht.',place:'market',go:'Zum Laderaum',selectors:['[data-action="transport"]:not([disabled])']},
    {id:'trained',title:'Erstes Drachentraining',text:'Training verbessert bestimmte Eigenschaften, kostet jedoch Gold und etwas Gesundheit. Ohne eigenes Trainingszentrum kannst du für 90 Gold außerhalb trainieren. Ein Drache trainiert höchstens einmal pro Monat.',tip:'Öffne „Training“ und nutze zum Beispiel „Combat drills“. Achte darauf, dass dein Drache ausgewählt ist.',place:'training',go:'Zum Training',selectors:['[data-action="train"][data-id="power"]']},
    {id:'advancedMonth',title:'Schließe den ersten Monat ab',text:'Ein Spielzug entspricht einem Monat. Dabei wird Futter verbraucht; Drachen altern, Bauarbeiten gehen weiter, Angestellte werden bezahlt und die Rivalen handeln ebenfalls.',tip:'Kontrolliere deinen Futtervorrat. Klicke anschließend unten rechts auf „End month“ und lies den Monatsbericht.',go:'Monat abschließen',special:'month',selectors:['.turn-button[data-action="endmonth"]']}
  ];
  const fresh=()=>({version:1,active:true,started:false,minimized:false,completed:false,flags:{}});
  const has=(s,key)=>!!s?.tutorial?.flags?.[key];
  function mark(s,key){if(!s?.tutorial)return;if(!s.tutorial.flags)s.tutorial.flags={};s.tutorial.flags[key]=true;}
  function onView(s,v){if(!s?.tutorial)return;
    if(v==='city')mark(s,'city');
    if(v==='market'){mark(s,'city');mark(s,'market');}
    if(v==='farm'&&s.dragons.length>0&&has(s,'deliveredDragon'))mark(s,'farmSeen');
  }
  function hydrate(s){const t=s?.tutorial;if(!t)return;
    if(!t.flags||typeof t.flags!=='object')t.flags={};
    if(s.dragons.length||s.cargo.some(c=>c.type==='dragon'))mark(s,'bought');
    if(s.dragons.length)mark(s,'deliveredDragon');
    if(s.dragons.some(d=>d.trained>0))mark(s,'trained');
    if(s.month>1)mark(s,'advancedMonth');
  }
  function current(s){const i=STEPS.findIndex(step=>!has(s,step.id));return i<0?null:{...STEPS[i],index:i};}
  function startAgain(s){
    const t=fresh();t.started=true;
    // Reuse already completed substantive actions, avoiding needless duplicate purchases.
    t.flags.bought=!!(s.dragons.length||s.cargo.some(c=>c.type==='dragon'));
    t.flags.deliveredDragon=s.dragons.length>0;
    t.flags.trained=s.dragons.some(d=>d.trained>0);
    t.flags.advancedMonth=s.month>1;
    // For replay, still teach travel, menus and care. Skip procurement if it is already done.
    if(s.dragons.length){t.flags.feedBought=true;t.flags.feedDelivered=true;}
    s.tutorial=t;
  }
  function goTo(s,step,{go,setShop}){
    if(step.id==='bookOpened'){
      const el=document.querySelector('[data-action="roster"]');
      if(el && !el.closest('.detail')){el.click();return;}
      go('farm');return;
    }
    if(step.tab){setShop(step.tab);go('market');return;}
    if(step.place){go(step.place);return;}
    if(step.special==='month'){
      const el=document.querySelector('.turn-button[data-action="endmonth"]');
      if(el)el.scrollIntoView({block:'nearest'});
    }
  }
  function action(act,s,helpers){if(!s)return;
    if(!s.tutorial)startAgain(s);
    const t=s.tutorial;
    if(act==='tutorial'){
      if(t.completed){startAgain(s)}else{t.active=true;t.minimized=false;}
      return;
    }
    if(act==='tutorialStart'){t.started=true;t.active=true;t.minimized=false;return;}
    if(act==='tutorialSkip'){t.active=false;t.minimized=false;return;}
    if(act==='tutorialMinimize'){t.minimized=!t.minimized;return;}
    if(act==='tutorialRestart'){startAgain(s);return;}
    if(act==='tutorialFinish'){t.active=false;t.completed=true;return;}
    if(act==='tutorialGo'){
      t.active=true;t.minimized=false;
      const step=current(s);if(!step)return;
      const onTarget=!step.place||(helpers.view===step.place&&(!step.tab||helpers.shopTab===step.tab));
      if(onTarget&&step.id!=='bookOpened'){
        const el=targetOf(step,helpers);
        t.minimized=true;
        if(el)el.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});
      }else{goTo(s,step,helpers);}
    }
  }
  function targetOf(step,context){
    let selectors=[...step.selectors];
    // When the goal is to visit another screen, prioritize persistent bottom navigation.
    if(step.place && context.view!==step.place && step.place!=='market')selectors.push(`.dock-nav [data-action="go"][data-id="${step.place}"]`);
    if(step.place==='market'&&context.view!=='market')selectors.push('.dock-nav [data-action="go"][data-id="market"]');
    for(const sel of selectors){const el=[...document.querySelectorAll(sel)].find(x=>{
      const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&!x.disabled&&getComputedStyle(x).visibility!=='hidden';
    });if(el)return el;}
    return null;
  }
  function remove(){document.querySelectorAll('.tutorial-target').forEach(e=>e.classList.remove('tutorial-target'));document.getElementById('dragon-tutorial')?.remove();}
  function sync(s,context={}){
    remove();
    if(!s?.tutorial?.active)return;
    if(context.mini)return;
    const t=s.tutorial;
    hydrate(s);
    const step=t.started?current(s):null;
    const done=t.started&&!step;
    if(done)t.completed=true;
    const node=document.createElement('section');node.id='dragon-tutorial';node.setAttribute('aria-label','Deutsches Einsteiger-Tutorial');
    if(t.minimized){node.className='tutorial-widget minimized';node.innerHTML=`<button data-action="tutorialMinimize" title="Einführung ausklappen">📖 Einführung ${done?'✓':step?`${step.index+1}/${STEPS.length}`:''} <span aria-hidden="true">▴</span></button>`;document.body.appendChild(node);
      if(step&&!context.modal){const target=targetOf(step,context);if(target)target.classList.add('tutorial-target');}
      return;}
    node.className='tutorial-widget';
    let body='';
    if(!t.started){body=`<div class="tutorial-kicker">WILLKOMMEN IN ALTERICA</div><h2>Deine erste Drachenfarm</h2><p>Ich begleite dich durch deine ersten Schritte – direkt im Spiel und auf Deutsch. Markierte Schaltflächen zeigen dir, wo es weitergeht. Dein Spielfortschritt bleibt dabei vollständig erhalten.</p><p class="tutorial-note">Das Tutorial ist freiwillig und lässt sich jederzeit über <strong>?</strong> oben rechts erneut öffnen.</p><div class="tutorial-actions"><button data-action="tutorialStart" class="primary">Einführung starten</button><button data-action="tutorialSkip">Später</button></div>`;}
    else if(done){body=`<div class="tutorial-kicker">ALLE ${STEPS.length} SCHRITTE GESCHAFFT</div><h2>Gut gemacht, Drachenzüchter!</h2><p>Dein erster Drache ist zu Hause, versorgt und trainiert. Als Nächstes lohnen sich weitere Ställe, die Arena oder langfristig ein Zuchtgehege.</p><div class="tutorial-actions"><button data-action="tutorialFinish" class="primary">Weiterspielen</button><button data-action="tutorialRestart">Einführung ansehen</button></div>`;}
    else {
      const n=step.index+1,p=Math.round(step.index/STEPS.length*100);
      const locationOK=!step.place||(context.view===step.place&&(!step.tab||context.shopTab===step.tab));
      const label=step.id==='bookOpened'?'Drachenbuch öffnen':locationOK?'Schaltfläche zeigen':step.go;
      body=`<div class="tutorial-kicker">DEIN ERSTER SPIELTAG · SCHRITT ${n} VON ${STEPS.length}</div><div class="tutorial-progress" aria-label="Fortschritt ${p} Prozent"><span style="width:${p}%"></span></div><h2>${step.title}</h2><p>${step.text}</p><div class="tutorial-note">💡 ${step.tip}</div><div class="tutorial-actions"><button data-action="tutorialGo" class="primary">${label}</button><button data-action="tutorialSkip">Pausieren</button></div>`;
    }
    node.innerHTML=`<div class="tutorial-heading"><span>📖 DRAGONFARM · EINFÜHRUNG</span><button data-action="tutorialMinimize" class="tutorial-collapse" title="Einführung einklappen" aria-label="Tutorial einklappen">▾</button></div><div class="tutorial-body">${body}</div>`;
    document.body.appendChild(node);
    if(step&&!context.modal){const target=targetOf(step,context);if(target){
      target.classList.add('tutorial-target');
      const a=target.getBoundingClientRect(),b=node.getBoundingClientRect();
      const overlap=(x,y)=>Math.max(0,Math.min(x.right,y.right)-Math.max(x.left,y.left))*Math.max(0,Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top));
      if(overlap(a,b)>0){
        node.style.left='auto';node.style.right=window.innerWidth<=690?'8px':'20px';
        if(overlap(a,node.getBoundingClientRect())>0){node.style.bottom='auto';node.style.top=window.innerWidth<=690?'72px':'82px';}
      }
    }}
  }
  return {fresh,mark,onView,sync,action,current};
})();
