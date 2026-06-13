/* ============================================================
   AGRO FORTE — Modo Plantação (Primeira Pessoa)
   FPS completo via Engine: construção, governo, cidade, encomendas
   ============================================================ */

var Plantation = (function() {

  var canvas;
  var W, H;
  var running = false;
  var animFrame = null;

  // ---- Estado persistente ----
  var money = 1200, day = 1;
  var totalPlanted = 0, totalHarvested = 0;

  var FARM_COLS = 14, FARM_ROWS = 14;
  var farmGrid = [];

  var hasPermit = false;
  var docsCollected = 0;
  var buildings = [];
  var inventory = {};
  var orders = [], activeOrder = null;

  var currentTool = 'hoe';
  var showUI = 'none'; // 'none'|'build'|'orders'|'shop'|'city'|'gov'|'bus'|'interact'

  var nearInfo = null;
  var toast = null, toastTimer = 0;

  var farmMapInfo = null; // returned by Engine.generatePlantationMap

  var onMoneyFn = function(){}, onDayFn = function(){};

  // ---- Seeds ----
  var SEEDS = {
    wheat:  {name:'Trigo',   icon:'🌾',days:3, sell:30, cost:20, cropId:3},
    corn:   {name:'Milho',   icon:'🌽',days:5, sell:60, cost:40, cropId:1},
    soy:    {name:'Soja',    icon:'🫘',days:4, sell:45, cost:30, cropId:2},
    coffee: {name:'Café',    icon:'☕',days:7, sell:100,cost:80, cropId:4},
    cotton: {name:'Algodão', icon:'🌼',days:6, sell:80, cost:60, cropId:5}
  };

  var ownedSeeds = {wheat:10, corn:5, soy:5, coffee:2, cotton:2};

  var ORDERS_POOL = [
    {crop:'wheat', qty:5,  reward:200, label:'5 sacas de Trigo'},
    {crop:'corn',  qty:3,  reward:250, label:'3 sacas de Milho'},
    {crop:'soy',   qty:4,  reward:220, label:'4 sacas de Soja'},
    {crop:'coffee',qty:2,  reward:320, label:'2 sacas de Café'},
    {crop:'cotton',qty:3,  reward:300, label:'3 sacas de Algodão'}
  ];

  var SHOP_ITEMS = [
    {id:'wheat', name:'Sementes Trigo (5)',  cost:80,  type:'seed', seed:'wheat', qty:5},
    {id:'corn',  name:'Sementes Milho (5)',  cost:150, type:'seed', seed:'corn',  qty:5},
    {id:'soy',   name:'Sementes Soja (5)',   cost:120, type:'seed', seed:'soy',   qty:5},
    {id:'coffee',name:'Mudas Café (3)',      cost:200, type:'seed', seed:'coffee',qty:3},
    {id:'cotton',name:'Sementes Algodão (3)',cost:160, type:'seed', seed:'cotton',qty:3}
  ];

  // ---- HUD canvases temporários ----
  var mmCanvas = null; // mini-mapa

  // ============================================================
  // INIT
  // ============================================================
  function init(c, opts) {
    canvas = c;
    opts = opts || {};
    onMoneyFn = opts.onMoney || function(){};
    onDayFn   = opts.onDay   || function(){};
    _initFarmGrid();
    _generateOrders();
    Engine.init(canvas, {
      onInteract: _handleInteract,
      onBoundary: function(m){ _toast(m); },
      quality: 'medium',
      mouseSens: 4
    });
    farmMapInfo = Engine.generatePlantationMap({
      farmGrid: farmGrid,
      buildings: buildings,
      hasPermit: hasPermit
    });
    resize();
    window.addEventListener('resize', resize);
    _setupKeys();
  }

  function resize() {
    W = canvas.offsetWidth  || 900;
    H = canvas.offsetHeight || 600;
    if (mmCanvas) { mmCanvas.width=120; mmCanvas.height=120; }
    Engine.resize && Engine.resize();
  }

  function _initFarmGrid() {
    farmGrid = [];
    for (var r=0; r<FARM_ROWS; r++) {
      farmGrid[r] = [];
      for (var c=0; c<FARM_COLS; c++) {
        farmGrid[r][c] = {state:'empty',seed:null,stage:0,moisture:80,daysPlanted:0};
      }
    }
    for (var i=0; i<4; i++) farmGrid[3][2+i].state='tilled';
  }

  function _generateOrders() {
    orders = [];
    for (var i=0; i<3; i++) {
      var o = ORDERS_POOL[(day*7+i)%ORDERS_POOL.length];
      orders.push({crop:o.crop, qty:o.qty, reward:o.reward, label:o.label, done:false});
    }
  }

  function _setupKeys() {
    document.addEventListener('keydown', function(e) {
      if (e.code==='KeyB') { _toggleUI(showUI==='build'?'none':'build'); }
      if (e.code==='KeyI') { _toggleUI(showUI==='orders'?'none':'orders'); }
      if (e.code==='KeyT') { _cycleTool(); }
      if (e.code==='Escape') { showUI='none'; }
      if (e.code==='Space'&&showUI==='bus') { _travelToCity(); }
    });
  }

  // ============================================================
  // INTERACTION HANDLER (called by Engine when E is pressed)
  // ============================================================
  function _handleInteract(obj) {
    if (!obj) return;

    if (obj.type==='bus_stop') {
      showUI='bus';
      nearInfo = {title:'🚌 Ponto de Ônibus', msg:'Pressione ESPAÇO para viajar à cidade!'};
      return;
    }

    if (obj.type==='gov_office') {
      if (hasPermit) {
        _toast('✅ Você já tem licença de construção!');
      } else if (docsCollected >= 3) {
        hasPermit = true;
        _toast('✅ Licença concedida! Pressione B para construir.');
      } else {
        showUI='gov';
        nearInfo = {
          title:'🏛 Prefeitura',
          msg:'Funcionário: "Para obter a licença de construção, você precisa apresentar 3 documentos oficiais. Procure-os na propriedade!"\n\nDocumentos encontrados: '+docsCollected+'/3'
        };
      }
      return;
    }

    if (obj.type==='document') {
      docsCollected = Math.min(3, docsCollected+1);
      Engine.markObjectDone(obj.id);
      _toast('📄 Documento encontrado! ('+docsCollected+'/3)');
      if (docsCollected>=3) _toast('✅ Todos documentos coletados! Vá à Prefeitura.');
      return;
    }

    if (obj.type==='market') {
      showUI='shop';
      nearInfo = {title:'🏪 Mercado Agro'};
      return;
    }

    if (obj.type==='order_board') {
      showUI='orders';
      nearInfo = {title:'📋 Quadro de Encomendas'};
      return;
    }

    // Farm plot interaction (by world coordinate)
    var fx = farmMapInfo ? farmMapInfo.farmX : 4;
    var fy = farmMapInfo ? farmMapInfo.farmY : 12;
    var px = Math.floor(obj.x) - fx;
    var py = Math.floor(obj.y) - fy;
    if (px>=0 && py>=0 && px<FARM_COLS && py<FARM_ROWS) {
      _applyToolToCell(px, py);
    }
  }

  function _applyToolToCell(c, r) {
    var cell = farmGrid[r] ? farmGrid[r][c] : null;
    if (!cell) return;

    if (currentTool==='hoe') {
      if (cell.state==='empty') {
        cell.state='tilled'; cell.moisture=70;
        _toast('⛏ Terra arada!');
        _rebuildMap();
      }
    } else if (currentTool==='water') {
      cell.moisture=Math.min(100,cell.moisture+35);
      _toast('💧 Regado!');
    } else if (currentTool==='harvest') {
      if (cell.state==='ready') {
        var s=SEEDS[cell.seed];
        var earned=s.sell;
        money+=earned; onMoneyFn(money);
        inventory[cell.seed]=(inventory[cell.seed]||0)+1;
        totalHarvested++;
        _toast('+R$'+earned+' — '+s.name+' colhida! (inv: '+(inventory[cell.seed])+')');
        cell.state='tilled'; cell.seed=null; cell.stage=0; cell.daysPlanted=0;
        _rebuildMap();
        _checkOrders();
      } else {
        _toast('Esta plantação ainda não está madura.');
      }
    } else if (SEEDS[currentTool]) {
      if (cell.state==='tilled') {
        if (!ownedSeeds[currentTool]||ownedSeeds[currentTool]<=0) {
          _toast('Sem sementes de '+SEEDS[currentTool].name+'!');
          return;
        }
        ownedSeeds[currentTool]--;
        cell.state='planted'; cell.seed=currentTool; cell.stage=0; cell.daysPlanted=0;
        totalPlanted++;
        _toast('🌱 '+SEEDS[currentTool].name+' plantada!');
        _rebuildMap();
      } else {
        _toast('Primeiro are o solo com a enxada!');
      }
    }
  }

  function _checkOrders() {
    orders.forEach(function(o) {
      if (o.done) return;
      if ((inventory[o.crop]||0) >= o.qty) {
        o.done = true;
        inventory[o.crop]-=o.qty;
        money+=o.reward; onMoneyFn(money);
        _toast('📦 Encomenda entregue! +R$'+o.reward);
      }
    });
  }

  function _rebuildMap() {
    if (!farmMapInfo) return;
    Engine.generatePlantationMap({
      farmGrid:farmGrid, buildings:buildings, hasPermit:hasPermit
    });
  }

  // ============================================================
  // CITY TRAVEL
  // ============================================================
  function _travelToCity() {
    showUI='city';
    nearInfo = {
      title:'🏙 Cidade — Zona Comercial',
      sections:[
        {icon:'🏪',title:'Mercado Agro',     action:'shop'},
        {icon:'🏛',title:'Prefeitura',        action:'gov'},
        {icon:'📋',title:'Quadro de Encomendas',action:'orders'},
        {icon:'🔙',title:'Voltar para fazenda', action:'return'}
      ]
    };
  }

  // ============================================================
  // TOOLS
  // ============================================================
  function setTool(t) { currentTool=t; }
  function _cycleTool() {
    var tools=['hoe','water','harvest','wheat','corn','soy','coffee','cotton'];
    var idx=tools.indexOf(currentTool);
    currentTool=tools[(idx+1)%tools.length];
    _toast('Ferramenta: '+_toolName(currentTool));
  }
  function _toolName(t){
    var n={hoe:'⛏ Enxada',water:'💧 Regador',harvest:'🌾 Colher',
           wheat:'🌾 Trigo',corn:'🌽 Milho',soy:'🫘 Soja',coffee:'☕ Café',cotton:'🌼 Algodão'};
    return n[t]||t;
  }

  function _toggleUI(s) { showUI=s; }

  // ============================================================
  // NEXT DAY
  // ============================================================
  function nextDay() {
    day++;
    onDayFn(day);
    for (var r=0;r<FARM_ROWS;r++) {
      for (var c=0;c<FARM_COLS;c++) {
        var cell=farmGrid[r][c];
        if (!cell.seed) continue;
        cell.moisture=Math.max(0,cell.moisture-20);
        cell.daysPlanted++;
        var s=SEEDS[cell.seed];
        if (s) {
          cell.stage=Math.min(s.days-1,Math.floor((cell.daysPlanted/(s.days))*4));
          if (cell.daysPlanted>=s.days) cell.state='ready';
          else cell.state='growing';
        }
      }
    }
    if (day%3===0) _generateOrders();
    _rebuildMap();
    _toast('☀ Dia '+day+' começa!');
  }

  // ============================================================
  // BUILD
  // ============================================================
  function _placeBuilding(type) {
    if (!hasPermit) {
      _toast('❌ Precisa de licença da Prefeitura!');
      return;
    }
    var buildDefs = {
      house: {w:4,h:4,cost:800, texId:1, name:'Casa Rural'},
      barn:  {w:6,h:4,cost:1200,texId:2, name:'Celeiro'},
      silo:  {w:3,h:3,cost:600, texId:5, name:'Silo'}
    };
    var bd=buildDefs[type];
    if (!bd) return;
    if (money<bd.cost) { _toast('💰 Precisa de R$'+bd.cost); return; }
    money-=bd.cost; onMoneyFn(money);
    var bx=16+buildings.length*6, by=10;
    buildings.push({x:bx,y:by,w:bd.w,h:bd.h,texId:bd.texId,type:type});
    _rebuildMap();
    showUI='none';
    _toast('🏠 '+bd.name+' construída!');
  }

  // ============================================================
  // RENDER OVERLAY (HUD on top of Engine's FPS view)
  // ============================================================
  function _renderHUD() {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    if (!c) return;
    var cW=canvas.width||900, cH=canvas.height||600;

    // ---- Mini-mapa (top right) ----
    if (!mmCanvas) { mmCanvas=document.createElement('canvas'); mmCanvas.width=120; mmCanvas.height=120; }
    Engine.renderMinimap(mmCanvas);
    c.save();
    c.shadowBlur=8; c.shadowColor='rgba(0,0,0,0.6)';
    c.drawImage(mmCanvas, cW-130, 10);
    c.strokeStyle='rgba(255,255,255,0.25)'; c.lineWidth=1;
    c.strokeRect(cW-130,10,120,120);
    c.restore();

    // ---- Dinheiro e dia ----
    c.save();
    c.fillStyle='rgba(0,0,0,0.55)';
    c.beginPath(); _rrectC(c,10,10,200,36,8); c.fill();
    c.fillStyle='#f5c518'; c.font='bold 15px sans-serif'; c.textBaseline='middle';
    c.fillText('💰 R$ '+money.toLocaleString('pt-BR'),20,28);
    c.restore();

    c.save();
    c.fillStyle='rgba(0,0,0,0.55)';
    c.beginPath(); _rrectC(c,10,52,130,30,8); c.fill();
    c.fillStyle='#a0d8a0'; c.font='13px sans-serif'; c.textBaseline='middle';
    c.fillText('📅 Dia '+day,20,67);
    c.restore();

    // ---- Ferramenta atual (centro-baixo) ----
    c.save();
    c.fillStyle='rgba(0,0,0,0.6)';
    c.beginPath(); _rrectC(c,cW/2-80,cH-48,160,36,18); c.fill();
    c.fillStyle='#fff'; c.font='bold 14px sans-serif';
    c.textAlign='center'; c.textBaseline='middle';
    c.fillText(_toolName(currentTool),cW/2,cH-30);
    c.restore();

    // ---- Controles (bottom left) ----
    c.save();
    c.fillStyle='rgba(0,0,0,0.45)';
    c.beginPath(); _rrectC(c,10,cH-78,185,70,8); c.fill();
    c.fillStyle='rgba(255,255,255,0.55)'; c.font='11px sans-serif'; c.textBaseline='top';
    var hints=['[E] Interagir com objetos','[T] Trocar ferramenta','[B] Modo construção','[I] Encomendas'];
    hints.forEach(function(h,i){ c.fillText(h,18,cH-72+i*15); });
    c.restore();

    // ---- Veículo HUD ----
    if (Engine.isInVehicle()) {
      var veh=Engine.getNearVehicle();
      c.save();
      c.fillStyle='rgba(0,0,0,0.65)';
      c.beginPath(); _rrectC(c,cW/2-80,10,160,38,8); c.fill();
      c.fillStyle='#f5c518'; c.font='bold 14px sans-serif';
      c.textAlign='center'; c.textBaseline='middle';
      var vNames={tractor:'🚜 Trator',harvester:'🌾 Colheitadeira',car:'🚗 Carro',truck:'🚛 Caminhão'};
      var vn=veh?vNames[veh.vehicleType]||'🚗 Veículo':'🚗 Veículo';
      c.fillText(vn+' — [E] Sair',cW/2,29);
      c.restore();
    }

    // ---- Near object hint ----
    var nearObj=Engine.getNearObject();
    if (nearObj&&!Engine.isInVehicle()) {
      var hint=_getObjectHint(nearObj);
      if (hint) {
        c.save();
        var hw=Math.max(200,hint.length*8+40);
        c.fillStyle='rgba(0,0,0,0.65)';
        c.beginPath(); _rrectC(c,cW/2-hw/2,cH/2+50,hw,32,16); c.fill();
        c.fillStyle='#ffef60'; c.font='bold 13px sans-serif';
        c.textAlign='center'; c.textBaseline='middle';
        c.fillText('[E] '+hint,cW/2,cH/2+66);
        c.restore();
      }
    }
    var nearVeh=Engine.getNearVehicle();
    if (nearVeh&&!Engine.isInVehicle()) {
      c.save();
      c.fillStyle='rgba(0,0,0,0.65)';
      c.beginPath(); _rrectC(c,cW/2-100,cH/2+50,200,32,16); c.fill();
      c.fillStyle='#ffef60'; c.font='bold 13px sans-serif';
      c.textAlign='center'; c.textBaseline='middle';
      var vNames2={tractor:'🚜 Entrar no Trator',harvester:'🌾 Entrar na Colheitadeira',car:'🚗 Entrar no Carro',truck:'🚛 Entrar no Caminhão'};
      c.fillText('[E] '+(vNames2[nearVeh.vehicleType]||'Entrar no veículo'),cW/2,cH/2+66);
      c.restore();
    }

    // ---- Toast ----
    if (toast && toastTimer>0) {
      var ta=Math.min(1,toastTimer/0.4);
      c.save(); c.globalAlpha=ta*0.92;
      var tw=Math.max(180,toast.length*9+40);
      c.fillStyle='rgba(10,40,5,0.9)';
      c.beginPath(); _rrectC(c,cW/2-tw/2,cH*0.32,tw,36,18); c.fill();
      c.fillStyle='#a0ffa0'; c.font='bold 14px sans-serif';
      c.textAlign='center'; c.textBaseline='middle';
      c.fillText(toast,cW/2,cH*0.32+18);
      c.restore();
      toastTimer-=0.016;
      if(toastTimer<=0) toast=null;
    }

    // ---- UI Overlays ----
    if (showUI==='build')   _drawBuildMenu(c,cW,cH);
    if (showUI==='orders')  _drawOrdersMenu(c,cW,cH);
    if (showUI==='shop')    _drawShopMenu(c,cW,cH);
    if (showUI==='city')    _drawCityMenu(c,cW,cH);
    if (showUI==='gov')     _drawGovDialog(c,cW,cH);
    if (showUI==='bus')     _drawBusDialog(c,cW,cH);
  }

  function _getObjectHint(o) {
    if (o.type==='bus_stop') return 'Viajar para a Cidade';
    if (o.type==='gov_office') return 'Prefeitura';
    if (o.type==='document') return 'Pegar Documento';
    if (o.type==='market'||o.type==='order_board') return 'Abrir '+((o.type==='market')?'Loja':'Encomendas');
    return 'Interagir';
  }

  // ============================================================
  // UI OVERLAYS
  // ============================================================
  function _drawBuildMenu(c,cW,cH) {
    _modal(c,cW,cH,320,300);
    c.fillStyle='#f5c518'; c.font='bold 18px sans-serif';
    c.textAlign='center'; c.fillText('🏗 Construção',cW/2,cH/2-115);
    if(!hasPermit) {
      c.fillStyle='#ff8080'; c.font='13px sans-serif';
      c.fillText('❌ Sem licença! Vá à Prefeitura.',cW/2,cH/2-85);
    }
    var items=[
      {icon:'🏠',name:'Casa Rural',   type:'house',cost:800},
      {icon:'🏚',name:'Celeiro',      type:'barn', cost:1200},
      {icon:'⛽',name:'Silo',         type:'silo', cost:600}
    ];
    items.forEach(function(item,i){
      var iy=cH/2-50+i*55;
      var active=hasPermit&&money>=item.cost;
      c.fillStyle=active?'rgba(40,100,20,0.7)':'rgba(40,20,20,0.5)';
      c.beginPath(); _rrectC(c,cW/2-130,iy,260,45,10); c.fill();
      c.fillStyle=active?'#fff':'rgba(255,255,255,0.4)'; c.font='bold 14px sans-serif';
      c.textAlign='left'; c.fillText(item.icon+' '+item.name,cW/2-115,iy+25);
      c.textAlign='right'; c.fillStyle=active?'#f5c518':'rgba(245,197,24,0.4)';
      c.fillText('R$'+item.cost,cW/2+120,iy+25);
      if(active) {
        (function(t2){ canvas.addEventListener('click',function once(ev){
          if(showUI!=='build') return;
          var rect=canvas.getBoundingClientRect();
          var mx=ev.clientX-rect.left, my=ev.clientY-rect.top;
          if(mx>cW/2-130&&mx<cW/2+130&&my>iy&&my<iy+45){
            _placeBuilding(t2); canvas.removeEventListener('click',once);
          }
        },{once:true});})(item.type);
      }
    });
    _closeBtn(c,cW,cH);
  }

  function _drawOrdersMenu(c,cW,cH) {
    _modal(c,cW,cH,360,280);
    c.fillStyle='#f5c518'; c.font='bold 17px sans-serif';
    c.textAlign='center'; c.fillText('📋 Encomendas',cW/2,cH/2-108);
    orders.forEach(function(o,i){
      var oy=cH/2-75+i*68;
      var has=(inventory[o.crop]||0)>=o.qty;
      c.fillStyle=o.done?'rgba(20,80,20,0.6)':has?'rgba(80,60,10,0.6)':'rgba(20,20,20,0.5)';
      c.beginPath(); _rrectC(c,cW/2-155,oy,310,55,10); c.fill();
      c.fillStyle=o.done?'#60e060':has?'#f5c518':'#aaa';
      c.font='bold 13px sans-serif'; c.textAlign='left';
      c.fillText((o.done?'✅ ':'📦 ')+o.label,cW/2-142,oy+20);
      c.fillStyle=o.done?'#60e060':'#80d080'; c.font='12px sans-serif';
      c.fillText('Recompensa: R$'+o.reward,cW/2-142,oy+38);
      c.fillStyle='rgba(255,255,255,0.55)'; c.textAlign='right'; c.font='12px sans-serif';
      c.fillText(o.done?'ENTREGUE':'Inv: '+(inventory[o.crop]||0)+'/'+o.qty,cW/2+145,oy+20);
    });
    _closeBtn(c,cW,cH);
  }

  function _drawShopMenu(c,cW,cH) {
    _modal(c,cW,cH,340,280);
    c.fillStyle='#f5c518'; c.font='bold 17px sans-serif';
    c.textAlign='center'; c.fillText('🏪 Mercado Agro',cW/2,cH/2-108);
    SHOP_ITEMS.forEach(function(item,i){
      var iy=cH/2-72+i*50;
      var canBuy=money>=item.cost;
      c.fillStyle=canBuy?'rgba(30,90,20,0.6)':'rgba(20,20,20,0.5)';
      c.beginPath(); _rrectC(c,cW/2-145,iy,290,42,8); c.fill();
      c.fillStyle=canBuy?'#fff':'rgba(255,255,255,0.4)'; c.font='bold 13px sans-serif';
      c.textAlign='left'; c.fillText(item.name,cW/2-132,iy+22);
      c.textAlign='right'; c.fillStyle=canBuy?'#f5c518':'rgba(245,197,24,0.4)';
      c.fillText('R$'+item.cost,cW/2+130,iy+22);
      if(canBuy) {
        (function(it){ canvas.addEventListener('click',function once(ev){
          if(showUI!=='shop') return;
          var rect=canvas.getBoundingClientRect();
          var mx=ev.clientX-rect.left, my=ev.clientY-rect.top;
          if(mx>cW/2-145&&mx<cW/2+145&&my>iy&&my<iy+42){
            money-=it.cost; onMoneyFn(money);
            ownedSeeds[it.seed]=(ownedSeeds[it.seed]||0)+it.qty;
            _toast('✅ '+it.name+' comprado!'); canvas.removeEventListener('click',once);
          }
        },{once:true});})(item);
      }
    });
    _closeBtn(c,cW,cH);
  }

  function _drawCityMenu(c,cW,cH) {
    _modal(c,cW,cH,360,300);
    // City skyline visual
    ctx_cityBg(c,cW,cH);
    c.fillStyle='#f5c518'; c.font='bold 18px sans-serif';
    c.textAlign='center'; c.fillText('🏙 Zona Comercial',cW/2,cH/2-108);
    var secs=[
      {icon:'🏪',label:'Mercado Agro',     sub:'Comprar sementes', ui:'shop'},
      {icon:'🏛',label:'Prefeitura',        sub:'Obter licença de construção', ui:'gov'},
      {icon:'📋',label:'Encomendas',        sub:'Ver pedidos pendentes', ui:'orders'},
      {icon:'🔙',label:'Voltar para Fazenda',sub:'Fim da visita', ui:'return'}
    ];
    secs.forEach(function(s,i){
      var sy=cH/2-65+i*58;
      c.fillStyle='rgba(10,30,10,0.65)';
      c.beginPath(); _rrectC(c,cW/2-150,sy,300,50,10); c.fill();
      c.fillStyle='#fff'; c.font='bold 15px sans-serif'; c.textAlign='left';
      c.fillText(s.icon+' '+s.label,cW/2-130,sy+22);
      c.fillStyle='rgba(255,255,255,0.55)'; c.font='11px sans-serif';
      c.fillText(s.sub,cW/2-130,sy+38);
      (function(su){ canvas.addEventListener('click',function once(ev){
        if(showUI!=='city') return;
        var rect=canvas.getBoundingClientRect();
        var mx=ev.clientX-rect.left, my=ev.clientY-rect.top;
        if(mx>cW/2-150&&mx<cW/2+150&&my>sy&&my<sy+50){
          if(su==='return') { showUI='none'; _toast('🚌 De volta à fazenda!'); }
          else { showUI=su; }
          canvas.removeEventListener('click',once);
        }
      },{once:true});})(s.ui);
    });
  }

  function ctx_cityBg(c,cW,cH) {
    var bx=cW/2-150, by=cH/2-130, bw=300, bh=40;
    for(var bi=0;bi<8;bi++) {
      var bX=bx+bi*38, bH=25+Math.sin(bi*2.1)*15;
      c.fillStyle='rgba(40,50,80,0.6)';
      c.fillRect(bX,by+bh-bH,30,bH);
      c.fillStyle='rgba(255,220,80,0.4)';
      for(var wi=0;wi<2;wi++) for(var wj=0;wj<3;wj++) {
        if((bi+wi+wj)%2===0) c.fillRect(bX+4+wi*12,by+bh-bH+4+wj*7,8,5);
      }
    }
  }

  function _drawGovDialog(c,cW,cH) {
    _modal(c,cW,cH,360,240);
    c.fillStyle='#80a0ff'; c.font='bold 17px sans-serif';
    c.textAlign='center'; c.fillText('🏛 Prefeitura Municipal',cW/2,cH/2-95);
    c.fillStyle='rgba(200,200,255,0.7)'; c.font='13px sans-serif';
    var lines=[];
    if(hasPermit) {
      lines=['✅ Licença de Construção ATIVA!','Você pode construir livremente','na sua propriedade. Bom trabalho!'];
    } else if(docsCollected>=3) {
      lines=['✅ Todos os documentos coletados!','Pressione [E] perto do escritório','para confirmar e obter a licença.'];
    } else {
      lines=[
        '"Para licença de construção,',
        'você precisa de 3 documentos oficiais.',
        'Procure-os espalhados na propriedade!"',
        '','Documentos: '+docsCollected+'/3'
      ];
    }
    lines.forEach(function(l,i){ c.fillText(l,cW/2,cH/2-55+i*22); });
    _closeBtn(c,cW,cH);
  }

  function _drawBusDialog(c,cW,cH) {
    _modal(c,cW,cH,340,180);
    c.fillStyle='#80e080'; c.font='bold 17px sans-serif';
    c.textAlign='center'; c.fillText('🚌 Ponto de Ônibus',cW/2,cH/2-70);
    c.fillStyle='rgba(200,255,200,0.7)'; c.font='13px sans-serif';
    c.fillText('"O próximo ônibus parte em alguns instantes."',cW/2,cH/2-35);
    c.fillText('"Deseja viajar para a cidade?"',cW/2,cH/2-12);
    // Buttons
    var yBtn=cH/2+20;
    c.fillStyle='rgba(20,120,40,0.8)'; c.beginPath(); _rrectC(c,cW/2-110,yBtn,100,36,8); c.fill();
    c.fillStyle='#fff'; c.font='bold 13px sans-serif'; c.fillText('[ESPAÇO] Sim!',cW/2-60,yBtn+22);
    c.fillStyle='rgba(120,20,20,0.8)'; c.beginPath(); _rrectC(c,cW/2+10,yBtn,100,36,8); c.fill();
    c.fillStyle='#fff'; c.fillText('[ESC] Não',cW/2+60,yBtn+22);
  }

  // ============================================================
  // DRAWING HELPERS
  // ============================================================
  function _modal(c,cW,cH,w,h) {
    c.fillStyle='rgba(0,0,0,0.72)';
    c.fillRect(0,0,cW,cH);
    var mg=c.createLinearGradient(cW/2-w/2,cH/2-h/2,cW/2+w/2,cH/2+h/2);
    mg.addColorStop(0,'rgba(8,28,8,0.97)');
    mg.addColorStop(1,'rgba(4,18,4,0.97)');
    c.fillStyle=mg;
    c.beginPath(); _rrectC(c,cW/2-w/2,cH/2-h/2,w,h,16); c.fill();
    c.strokeStyle='rgba(77,184,106,0.4)'; c.lineWidth=1.5; c.stroke();
  }

  function _closeBtn(c,cW,cH) {
    c.fillStyle='rgba(255,255,255,0.15)';
    c.beginPath(); _rrectC(c,cW/2-45,cH/2+110,90,28,14); c.fill();
    c.fillStyle='rgba(255,255,255,0.6)'; c.font='12px sans-serif';
    c.textAlign='center'; c.textBaseline='middle';
    c.fillText('[ESC] Fechar',cW/2,cH/2+124);
    canvas.addEventListener('click',function once(ev){
      if(showUI==='none') return;
      var rect=canvas.getBoundingClientRect();
      var my=ev.clientY-rect.top, mx=ev.clientX-rect.left;
      if(mx>cW/2-45&&mx<cW/2+45&&my>cH/2+110&&my<cH/2+138){
        showUI='none'; canvas.removeEventListener('click',once);
      }
    },{once:true});
  }

  function _rrectC(c,x,y,w,h,r) {
    c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
    c.closePath();
  }

  function _toast(msg) {
    toast=msg; toastTimer=2.5;
  }

  // ============================================================
  // RENDER LOOP (Engine renders FPS, we render HUD on top)
  // ============================================================
  function startRender() {
    if (running) return;
    running = true;
    Engine.start(0, {
      quality: 'medium',
      onTimerEnd: function(){}
    });
    // Re-generate plantation map after Engine.start() (which calls generateMap(0))
    setTimeout(function(){
      farmMapInfo = Engine.generatePlantationMap({
        farmGrid: farmGrid, buildings: buildings, hasPermit: hasPermit
      });
    }, 50);

    function hudLoop() {
      if (!running) return;
      animFrame = requestAnimationFrame(hudLoop);
      _renderHUD();
    }
    animFrame = requestAnimationFrame(hudLoop);
  }

  function stopRender() {
    running = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    Engine.stop();
  }

  // ============================================================
  // STATE PERSISTENCE
  // ============================================================
  function getState() {
    return {
      money:money, day:day,
      farmGrid:farmGrid,
      hasPermit:hasPermit, docsCollected:docsCollected,
      buildings:buildings, inventory:inventory,
      ownedSeeds:ownedSeeds, orders:orders,
      totalPlanted:totalPlanted, totalHarvested:totalHarvested
    };
  }

  function loadState(s) {
    if (!s) return;
    money=s.money||1200; day=s.day||1;
    farmGrid=s.farmGrid||farmGrid;
    hasPermit=s.hasPermit||false; docsCollected=s.docsCollected||0;
    buildings=s.buildings||[]; inventory=s.inventory||{};
    ownedSeeds=s.ownedSeeds||{wheat:10,corn:5,soy:5,coffee:2,cotton:2};
    orders=s.orders||[]; totalPlanted=s.totalPlanted||0; totalHarvested=s.totalHarvested||0;
  }

  function getMoney() { return money; }
  function getDay()   { return day; }
  function getShopItems() { return SHOP_ITEMS; }

  function setTooltip(el) {}
  function buyItem(id) {
    var item=SHOP_ITEMS.find(function(i){return i.id===id;});
    if(!item||money<item.cost) return;
    money-=item.cost; onMoneyFn(money);
    if(item.type==='seed') ownedSeeds[item.seed]=(ownedSeeds[item.seed]||0)+item.qty;
  }

  function unlockAchievement(id) {
    if(window.Game&&Game.unlockAchievement) Game.unlockAchievement(id,'','');
  }

  return {
    init:init, resize:resize,
    startRender:startRender, stopRender:stopRender,
    nextDay:nextDay,
    setTool:setTool,
    getState:getState, loadState:loadState,
    getMoney:getMoney, getDay:getDay,
    getShopItems:getShopItems,
    buyItem:buyItem,
    setTooltip:setTooltip
  };
})();
