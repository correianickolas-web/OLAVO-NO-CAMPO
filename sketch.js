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

   /* ============================================================
   AGRO FORTE — Trailer Cinemático Estilo Agronegócios
   Drone shots, aurora, lavouras, personagens — zero libs externas
   ============================================================ */

var Trailer = (function() {

  var canvas, ctx, W, H;
  var animFrame = null;
  var startTime = 0;
  var onEnd = null;
  var audioCtx = null;
  var audioNodes = [];
  var DURATION = 34;

  function start(c, cb) {
    canvas = c; ctx = c.getContext('2d');
    W = canvas.width  = canvas.offsetWidth  || 1280;
    H = canvas.height = canvas.offsetHeight || 720;
    onEnd = cb || function(){};
    startTime = performance.now();
    _startMusic();
    if (animFrame) cancelAnimationFrame(animFrame);
    _loop(startTime);
  }

  function stop() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    audioNodes.forEach(function(n){ try{n.stop&&n.stop();}catch(e){} });
    audioNodes = [];
    if (audioCtx) { try{audioCtx.close();}catch(e){} audioCtx = null; }
  }

  function _loop(now) {
    animFrame = requestAnimationFrame(_loop);
    var t = (now - startTime) / 1000;
    W = canvas.width  = canvas.offsetWidth  || 1280;
    H = canvas.height = canvas.offsetHeight || 720;
    ctx.clearRect(0, 0, W, H);

    if      (t <  5)        _sceneAerialDawn(t, 5);
    else if (t < 11)        _sceneSunrise(t - 5, 6);
    else if (t < 18)        _sceneTractorDrive(t - 11, 7);
    else if (t < 24)        _sceneCharacters(t - 18, 6);
    else if (t < 30)        _sceneMissions(t - 24, 6);
    else if (t < DURATION)  _sceneEpicTitle(t - 30, DURATION - 30);
    else { stop(); onEnd(); return; }

    // Cross-fade between scenes
    var breaks = [4.6, 10.6, 17.6, 23.6, 29.6];
    breaks.forEach(function(bt) {
      var d = Math.abs(t - bt);
      if (d < 0.4) {
        ctx.fillStyle = 'rgba(0,0,0,' + (1 - d/0.4) + ')';
        ctx.fillRect(0,0,W,H);
      }
    });

    if (t < 2.5) {
      ctx.save();
      ctx.globalAlpha = Math.min(1,t*2)*0.35;
      ctx.fillStyle='#fff';
      ctx.font='13px sans-serif';
      ctx.textAlign='right';
      ctx.textBaseline='bottom';
      ctx.fillText('ESPAÇO para pular', W-18, H-14);
      ctx.restore();
    }
  }

  /* =========================================================
     CENA 1: DRONE AÉREO — câmera de cima descendo para horizonte
  ========================================================= */
  function _sceneAerialDawn(t, dur) {
    var prog = t / dur;

    // Céu pré-amanhecer
    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0, _lerpColor('#04041a','#1a2050', prog));
    sky.addColorStop(0.5,_lerpColor('#180a28','#a82020', prog));
    sky.addColorStop(1,  _lerpColor('#080808','#e89828', prog));
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

    // Estrelas a desaparecer
    if (prog < 0.75) {
      var sa = (1 - prog/0.75) * 0.85;
      for (var i=0; i<90; i++) {
        var sx=(Math.sin(i*173.7)*0.5+0.5)*W, sy=(Math.sin(i*97.3)*0.5+0.5)*H*0.55;
        var tw=Math.abs(Math.sin(t*1.5+i))*0.4+0.6;
        ctx.save(); ctx.globalAlpha=sa*tw;
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(sx,sy,Math.abs(Math.sin(i*31))*1.4+0.3,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    // Câmera drone: de top-down para horizonte
    var tilt = _easeInOut(Math.min(1, prog * 1.3));
    var scaleY = 0.15 + tilt * 0.85;
    var offY   = (1 - scaleY) * H * 0.40;

    ctx.save();
    ctx.transform(1, 0, 0, scaleY, 0, offY);
    _drawAerialCrops(t, prog);
    ctx.restore();

    // Brilho no horizonte
    if (prog > 0.25) {
      var ga = (prog-0.25)/0.75;
      var gy = H * (0.5 - tilt*0.1);
      var hgr = ctx.createRadialGradient(W*0.55, gy, 0, W*0.55, gy, W*0.5);
      hgr.addColorStop(0,  'rgba(255,150,20,'+ga*0.65+')');
      hgr.addColorStop(0.3,'rgba(240,60,0,'+ga*0.25+')');
      hgr.addColorStop(1,  'rgba(0,0,0,0)');
      ctx.fillStyle=hgr; ctx.fillRect(0,0,W,H);
    }

    if (t > 1.8) {
      var ta=Math.min(1,(t-1.8)*1.4);
      _text('NO CORAÇÃO DO PARANÁ...', W/2, H*0.84, ta, 22, '#f5e090', true);
    }
    _letterbox();
  }

  function _drawAerialCrops(t, prog) {
    var cols=24, rows=20;
    var cw=W/cols, ch=H/rows;
    var camX=W*0.08+Math.sin(t*0.13)*W*0.04;
    var camY=H*0.08+Math.cos(t*0.10)*H*0.03;
    var palette=['#1a4a08','#2a6012','#3a7820','#8a6a10','#d4b830','#5a8012','#2a5008','#6a9022'];

    for (var r=-1; r<=rows+1; r++) {
      for (var c=-1; c<=cols+1; c++) {
        var wx=c*cw-camX, wy=r*ch-camY;
        var idx=((r*7+c*3)%palette.length+palette.length)%palette.length;
        ctx.fillStyle=palette[idx];
        ctx.fillRect(wx,wy,cw-1,ch-1);
        if ((r+c)%2===0) {
          ctx.fillStyle='rgba(0,0,0,0.22)';
          for (var li=0;li<4;li++) ctx.fillRect(wx+li*(cw/4),wy,1,ch-1);
        }
      }
    }

    // Celeiro e casa vista de cima
    ctx.fillStyle='#c87840'; ctx.fillRect(W*0.38-camX,H*0.38-camY,62,46);
    ctx.fillStyle='#8a1a10'; ctx.fillRect(W*0.48-camX+18,H*0.38-camY,92,62);

    // Trator se movendo
    var tx=W*0.28+Math.cos(t*0.38)*W*0.1-camX;
    var ty=H*0.48+Math.sin(t*0.32)*H*0.08-camY;
    ctx.fillStyle='#e8a820'; ctx.fillRect(tx-9,ty-6,24,15);
    ctx.fillStyle='#444';
    ctx.beginPath(); ctx.arc(tx,ty+10,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx+14,ty+10,5,0,Math.PI*2); ctx.fill();
  }

  /* =========================================================
     CENA 2: NASCER DO SOL — horizonte dourado cinematográfico
  ========================================================= */
  function _sceneSunrise(t, dur) {
    var prog = t / dur;

    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0, _lerpColor('#1a2a6c','#2c3e8a',prog));
    sky.addColorStop(0.3,_lerpColor('#b21f1f','#e87030',prog));
    sky.addColorStop(0.6,_lerpColor('#fdbb2d','#ffd060',prog));
    sky.addColorStop(1,'#1a4010');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

    // Sol
    var sunX=W*0.58, sunY=H*(0.72-prog*0.35), sunR=55+prog*35;
    var sg=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*3.5);
    sg.addColorStop(0,'rgba(255,255,200,1)');
    sg.addColorStop(0.14,'rgba(255,220,80,0.9)');
    sg.addColorStop(0.4,'rgba(255,110,10,0.35)');
    sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,sunR*3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffffc0'; ctx.beginPath(); ctx.arc(sunX,sunY,sunR*0.45,0,Math.PI*2); ctx.fill();

    // Raios de luz
    ctx.save(); ctx.globalAlpha=0.12+Math.sin(t*1.8)*0.03;
    for (var ri=0;ri<10;ri++) {
      var ra=(ri/10)*Math.PI*2+t*0.08;
      ctx.strokeStyle='#ffe090'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(sunX,sunY);
      ctx.lineTo(sunX+Math.cos(ra)*W*0.6,sunY+Math.sin(ra)*W*0.6); ctx.stroke();
    }
    ctx.restore();

    // Silhueta de morros
    ctx.fillStyle='#1a3810';
    ctx.beginPath(); ctx.moveTo(0,H);
    for (var hx=0;hx<=W;hx+=8) {
      ctx.lineTo(hx,H*0.56+Math.sin(hx*0.012+0.5)*26+Math.sin(hx*0.028+1.2)*14+Math.sin(hx*0.006)*38);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

    // Campo com fileiras
    var gGrad=ctx.createLinearGradient(0,H*0.56,0,H);
    gGrad.addColorStop(0,'#2a6012'); gGrad.addColorStop(1,'#1a3808');
    ctx.fillStyle=gGrad; ctx.fillRect(0,H*0.58,W,H*0.42);

    ctx.save(); ctx.globalAlpha=0.55;
    for (var row=0;row<16;row++) {
      var rY=H-(row+1)*((H*0.42)/16);
      var rW=W*(0.12+row*0.055);
      ctx.strokeStyle='rgba(80,160,20,'+(1-row/16)*0.45+')';
      ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo((W-rW)/2,rY); ctx.lineTo((W-rW)/2+rW,rY); ctx.stroke();
    }
    ctx.restore();

    // Trator em silhueta
    var tx2=W*0.14+t*(W*0.12);
    _tractorSil(tx2, H*0.78, 0.95);

    // Poeira
    ctx.save();
    for (var di=0;di<14;di++) {
      var da=(1-di/14)*0.28, dx=tx2-30-di*16, dy=H*0.78-di*3;
      ctx.globalAlpha=da;
      ctx.fillStyle='#c8a060';
      ctx.beginPath(); ctx.arc(dx,dy,7+di*2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    if (t>1.2) _text('UMA FAZENDA PRECISA DE VOCÊ', W/2, H*0.14, Math.min(1,(t-1.2)*1.6), 28,'#ffe590',true);
    _letterbox();
  }

  /* =========================================================
     CENA 3: TRATOR EM AÇÃO — close lateral, câmera rastreando
  ========================================================= */
  function _sceneTractorDrive(t, dur) {
    var prog = t / dur;

    var sky=ctx.createLinearGradient(0,0,0,H*0.55);
    sky.addColorStop(0,'#2c5c9a'); sky.addColorStop(1,'#78b4d0');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.55);

    // Morros distantes
    ctx.fillStyle='#2a5a18';
    ctx.beginPath(); ctx.moveTo(0,H*0.55);
    for (var hx=0;hx<=W;hx+=6) ctx.lineTo(hx,H*0.55-Math.sin(hx*0.009+2)*18-Math.sin(hx*0.022)*10);
    ctx.lineTo(W,H*0.55); ctx.closePath(); ctx.fill();

    // Chão
    var gG=ctx.createLinearGradient(0,H*0.5,0,H);
    gG.addColorStop(0,'#3a7818'); gG.addColorStop(1,'#1a3808');
    ctx.fillStyle=gG; ctx.fillRect(0,H*0.5,W,H*0.5);

    // Fileiras de plantação rolando
    var camOffX=t*115;
    ctx.save();
    for (var row=0;row<22;row++) {
      var rF=row/21;
      var ry=H*0.52+rF*H*0.48;
      var rH=3+rF*62;
      var rSp=22+rF*85;
      for (var col=-2;col<W/rSp+4;col++) {
        var cx=col*rSp-(camOffX*(0.1+rF*0.9))%rSp;
        var stH=rH*(0.55+Math.sin(cx*0.45+row)*0.45);
        ctx.fillStyle=row%2===0?'#3a8018':'#2a6010';
        ctx.fillRect(cx-3,ry-stH,6,stH);
        if (row>13) {
          ctx.fillStyle='#d4b020';
          ctx.beginPath(); ctx.ellipse(cx,ry-stH-7,4,11,0,0,Math.PI*2); ctx.fill();
        }
      }
    }
    ctx.restore();

    // Trator colorido grande
    var tx=W*0.38+prog*W*0.04, ty=H*0.64, sc=2.4;
    ctx.save(); ctx.translate(tx,ty); ctx.scale(sc,sc);
    ctx.fillStyle='#d4a020'; ctx.fillRect(-56,-44,82,40);
    ctx.fillStyle='#e8b830'; ctx.fillRect(-30,-62,40,22);
    ctx.fillStyle='#88bbdd'; ctx.fillRect(-28,-60,36,19);
    ctx.fillStyle='#333';
    ctx.beginPath(); ctx.arc(-38,0,22,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(24,0,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#555';
    ctx.beginPath(); ctx.arc(-38,0,18,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(24,0,12,0,Math.PI*2); ctx.fill();
    for (var sp=0;sp<6;sp++) {
      var sa=(sp/6)*Math.PI*2+t*3.2;
      ctx.strokeStyle='#888'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-38,0); ctx.lineTo(-38+Math.cos(sa)*17,Math.sin(sa)*17); ctx.stroke();
    }
    ctx.restore();

    // Poeira
    ctx.save();
    for (var pi=0;pi<18;pi++) {
      var pA=((t*0.65+pi*0.14)%1.4);
      var px2=tx-75-pA*55+Math.sin(pi*2.3)*18, py2=ty-pA*28+Math.cos(pi*1.7)*9;
      ctx.globalAlpha=(1-pA/1.4)*0.32; ctx.fillStyle='#d4b870';
      ctx.beginPath(); ctx.arc(px2,py2,5+pA*9,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    var cards=[
      {text:'CULTIVE.',   x:0.22, s:0.6, e:3.2},
      {text:'CONSTRUA.',  x:0.50, s:2.2, e:5.2},
      {text:'CONQUISTE.', x:0.78, s:3.8, e:7}
    ];
    cards.forEach(function(c) {
      var ta=Math.min(1,Math.max(0,(t-c.s)*1.8))*(1-Math.max(0,(t-c.e)*2));
      if(ta>0) _text(c.text,W*c.x,H*0.22,ta,34,'#f5c518',true);
    });
    _letterbox();
  }

  /* =========================================================
     CENA 4: PERSONAGENS
  ========================================================= */
  function _sceneCharacters(t, dur) {
    var bg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.75);
    bg.addColorStop(0,'#1a3a10'); bg.addColorStop(1,'#060e03');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    var chars=[
      {name:'Seu Juca',  role:'Fazendeiro',          color:'#e8a830',x:0.14,d:0},
      {name:'Marina',    role:'Engenheira Agrônoma',  color:'#5dde80',x:0.31,d:0.5},
      {name:'Seu Pedro', role:'Pesquisador',          color:'#60aaff',x:0.50,d:1.0},
      {name:'Dona Célia',role:'Agricultora',          color:'#ff90a0',x:0.69,d:1.5},
      {name:'Ana',       role:'Repórter',             color:'#ffe060',x:0.86,d:2.0}
    ];

    chars.forEach(function(ch) {
      var cp=Math.min(1,Math.max(0,(t-ch.d)/0.7));
      if(cp<=0) return;
      var cx=W*ch.x, cy=H*0.52;

      var spot=ctx.createRadialGradient(cx,cy,0,cx,cy,145);
      spot.addColorStop(0,'rgba('+_hrgb(ch.color)+','+cp*0.22+')');
      spot.addColorStop(0.55,'rgba('+_hrgb(ch.color)+','+cp*0.07+')');
      spot.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=spot; ctx.beginPath(); ctx.arc(cx,cy,145,0,Math.PI*2); ctx.fill();

      var slideY=(1-cp)*H*0.28;
      ctx.save(); ctx.translate(cx,cy+slideY); ctx.globalAlpha=cp;
      _chibi(ctx, ch.color, 0, 0, 58+cp*4);
      ctx.restore();

      if(cp>0.5) {
        var ta=(cp-0.5)*2;
        ctx.save(); ctx.globalAlpha=ta;
        ctx.fillStyle=ch.color; ctx.font='bold 14px sans-serif'; ctx.textAlign='center';
        ctx.fillText(ch.name,cx,cy+85+slideY);
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px sans-serif';
        ctx.fillText(ch.role,cx,cy+100+slideY);
        ctx.restore();
      }
    });

    _text('CONHEÇA SEU TIME', W/2, H*0.1, Math.min(1,t*2)*(1-Math.max(0,(t-5)*3)), 28,'#fff',true);
    _letterbox();
  }

  /* =========================================================
     CENA 5: MISSÕES — flash rápido
  ========================================================= */
  function _sceneMissions(t, dur) {
    var missions=[
      {title:'CHEGADA À FAZENDA',       color:'#4a9c20',bg:'#091808',icon:'🌱'},
      {title:'PRAGAS NOTURNAS',         color:'#4040cc',bg:'#050515',icon:'🔦'},
      {title:'INTERCEPTAR AGROTÓXICOS', color:'#dd3030',bg:'#1a0505',icon:'⚡'},
      {title:'AMOSTRAS TÓXICAS',        color:'#cc8800',bg:'#180e00',icon:'🧪'},
      {title:'PLANTIO DE REMEDIAÇÃO',   color:'#20aa40',bg:'#041208',icon:'🌿'},
      {title:'INSPEÇÃO COM DRONE',      color:'#2080cc',bg:'#040c14',icon:'🚁'}
    ];
    var seg=dur/missions.length;
    var mi=Math.min(missions.length-1,Math.floor(t/seg));
    var m=missions[mi];
    var mp=(t-mi*seg)/seg;

    // Flash ao trocar
    if(mp<0.18) {
      ctx.fillStyle='#ffffff'; ctx.globalAlpha=1-mp/0.18;
      ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
    }

    ctx.fillStyle=m.bg; ctx.fillRect(0,0,W,H);

    ctx.save(); ctx.globalAlpha=0.07; ctx.strokeStyle=m.color; ctx.lineWidth=28;
    for(var si=0;si<22;si++){ctx.beginPath();ctx.moveTo(si*110-500,0);ctx.lineTo(si*110+200,H);ctx.stroke();}
    ctx.restore();

    var na=Math.min(1,(mp-0.18)*5);
    ctx.save(); ctx.globalAlpha=na*0.1;
    ctx.font='bold 380px sans-serif'; ctx.fillStyle=m.color; ctx.textAlign='center';
    ctx.fillText(''+(mi+1),W/2+20,H*0.74); ctx.restore();

    ctx.save(); ctx.globalAlpha=na;
    ctx.font=(78+(1-mp)*18)+'px sans-serif'; ctx.textAlign='center';
    ctx.fillText(m.icon,W*0.2,H*0.56); ctx.restore();

    if(mp>0.22) {
      var ta=Math.min(1,(mp-0.22)*3);
      var slX=(1-ta)*55;
      ctx.save(); ctx.globalAlpha=ta;
      ctx.fillStyle=m.color; ctx.font='bold 36px sans-serif'; ctx.textAlign='center';
      ctx.fillText('MISSÃO '+(mi+1),W/2+slX,H*0.42);
      ctx.fillStyle='#fff'; ctx.font='21px sans-serif';
      ctx.fillText(m.title,W/2+slX,H*0.50); ctx.restore();
    }

    ctx.save();
    for(var di=0;di<missions.length;di++){
      var dot=di===mi;
      ctx.globalAlpha=dot?1:0.28;
      ctx.fillStyle=dot?m.color:'#fff';
      ctx.beginPath(); ctx.arc(W/2+(di-missions.length/2+0.5)*22,H*0.88,dot?6:4,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    _letterbox();
  }

  /* =========================================================
     CENA 6: TÍTULO ÉPICO
  ========================================================= */
  function _sceneEpicTitle(t, dur) {
    var prog=t/dur;

    var bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#040d02'); bg.addColorStop(0.45,'#091a06'); bg.addColorStop(1,'#152e0a');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Fileiras de lavoura no fundo
    ctx.save();
    for(var r=0;r<32;r++){
      var rF=r/31, ry=H*0.64+rF*H*0.36;
      var rW=W*(0.08+rF*0.92);
      ctx.globalAlpha=0.28*(1-rF);
      ctx.fillStyle=r%2===0?'#3a7810':'#2a5c08';
      ctx.fillRect((W-rW)/2,ry,rW,H*0.011);
    }
    ctx.restore();

    // Coluna de luz central
    var cg=ctx.createLinearGradient(W/2-180,0,W/2+180,0);
    cg.addColorStop(0,'rgba(0,0,0,0)');
    cg.addColorStop(0.5,'rgba(70,170,35,0.07)');
    cg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cg; ctx.fillRect(0,0,W,H);

    // Explosão de partículas (início)
    if(t<2.2){
      var bp=t/2.2; ctx.save();
      for(var pi=0;pi<65;pi++){
        var pa=(pi/65)*Math.PI*2;
        var pr=bp*(130+Math.sin(pi*7.3)*75);
        var px2=W/2+Math.cos(pa)*pr, py2=H*0.40+Math.sin(pa)*pr*0.55;
        ctx.globalAlpha=(1-bp)*0.75;
        ctx.fillStyle=pi%3===0?'#f5c518':pi%3===1?'#4db86a':'#ffffff';
        ctx.beginPath(); ctx.arc(px2,py2,1.8+Math.sin(pi)*1.2,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // Logo principal
    var la=Math.min(1,t*1.8), ls=0.55+_easeOut(Math.min(1,t*2.2))*0.45;
    ctx.save(); ctx.globalAlpha=la; ctx.translate(W/2,H*0.37); ctx.scale(ls,ls);

    // Sombra
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.font='bold 90px sans-serif'; ctx.textAlign='center';
    ctx.fillText('AGRO FORTE',4,4);

    // Gradiente do logo
    var tg=ctx.createLinearGradient(-310,-42,310,42);
    tg.addColorStop(0,  '#4db86a'); tg.addColorStop(0.4,'#7de89a');
    tg.addColorStop(0.5,'#f5c518'); tg.addColorStop(0.6,'#e8a820');
    tg.addColorStop(1,  '#4db86a');
    ctx.fillStyle=tg; ctx.fillText('AGRO FORTE',0,0);

    // Brilho varrendo
    var shX=((t*0.38)%1.6-0.3)*680;
    var shg=ctx.createLinearGradient(shX-65,0,shX+65,0);
    shg.addColorStop(0,'rgba(255,255,255,0)');
    shg.addColorStop(0.5,'rgba(255,255,255,0.22)');
    shg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=shg; ctx.fillText('AGRO FORTE',0,0);
    ctx.restore();

    // Subtítulo
    if(t>0.9){
      var sta=Math.min(1,(t-0.9)*1.6);
      ctx.save(); ctx.globalAlpha=sta*0.65;
      ctx.fillStyle='#fff'; ctx.font='15px sans-serif'; ctx.textAlign='center';
      ctx.fillText('JOGO AGRINHO 2026 — Subcategoria 3 — HTML/CSS/JS',W/2,H*0.37+64);
      ctx.restore();
    }

    // Selo Agrinho
    if(t>1.6){
      var ba=Math.min(1,(t-1.6)*2.2);
      ctx.save(); ctx.globalAlpha=ba; ctx.translate(W/2,H*0.535);
      var bgr=ctx.createRadialGradient(0,0,18,0,0,56);
      bgr.addColorStop(0,'#1a8c38'); bgr.addColorStop(1,'#0a4e1e');
      ctx.fillStyle=bgr; ctx.beginPath(); ctx.arc(0,0,56,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#f5c518'; ctx.lineWidth=3; ctx.stroke();
      ctx.fillStyle='#f5c518'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
      ctx.fillText('AGRINHO',0,-7); ctx.fillText('2026',0,8);
      ctx.font='20px sans-serif'; ctx.fillText('🌾',0,28);
      ctx.restore();
    }

    // Personagens
    if(t>2.2){
      var ca=Math.min(1,(t-2.2)*1.6);
      var colors=['#e8a830','#5dde80','#60aaff','#ff90a0','#ffe060'];
      colors.forEach(function(col,ci){
        var cx=W*(0.27+ci*0.115), cy=H*0.80;
        var su=(1-Math.min(1,(t-2.2-ci*0.12)*2.2))*38;
        ctx.save(); ctx.globalAlpha=ca;
        ctx.translate(cx,cy+su); _chibi(ctx,col,0,0,38); ctx.restore();
      });
    }

    // CTA
    if(t>3.2){
      var cta=Math.min(1,(t-3.2)*2), pulse=1+Math.sin(t*2.8)*0.035;
      ctx.save(); ctx.globalAlpha=cta; ctx.translate(W/2,H*0.935); ctx.scale(pulse,pulse);
      var bW=228,bH=50;
      var bg2=ctx.createLinearGradient(-bW/2,-bH/2,bW/2,bH/2);
      bg2.addColorStop(0,'#2d8c45'); bg2.addColorStop(1,'#1a5c2a');
      ctx.fillStyle=bg2;
      _rrect(ctx,-bW/2,-bH/2,bW,bH,25);
      ctx.strokeStyle='#4db86a'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center';
      ctx.fillText('▶  JOGAR AGORA',0,7);
      ctx.restore();
    }
    _letterbox();
  }

  /* =========================================================
     UTILITÁRIOS
  ========================================================= */
  function _tractorSil(x,y,scale){
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
    ctx.fillStyle='rgba(0,0,0,0.82)';
    ctx.fillRect(-54,-42,80,38); ctx.fillRect(-30,-58,38,20);
    ctx.beginPath(); ctx.arc(-35,0,19,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(22,0,13,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function _chibi(c2, color, x, y, s){
    c2.fillStyle='#f0c090';
    c2.beginPath(); c2.arc(x,y-s*0.72,s*0.27,0,Math.PI*2); c2.fill();
    c2.fillStyle=color;
    c2.beginPath(); c2.arc(x,y-s*0.82,s*0.25,Math.PI,Math.PI*2); c2.fill();
    c2.fillRect(x-s*0.30,y-s*0.82,s*0.60,s*0.06);
    c2.fillRect(x-s*0.20,y-s*0.44,s*0.40,s*0.40);
    c2.fillStyle='#3a3060';
    c2.fillRect(x-s*0.18,y-s*0.04,s*0.16,s*0.28);
    c2.fillRect(x+s*0.02,y-s*0.04,s*0.16,s*0.28);
    c2.fillStyle='#1a1010';
    c2.fillRect(x-s*0.22,y+s*0.22,s*0.20,s*0.10);
    c2.fillRect(x+s*0.02,y+s*0.22,s*0.20,s*0.10);
    c2.fillStyle=color;
    c2.fillRect(x-s*0.38,y-s*0.40,s*0.17,s*0.30);
    c2.fillRect(x+s*0.21,y-s*0.40,s*0.17,s*0.30);
    c2.fillStyle='#200808';
    c2.beginPath(); c2.arc(x-s*0.10,y-s*0.74,s*0.038,0,Math.PI*2); c2.fill();
    c2.beginPath(); c2.arc(x+s*0.10,y-s*0.74,s*0.038,0,Math.PI*2); c2.fill();
    c2.strokeStyle='#9a4020'; c2.lineWidth=1.4;
    c2.beginPath(); c2.arc(x,y-s*0.665,s*0.09,0.18,Math.PI-0.18); c2.stroke();
  }

  function _text(txt,x,y,a,sz,col,shadow){
    ctx.save(); ctx.globalAlpha=a;
    if(shadow){ctx.fillStyle='rgba(0,0,0,0.65)';ctx.font='bold '+sz+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x+2,y+2);}
    ctx.fillStyle=col; ctx.font='bold '+sz+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(txt,x,y); ctx.restore();
  }

  function _letterbox(){
    var lb=Math.floor(H*0.075);
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,W,lb);
    ctx.fillRect(0,H-lb,W,lb);
  }

  function _rrect(c,x,y,w,h,r){
    c.beginPath(); c.moveTo(x+r,y);
    c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
    c.closePath(); c.fill();
  }

  function _lerpColor(c1,c2,t){
    var r1=parseInt(c1.slice(1,3),16),g1=parseInt(c1.slice(3,5),16),b1=parseInt(c1.slice(5,7),16);
    var r2=parseInt(c2.slice(1,3),16),g2=parseInt(c2.slice(3,5),16),b2=parseInt(c2.slice(5,7),16);
    return 'rgb('+Math.round(r1+(r2-r1)*t)+','+Math.round(g1+(g2-g1)*t)+','+Math.round(b1+(b2-b1)*t)+')';
  }

  function _hrgb(hex){
    return parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+parseInt(hex.slice(5,7),16);
  }

  function _easeInOut(t){return t<0.5?2*t*t:1-2*(1-t)*(1-t);}
  function _easeOut(t){return 1-(1-t)*(1-t);}

  /* =========================================================
     MÚSICA PROCEDURAL — Folk / Rural
  ========================================================= */
  function _startMusic(){
    try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
    var master=audioCtx.createGain();
    master.gain.setValueAtTime(0,audioCtx.currentTime);
    master.gain.linearRampToValueAtTime(0.65,audioCtx.currentTime+2.8);
    master.gain.setValueAtTime(0.65,audioCtx.currentTime+DURATION-3.5);
    master.gain.linearRampToValueAtTime(0,audioCtx.currentTime+DURATION);
    master.connect(audioCtx.destination);
    audioNodes.push(master);

    var rev=_reverb(audioCtx,2.0);
    var BPM=74, beat=60/BPM;
    var t0=audioCtx.currentTime+1.2;

    // Melodia — Ré maior pentatônico
    var scale=[293.66,329.63,369.99,415.30,440,493.88,554.37,587.33];
    var mel=[5,3,2,0,3,5,6,5,3,2,0,2,3,5,6,5,3,2,0,3,2,0,5,3,2,0];
    var durs=[1,.5,.5,1,.5,.5,1,1,.5,.5,1,.5,.5,1,.5,.5,1,.5,1,.5,.5,1,1,.5,.5,2];
    var mv=audioCtx.createGain(); mv.gain.value=0.17; mv.connect(rev); mv.connect(master);

    for(var rep=0;rep<3;rep++){
      var mt=t0+rep*beat*18;
      for(var ni=0;ni<mel.length;ni++){
        var o=audioCtx.createOscillator(); o.type='triangle';
        o.frequency.value=scale[mel[ni]];
        var g=audioCtx.createGain();
        g.gain.setValueAtTime(0,mt); g.gain.linearRampToValueAtTime(0.75,mt+0.045);
        g.gain.exponentialRampToValueAtTime(0.001,mt+durs[ni]*beat*0.88);
        o.connect(g); g.connect(mv); o.start(mt); o.stop(mt+durs[ni]*beat);
        mt+=durs[ni]*beat; audioNodes.push(o);
      }
    }

    // Baixo
    var bass=[146.83,164.81,185,220,146.83,146.83,164.81,185];
    var bv=audioCtx.createGain(); bv.gain.value=0.13; bv.connect(master);
    for(var rep2=0;rep2<6;rep2++){
      for(var bi=0;bi<bass.length;bi++){
        var bt=t0+rep2*beat*8+bi*beat;
        var bo=audioCtx.createOscillator(); bo.type='sine'; bo.frequency.value=bass[bi];
        var bg=audioCtx.createGain();
        bg.gain.setValueAtTime(0,bt); bg.gain.linearRampToValueAtTime(0.55,bt+0.06);
        bg.gain.exponentialRampToValueAtTime(0.001,bt+beat*0.78);
        bo.connect(bg); bg.connect(bv); bo.start(bt); bo.stop(bt+beat); audioNodes.push(bo);
      }
    }

    // Acordes pad
    var chords=[[293.66,369.99,440],[329.63,415.30,493.88],[369.99,440,554.37],[293.66,369.99,440]];
    var pv=audioCtx.createGain(); pv.gain.value=0.055; pv.connect(rev);
    for(var ci=0;ci<chords.length*5;ci++){
      chords[ci%chords.length].forEach(function(freq){
        var ct=t0+ci*beat*4;
        var co=audioCtx.createOscillator(); co.type='sawtooth'; co.frequency.value=freq;
        var cg=audioCtx.createGain();
        cg.gain.setValueAtTime(0,ct); cg.gain.linearRampToValueAtTime(0.25,ct+0.35);
        cg.gain.setValueAtTime(0.25,ct+beat*3.4); cg.gain.linearRampToValueAtTime(0,ct+beat*4);
        co.connect(cg); cg.connect(pv); co.start(ct); co.stop(ct+beat*4); audioNodes.push(co);
      });
    }

    // Percussão
    var beats=Math.floor(DURATION/beat);
    for(var pi=0;pi<beats;pi++){
      var pt=t0+pi*beat;
      if(pi%4===0||pi%4===2){
        var kBuf=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*0.25),audioCtx.sampleRate);
        var kd=kBuf.getChannelData(0);
        for(var ki=0;ki<kd.length;ki++) kd[ki]=Math.sin(ki*80*Math.PI*2/audioCtx.sampleRate)*Math.exp(-ki*25/audioCtx.sampleRate);
        var ks=audioCtx.createBufferSource(); ks.buffer=kBuf;
        var kg=audioCtx.createGain(); kg.gain.value=0.22;
        ks.connect(kg); kg.connect(master); ks.start(pt); audioNodes.push(ks);
      }
      var hBuf=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*0.045),audioCtx.sampleRate);
      var hd=hBuf.getChannelData(0);
      for(var hi=0;hi<hd.length;hi++) hd[hi]=(Math.random()*2-1)*Math.exp(-hi*55/audioCtx.sampleRate);
      var hs=audioCtx.createBufferSource(); hs.buffer=hBuf;
      var hg=audioCtx.createGain(); hg.gain.value=0.07;
      hs.connect(hg); hg.connect(master); hs.start(pt); audioNodes.push(hs);
    }
  }

  function _reverb(ac,dur){
    var len=Math.floor(ac.sampleRate*dur);
    var buf=ac.createBuffer(2,len,ac.sampleRate);
    for(var ch=0;ch<2;ch++){var d=buf.getChannelData(ch);for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);}
    var cv=ac.createConvolver(); cv.buffer=buf;
    var g=ac.createGain(); g.gain.value=0.22; cv.connect(g); g.connect(ac.destination); return cv;
  }
})();

                  /* ============================================================
   AGRO FORTE - Motor de Raycasting FPS com Terreno
   Relevo real, fileiras de plantação, céu volumétrico
   ============================================================ */

var Engine = (function() {

  var canvas, ctx, W, H;
  var player = { x:4.5, y:4.5, angle:0, z:0 };
  var running = false, crouching = false;
  var keys = {};
  var mouseDX = 0, mouseSens = 0.003, locked = false;
  var animFrame = null, lastTime = 0;
  var onInteract = null, onBoundary = null;
  var nearObject = null, nearVehicle = null, inVehicle = false;
  var bobTimer = 0, bobY = 0;

  // World
  var MAP_W = 64, MAP_H = 64;
  var wallMap = [];    // 0=open, 1..N=wall type
  var heightMap = [];  // 0..1 floor height (for hills)
  var cropMap = [];    // crop type per cell
  var objects = [];    // interactive objects
  var spriteList = []; // trees, NPCs, vehicles

  var missionTimer = -1, timerCb = null;
  var renderQuality = 1; // ray step: 1=high, 2=med, 3=low
  var fogStart = 6, fogEnd = 18;
  var timeOfDay = 0.65; // 0=midnight, 1=noon
  var weather = 'clear';
  var cloudOffsetX = 0;

  // Textures
  var TEX = {}, TEX_DATA = {};

  // ============================================================
  function init(c, opts) {
    canvas = c; ctx = c.getContext('2d');
    opts = opts || {};
    onInteract  = opts.onInteract  || function(){};
    onBoundary  = opts.onBoundary  || function(){};
    renderQuality = opts.quality === 'high' ? 1 : opts.quality === 'low' ? 3 : 2;
    mouseSens = (opts.mouseSens || 5) * 0.00055;
    _buildTextures();
    _bindInput();
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || 800;
    H = canvas.height = canvas.offsetHeight || 600;
  }

  // ============================================================
  // TEXTURE GENERATION (procedural 64x64)
  // ============================================================
  function _buildTextures() {
    var defs = {
      wall:  _texBrick,
      barn:  _texBarn,
      wood:  _texWood,
      fence: _texFence,
      grain: _texGrain,
      silo:  _texSilo,
      floor_grass: _texGrass,
      floor_dirt:  _texDirt,
      floor_crop:  _texCrop
    };
    Object.keys(defs).forEach(function(k) {
      var tc = document.createElement('canvas'); tc.width = tc.height = 64;
      var tcx = tc.getContext('2d'); defs[k](tcx); TEX[k] = tc;
      TEX_DATA[k] = tcx.getImageData(0, 0, 64, 64).data;
    });
  }
  function _texBrick(c) {
    c.fillStyle='#c4a060'; c.fillRect(0,0,64,64);
    for(var row=0;row<9;row++) { var off=(row%2)*17;
      for(var col=-1;col<5;col++) {
        c.fillStyle='#a07040'; c.fillRect(col*17+off+1,row*8+1,15,6);
        c.fillStyle='#d4b070'; c.fillRect(col*17+off+2,row*8+2,12,3);
      }
    }
  }
  function _texBarn(c) {
    c.fillStyle='#9a1810'; c.fillRect(0,0,64,64);
    for(var i=0;i<8;i++){c.fillStyle=i%2?'#7a1008':'#b03020'; c.fillRect(0,i*8,64,5);}
    c.fillStyle='#fff5'; c.fillRect(28,0,8,64);
  }
  function _texWood(c) {
    c.fillStyle='#7a5030'; c.fillRect(0,0,64,64);
    for(var i=0;i<9;i++){c.fillStyle='rgba(0,0,0,0.12)'; c.fillRect(0,i*7,64,2);}
    c.fillStyle='rgba(255,255,255,0.06)'; c.fillRect(4,0,3,64);
  }
  function _texFence(c) {
    c.fillStyle='#8a6030'; c.fillRect(0,0,64,64);
    c.fillStyle='#6a4020';
    for(var i=0;i<4;i++) c.fillRect(i*18,0,7,64);
    c.fillRect(0,14,64,6); c.fillRect(0,40,64,6);
  }
  function _texGrain(c) {
    c.fillStyle='#d4b050'; c.fillRect(0,0,64,64);
    c.fillStyle='#b09030';
    for(var i=0;i<10;i++) for(var j=0;j<10;j++) if((i+j)%2) c.fillRect(i*7,j*7,6,6);
  }
  function _texSilo(c) {
    var g=c.createLinearGradient(0,0,64,0);
    g.addColorStop(0,'#888'); g.addColorStop(0.5,'#ccc'); g.addColorStop(1,'#888');
    c.fillStyle=g; c.fillRect(0,0,64,64);
    c.fillStyle='rgba(0,0,0,0.15)';
    for(var i=0;i<8;i++) c.fillRect(0,i*8,64,1);
  }
  function _texGrass(c) {
    c.fillStyle='#3a7020'; c.fillRect(0,0,64,64);
    for(var i=0;i<60;i++) {
      c.fillStyle=Math.random()>.5?'#2a6010':'#4a8030';
      var x=Math.random()*62,y=Math.random()*62;
      c.fillRect(x,y,2,4); c.fillRect(x+1,y-2,1,3);
    }
  }
  function _texDirt(c) {
    c.fillStyle='#7a5030'; c.fillRect(0,0,64,64);
    for(var i=0;i<30;i++){c.fillStyle='rgba(0,0,0,0.1)'; c.beginPath(); c.arc(Math.random()*64,Math.random()*64,Math.random()*4+1,0,Math.PI*2); c.fill();}
  }
  function _texCrop(c) {
    c.fillStyle='#5a7a20'; c.fillRect(0,0,64,64);
    c.fillStyle='#3a5a10';
    for(var i=0;i<5;i++) c.fillRect(i*14,0,4,64);
    c.fillStyle='#8aa030';
    for(var i=0;i<5;i++) for(var j=0;j<8;j++) c.fillRect(i*14+1,j*9,2,7);
  }

  // ============================================================
  // MAP GENERATION WITH TERRAIN
  // ============================================================
  function generateMap(missionId) {
    wallMap=[]; heightMap=[]; cropMap=[]; objects=[]; spriteList=[];
    // Init flat
    for(var y=0;y<MAP_H;y++){
      wallMap[y]=[]; heightMap[y]=[]; cropMap[y]=[];
      for(var x=0;x<MAP_W;x++){
        wallMap[y][x]  = (x===0||y===0||x===MAP_W-1||y===MAP_H-1) ? 1 : 0;
        heightMap[y][x] = 0;
        cropMap[y][x]  = 0;
      }
    }

    // ---- TERRAIN HILLS via smooth noise ----
    _generateHills();

    // ---- MISSION LAYOUT ----
    var configs = {
      1:  {timeOfDay:.65, weather:'clear',  fn:_map1  },
      2:  {timeOfDay:.02, weather:'fog',    fn:_map2  },
      3:  {timeOfDay:.55, weather:'clear',  fn:_map3  },
      4:  {timeOfDay:.45, weather:'rain',   fn:_map4  },
      5:  {timeOfDay:.6,  weather:'clear',  fn:_map5  },
      6:  {timeOfDay:.75, weather:'clear',  fn:_map6  },
      7:  {timeOfDay:.5,  weather:'clear',  fn:_map7  },
      8:  {timeOfDay:.6,  weather:'clear',  fn:_map8  },
      9:  {timeOfDay:.7,  weather:'clear',  fn:_map9  },
      10: {timeOfDay:.65, weather:'clear',  fn:_map10 }
    };
    var cfg = configs[missionId] || configs[1];
    timeOfDay = cfg.timeOfDay; weather = cfg.weather;
    cfg.fn();

    // ---- TREES scattered (avoid walls and objects) ----
    _scatterTrees(20 + missionId * 2);

    // Reset player
    player.x=4.5; player.y=4.5; player.angle=0; player.z=0;
    inVehicle=false; missionTimer=-1;
  }

  // Smooth hill generation — 4-octave noise, stronger amplitude
  function _generateHills() {
    var sc = 0.10;
    for(var y=1;y<MAP_H-1;y++) {
      for(var x=1;x<MAP_W-1;x++) {
        var nx=x*sc, ny=y*sc;
        // 4 octaves for varied terrain
        var v = Math.sin(nx*1.1)*Math.cos(ny*0.85)*0.50 +
                Math.sin(nx*2.6+0.7)*Math.cos(ny*2.0)*0.28 +
                Math.sin(nx*5.0+1.3)*Math.cos(ny*4.5)*0.14 +
                Math.sin(nx*10.2+2.1)*Math.cos(ny*9.3)*0.08;
        // Ridged: push peaks higher
        var n = (v+1)*0.5; // 0..1
        // Sharpen with power curve for more dramatic hills
        heightMap[y][x] = Math.pow(n, 0.7);
      }
    }
  }

  // Add a rectangle of crop rows
  function _cropField(x0, y0, w, h, cropType) {
    for(var y=y0;y<y0+h;y++) {
      for(var x=x0;x<x0+w;x++) {
        if(x>0&&y>0&&x<MAP_W-1&&y<MAP_H-1&&wallMap[y][x]===0) {
          cropMap[y][x] = cropType; // 1=corn,2=soy,3=wheat,4=coffee,5=cotton
        }
      }
    }
  }

  function _building(x,y,w,h,texId) {
    for(var dy=0;dy<h;dy++) for(var dx=0;dx<w;dx++) {
      if(dy===0||dy===h-1||dx===0||dx===w-1) {
        if(dy===h-1&&dx>0&&dx<w-1) continue; // entrance gap
        if(x+dx>0&&y+dy>0&&x+dx<MAP_W-1&&y+dy<MAP_H-1)
          wallMap[y+dy][x+dx]=texId;
      }
    }
  }

  function _fence(x,y,len,dir) {
    for(var i=0;i<len;i++) {
      var fx=x+(dir===0?i:0), fy=y+(dir===1?i:0);
      if(fx>0&&fy>0&&fx<MAP_W-1&&fy<MAP_H-1) wallMap[fy][fx]=4;
    }
  }

  function _obj(type,x,y,id,extra) { objects.push({type:type,x:x+.5,y:y+.5,id:id,done:false,extra:extra||{}}); }
  function _npc(charId,x,y,dir)    { spriteList.push({type:'npc',charId:charId,x:x+.5,y:y+.5,dir:dir||0}); }
  function _vehicle(vt,x,y)        { spriteList.push({type:'vehicle',vehicleType:vt,x:x+.5,y:y+.5}); }

  // ============================================================
  // PLANTATION MAP — full farm world for FPS plantation mode
  // ============================================================
  function generatePlantationMap(opts) {
    opts = opts || {};
    wallMap=[]; heightMap=[]; cropMap=[]; objects=[]; spriteList=[];
    var MW=48, MH=48;
    MAP_W=MW; MAP_H=MH;

    for(var y=0;y<MH;y++){
      wallMap[y]=[]; heightMap[y]=[]; cropMap[y]=[];
      for(var x=0;x<MW;x++){
        wallMap[y][x]=(x===0||y===0||x===MW-1||y===MH-1)?1:0;
        heightMap[y][x]=0;
        cropMap[y][x]=0;
      }
    }

    // Gentle terrain (farm land = mostly flat with slight variation)
    var sc=0.08;
    for(var y=1;y<MH-1;y++) for(var x=1;x<MW-1;x++){
      var v=Math.sin(x*sc)*Math.cos(y*sc)*0.18+Math.sin(x*sc*2.3)*Math.cos(y*sc*1.7)*0.09;
      heightMap[y][x]=Math.max(0,(v+0.3)*0.5);
    }

    // ---- Road (horizontal, y=8-9) ----
    for(var x=0;x<MW;x++) { heightMap[8][x]=0.05; heightMap[9][x]=0.05; }

    // ---- Farm fence boundary ----
    var FX=4,FY=12,FC=14,FR=14;
    for(var x=FX;x<=FX+FC;x++) { wallMap[FY-1][x]=4; wallMap[FY+FR][x]=4; }
    for(var y=FY-1;y<=FY+FR;y++) { wallMap[y][FX-1]=4; wallMap[y][FX+FC+1]=4; }
    wallMap[FY+FR][FX+FC/2]=0; wallMap[FY+FR][FX+FC/2+1]=0; // entrance

    // ---- Crop fields (inside fence) ----
    for(var r=0;r<FR;r++) for(var c=0;c<FC;c++){
      if(opts.farmGrid&&opts.farmGrid[r]&&opts.farmGrid[r][c]){
        var cell=opts.farmGrid[r][c];
        if(cell.seed) cropMap[FY+r][FX+c]=(cell.seed==='corn'?1:cell.seed==='soy'?2:cell.seed==='wheat'?3:cell.seed==='coffee'?4:5);
      }
    }

    // ---- Bus stop (east, row 8) ----
    wallMap[7][MW-5]=5; wallMap[8][MW-5]=5; wallMap[9][MW-5]=5;
    objects.push({type:'bus_stop',x:MW-4.5,y:8.5,id:'bus',done:false,extra:{}});

    // ---- Government office (north, row 3-7) ----
    _buildingInMap(MW-12,3,7,5,6);
    wallMap[7][MW-10]=0; wallMap[7][MW-9]=0; // entrance
    objects.push({type:'gov_office',x:MW-8.5,y:5.5,id:'gov',done:false,extra:{}});

    // ---- Market (west, row 3-7) ----
    _buildingInMap(2,3,7,5,2);
    wallMap[7][5]=0; wallMap[7][6]=0;
    objects.push({type:'market',x:5.5,y:5.5,id:'market',done:false,extra:{}});

    // ---- Player house (if built, opts.buildings) ----
    if(opts.buildings) {
      opts.buildings.forEach(function(b){
        _buildingInMap(b.x,b.y,b.w,b.h,b.texId||1);
      });
    }

    // ---- Documents scattered ----
    if(!opts.hasPermit){
      objects.push({type:'document',x:12.5,y:20.5,id:'doc0',done:false,extra:{}});
      objects.push({type:'document',x:30.5,y:15.5,id:'doc1',done:false,extra:{}});
      objects.push({type:'document',x:7.5,y:30.5,id:'doc2',done:false,extra:{}});
    }

    // ---- Order board near market ----
    objects.push({type:'order_board',x:5.5,y:8.5,id:'orders',done:false,extra:{}});

    // ---- Vehicles ----
    spriteList.push({type:'vehicle',vehicleType:'tractor',x:FX+FC/2+.5,y:FY+FR+3});
    spriteList.push({type:'vehicle',vehicleType:'harvester',x:FX+FC/2+3.5,y:FY+FR+3});

    // ---- Trees along road ----
    for(var i=1;i<6;i++){
      spriteList.push({type:'tree',x:i*7+.5,y:7.5});
      spriteList.push({type:'tree',x:i*7+.5,y:10.5});
    }

    timeOfDay=0.65; weather='clear';
    player.x=FX+FC/2+.5; player.y=FY+FR+5; player.angle=-Math.PI/2;
    inVehicle=false;
    return {farmX:FX, farmY:FY, farmCols:FC, farmRows:FR};
  }

  function _buildingInMap(x,y,w,h,texId){
    for(var dy=0;dy<h;dy++) for(var dx=0;dx<w;dx++){
      if(dy===0||dy===h-1||dx===0||dx===w-1){
        if(dy===h-1&&dx>0&&dx<w-1) continue;
        if(x+dx>0&&y+dy>0&&x+dx<MAP_W-1&&y+dy<MAP_H-1) wallMap[y+dy][x+dx]=texId;
      }
    }
  }

  // ---- MISSION MAPS ----
  function _map1() { // Chegada
    _building(8,6,8,6,1); _building(20,5,14,10,2); // casa+celeiro
    _fence(5,15,35,0); _fence(5,15,20,1); _fence(40,15,20,1); _fence(5,35,35,0);
    _cropField(6,17,15,12,1); // milho
    _cropField(22,17,15,12,3); // trigo
    for(var i=0;i<5;i++) _obj('soil', 8+i*4, 20, i);
    _npc('juca',12,9,0); _npc('marina',10,16,0);
    _vehicle('tractor',20,12);
    player.x=6; player.y=17;
  }
  function _map2() { // Pragas noturno
    _cropField(8,8,30,20,3); // trigo
    for(var i=0;i<8;i++){
      _obj('pest', 10+Math.floor(i*3.8), 10+Math.floor(i*2.5), i);
    }
    _npc('pedro',10,8,0);
    player.x=6; player.y=6;
  }
  function _map3() { // Agrotóxicos
    // Estrada
    for(var i=0;i<50;i++) { wallMap[10][6+i]=0; wallMap[11][6+i]=0; }
    _building(30,13,10,8,1);
    _cropField(8,15,20,15,2); // soja
    for(var i=0;i<5;i++) _obj('bomb', 10+i*9, 10, i);
    _vehicle('truck',7,10); _npc('tonho',8,13,0);
    missionTimer=240;
    player.x=5; player.y=10;
  }
  function _map4() { // Amostras / rain
    _cropField(10,10,25,20,2);
    for(var i=0;i<6;i++) _obj('sample', 12+i*4, 14+i%3*5, i);
    for(var i=0;i<5;i++) { // puddles — marcados diferente (avoid=true)
      var po = {type:'puddle',x:15+i*3+.5,y:20+i%2*3+.5,id:100+i,done:false,extra:{avoid:true}};
      objects.push(po);
    }
    _npc('marina',11,9,0); _npc('lena',13,9,1);
    player.x=6; player.y=8;
  }
  function _map5() { // Plantio remediação
    _cropField(6,10,30,20,4); // café — campo para plantar
    for(var i=0;i<7;i++) _obj('plant_spot', 8+i*4, 14+(i%2)*4, i);
    _vehicle('planter',6,12); _npc('lena',6,10,0); _npc('joao',8,10,0);
    player.x=4; player.y=10;
  }
  function _map6() { // Drone
    _cropField(5,5,50,50,1);
    _obj('drone_start',20,20,0);
    for(var i=0;i<5;i++){
      var a=(i/5)*Math.PI*2;
      _obj('certify_point', Math.round(25+Math.cos(a)*12), Math.round(25+Math.sin(a)*12), i+1);
    }
    _npc('drCosta',20,22,0);
    player.x=18; player.y=18;
  }
  function _map7() { // Nascentes
    // Riachos
    for(var j=0;j<3;j++) {
      var sy=18+j*10;
      for(var i=10;i<40;i++) { wallMap[sy][i]=5; wallMap[sy+1][i]=5; }
      _obj('spring',14+j*12,sy,j);
    }
    _cropField(5,5,40,12,3);
    _npc('pedro',15,15,0);
    player.x=6; player.y=8;
  }
  function _map8() { // Compostagem
    _building(8,6,6,6,2); _building(40,28,8,8,1);
    _cropField(6,15,30,15,5); // algodão
    for(var i=0;i<8;i++) _obj('waste', 10+i*4+Math.floor(i/2)*2, 18+(i%3)*4, i);
    _obj('compost_site',44,32,99);
    _vehicle('tractor',8,15); _npc('dona',9,8,0); _npc('biu',12,8,0);
    player.x=6; player.y=12;
  }
  function _map9() { // Joaninhas
    _cropField(5,5,50,50,2);
    for(var i=0;i<10;i++){
      var a=(i/10)*Math.PI*2, r=18;
      _obj('bug_point', Math.round(28+Math.cos(a)*r), Math.round(28+Math.sin(a)*r), i);
    }
    _npc('pedro',28,28,0); _npc('lena',30,28,0);
    player.x=26; player.y=26;
  }
  function _map10() { // Feira
    _building(5,5,10,8,1); // armazém
    for(var i=0;i<5;i++) _building(18+i*9,12,7,6,3); // tendas
    _cropField(5,16,55,25,3);
    _obj('products',8,8,0);
    _obj('fair_gate',48,22,1);
    _vehicle('truck',6,12);
    _npc('ana',22,18,0); _npc('clara',28,18,0); _npc('juca',6,7,0);
    player.x=4; player.y=10;
  }

  function _scatterTrees(n) {
    var tried=0;
    while(n>0&&tried<500) {
      tried++;
      var tx=2+Math.floor(Math.random()*(MAP_W-4));
      var ty=2+Math.floor(Math.random()*(MAP_H-4));
      if(wallMap[ty][tx]!==0) continue;
      if(_nearObj(tx+.5,ty+.5,3)) continue;
      spriteList.push({type:'tree',x:tx+.5,y:ty+.5,size:0.8+Math.random()*0.4});
      n--;
    }
  }

  function _nearObj(x,y,r) {
    for(var i=0;i<objects.length;i++){
      var o=objects[i];
      if(Math.hypot(o.x-x,o.y-y)<r) return true;
    }
    for(var i=0;i<spriteList.length;i++){
      var s=spriteList[i];
      if(Math.hypot(s.x-x,s.y-y)<r) return true;
    }
    if(Math.hypot(player.x-x,player.y-y)<r) return true;
    return false;
  }

  // ============================================================
  // RENDER
  // ============================================================
  function render(dt) {
    if(!ctx||!W||!H) return;
    ctx.clearRect(0,0,W,H);
    cloudOffsetX += dt * 8;

    _renderSkyAndGround(dt);
    _renderWalls();
    _renderSprites();
    _renderWeather();
    _renderVignette();
  }

  // ---- SKY + TERRAIN FLOOR ----
  function _renderSkyAndGround() {
    // Sky gradient based on time of day
    var skyTop    = _skyColor(timeOfDay, 0);
    var skyHoriz  = _skyColor(timeOfDay, 0.5);
    var skyGrad = ctx.createLinearGradient(0,0,0,H/2);
    skyGrad.addColorStop(0,   skyTop);
    skyGrad.addColorStop(1,   skyHoriz);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0,0,W,H/2);

    // Mountains / horizon hills silhouette
    _renderHorizonHills();

    // Sun or Moon
    _renderCelestial();

    // Clouds
    _renderClouds();

    // GROUND — voxel-space terrain renderer (real 3D relief)
    _renderVoxelGround();
  }

  function _skyColor(t, frac) {
    // t: 0=midnight, 0.25=dawn, 0.5=morning, 0.75=noon, 1=dusk
    var night   = [5,5,20];
    var dawn    = [200,90,40];
    var morning = [135,200,235];
    var noon    = [80,160,240];
    var dusk    = [220,100,50];

    var r,g,b;
    if(t<0.25){ var p=t/0.25; r=_lerp(night[0],dawn[0],p); g=_lerp(night[1],dawn[1],p); b=_lerp(night[2],dawn[2],p); }
    else if(t<0.5){ var p=(t-.25)/.25; r=_lerp(dawn[0],morning[0],p); g=_lerp(dawn[1],morning[1],p); b=_lerp(dawn[2],morning[2],p); }
    else if(t<0.75){ var p=(t-.5)/.25; r=_lerp(morning[0],noon[0],p); g=_lerp(morning[1],noon[1],p); b=_lerp(morning[2],noon[2],p); }
    else{ var p=(t-.75)/.25; r=_lerp(noon[0],dusk[0],p); g=_lerp(noon[1],dusk[1],p); b=_lerp(noon[2],dusk[2],p); }

    var dark = 1 - Math.max(0, (timeOfDay < 0.2 ? 1 - timeOfDay*5 : 0));
    r*=dark; g*=dark; b*=dark;
    r = _lerp(r, r*0.7+frac*40, frac);
    return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';
  }

  function _lerp(a,b,t){ return a+(b-a)*t; }

  function _renderHorizonHills() {
    var horizY = H * 0.5;
    var a = player.angle;
    var night = timeOfDay < 0.3;

    // Layer 3: far dark mountains
    ctx.fillStyle = night ? 'rgb(3,7,3)' : 'rgb(12,28,8)';
    ctx.beginPath(); ctx.moveTo(0,H);
    for(var x=0;x<=W;x+=10){
      var h2=Math.sin(x*.008+a*1.7)*28+Math.sin(x*.019+.9)*16+Math.sin(x*.004+a)*10;
      ctx.lineTo(x, horizY-h2);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

    // Layer 2: mid rolling hills
    ctx.fillStyle = night ? 'rgb(7,18,5)' : 'rgb(20,55,14)';
    ctx.beginPath(); ctx.moveTo(0,H);
    for(var x=0;x<=W;x+=8){
      var h2=Math.sin(x*.013+a*2.1)*22+Math.sin(x*.031+1.4)*14+Math.sin(x*.006+a*1.5)*20;
      ctx.lineTo(x, horizY+8-h2);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

    // Layer 1: near terrain — samples actual heightmap in player's FOV
    ctx.fillStyle = night ? 'rgb(10,25,7)' : 'rgb(32,80,20)';
    ctx.beginPath(); ctx.moveTo(0,H);
    for(var x=0;x<=W;x+=5){
      var rayA = a - 0.52 + (x/W)*1.04;
      var dist = 5;
      var tx=Math.floor(player.x+Math.cos(rayA)*dist);
      var ty=Math.floor(player.y+Math.sin(rayA)*dist);
      var terrH=(tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H)?(heightMap[ty][tx]||0)*36:0;
      var wave=Math.sin(x*.021+a*2.4)*14+Math.sin(x*.049+2.1)*9;
      ctx.lineTo(x, horizY+16-wave-terrH*.7);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

    // Very near bright grass strip at base
    ctx.fillStyle = night ? 'rgb(14,32,9)' : 'rgb(42,95,24)';
    ctx.beginPath(); ctx.moveTo(0,H);
    for(var x=0;x<=W;x+=4){
      var rayA=a-0.52+(x/W)*1.04;
      var tx2=Math.floor(player.x+Math.cos(rayA)*2.5);
      var ty2=Math.floor(player.y+Math.sin(rayA)*2.5);
      var th2=(tx2>=0&&ty2>=0&&tx2<MAP_W&&ty2<MAP_H)?(heightMap[ty2][tx2]||0)*48:0;
      var w2=Math.sin(x*.035+a*3)*10+Math.sin(x*.07)*6;
      ctx.lineTo(x, horizY+28-w2-th2*.8);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  }

  function _renderCelestial() {
    var t = timeOfDay;
    if(t > 0.2 && t < 0.9) {
      // Sun
      var sunX = W*(t-0.2)/0.7;
      var sunY = H*0.4 - Math.sin((t-0.2)/0.7*Math.PI)*H*0.38;
      var grad = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,50);
      grad.addColorStop(0,'rgba(255,255,180,1)');
      grad.addColorStop(0.25,'rgba(255,220,80,0.7)');
      grad.addColorStop(1,'rgba(255,140,0,0)');
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(sunX,sunY,50,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffffa0'; ctx.beginPath(); ctx.arc(sunX,sunY,14,0,Math.PI*2); ctx.fill();
    } else {
      // Moon
      var moonX = W*.2, moonY = H*.12;
      ctx.fillStyle='#dde8f0'; ctx.beginPath(); ctx.arc(moonX,moonY,14,0,Math.PI*2); ctx.fill();
      // Stars
      ctx.fillStyle='#ffffff';
      for(var i=0;i<60;i++){
        var sx=(Math.sin(i*91.7)*0.5+0.5)*W, sy=(Math.sin(i*47.3)*0.5+0.5)*H*0.45;
        var ss=Math.abs(Math.sin(i*13.7))*1.5+0.5;
        var alpha=Math.abs(Math.sin(Date.now()*0.001+i))*0.5+0.5;
        ctx.globalAlpha=alpha; ctx.beginPath(); ctx.arc(sx,sy,ss,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
  }

  function _renderClouds() {
    if(timeOfDay < 0.2) return;
    var clouds = [
      {x:0.12,y:0.08,w:90,h:35},
      {x:0.4,y:0.04,w:120,h:40},
      {x:0.68,y:0.10,w:80,h:30},
      {x:0.85,y:0.06,w:100,h:38}
    ];
    ctx.save();
    clouds.forEach(function(cl) {
      var cx = ((cl.x*W + cloudOffsetX) % (W+200)) - 100;
      var cy = cl.y * H;
      ctx.globalAlpha = weather==='rain'||weather==='storm' ? 0.6 : 0.45;
      ctx.fillStyle = weather==='rain' ? '#778' : '#fff';
      _drawCloud(cx, cy, cl.w, cl.h);
    });
    ctx.restore();
  }

  function _drawCloud(cx,cy,w,h) {
    ctx.beginPath();
    ctx.ellipse(cx,cy,w*0.5,h*0.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx-w*0.25,cy+h*0.1,w*0.35,h*0.4,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+w*0.25,cy+h*0.1,w*0.35,h*0.4,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+w*0.1,cy-h*0.15,w*0.28,h*0.35,0,0,Math.PI*2); ctx.fill();
  }

  // VOXEL SPACE terrain renderer — true 3D hills (Comanche-style)
  function _renderVoxelGround() {
    var halfH  = Math.floor(H/2);
    var step   = Math.max(1, renderQuality);
    var FOV    = 1.0472, halfFOV = FOV/2;
    var lightF = Math.max(0.1, Math.min(1, timeOfDay<0.3?timeOfDay/0.3:timeOfDay>0.85?(1-timeOfDay)/0.15:1));
    var night  = timeOfDay < 0.25 || timeOfDay > 0.88;

    var baseR = night?10:22, baseG = night?18:40, baseB = night?6:14;
    ctx.fillStyle = 'rgb('+baseR+','+baseG+','+baseB+')';
    ctx.fillRect(0, halfH, W, halfH);

    var distSteps = renderQuality > 1 ? 50 : 70;

    for (var col = 0; col < W; col += step) {
      var angle = player.angle - halfFOV + (col/W)*FOV;
      var cosA  = Math.cos(angle), sinA = Math.sin(angle);
      var maxY  = H;

      for (var di = distSteps; di >= 1; di--) {
        var fd = di * 0.20;
        var wx = player.x + cosA*fd;
        var wy = player.y + sinA*fd;
        var mi = Math.floor(wx) & (MAP_W-1);
        var mj = Math.floor(wy) & (MAP_H-1);
        var terrH = (heightMap[mj]&&heightMap[mj][mi]!==undefined) ? heightMap[mj][mi] : 0;
        var cropT = (cropMap[mj]&&cropMap[mj][mi]) ? cropMap[mj][mi] : 0;

        var screenY = Math.floor(halfH + (0.5 - terrH*0.92)*H*0.80/fd);
        if (screenY >= maxY) continue;

        var fog = Math.min(1, Math.max(0,(fd-fogStart)/(fogEnd-fogStart)));
        var r, g, b;
        if (cropT > 0) {
          var cpairs=[[40,95,20],[55,110,25],[165,130,18],[28,72,14],[220,215,180],[52,100,22]];
          var cc=cpairs[(cropT-1)%6]; r=cc[0]; g=cc[1]; b=cc[2];
        } else if (terrH > 0.80) { r=90; g=82; b=62; }   // rocky peak
        else if (terrH > 0.62) { r=52; g=112; b=30; }    // upper slopes
        else if (terrH > 0.42) { r=40; g=90; b=24; }     // mid slopes
        else if (terrH > 0.22) { r=32; g=72; b=18; }     // lower slopes
        else { r=24; g=56; b=14; }                        // valley

        // Slope shading (N-S gradient approximation)
        if (mj>0&&mj<MAP_H-1&&heightMap[mj+1]&&heightMap[mj-1]) {
          var slope=(heightMap[mj+1][mi]||terrH)-(heightMap[mj-1][mi]||terrH);
          var sl=1+slope*1.6;
          r=Math.round(r*sl); g=Math.round(g*sl); b=Math.round(b*sl);
        }

        r=Math.round(r*lightF*(1-fog)+baseR*fog);
        g=Math.round(g*lightF*(1-fog)+baseG*fog);
        b=Math.round(b*lightF*(1-fog)+baseB*fog);

        ctx.fillStyle='rgb('+Math.max(0,Math.min(255,r))+','+Math.max(0,Math.min(255,g))+','+Math.max(0,Math.min(255,b))+')';
        ctx.fillRect(col, screenY, step, maxY-screenY);
        maxY = screenY;
        if (maxY <= halfH) break;
      }
    }

    _renderCropRows();
  }

  // 3D crop plant sprites — drawn as perspective-projected billboards
  function _renderCropRows() {
    var px=player.x, py=player.y;
    var maxDist=6.5;
    var lightF=Math.max(0.1,Math.min(1,timeOfDay<0.3?timeOfDay/0.3:timeOfDay>0.85?(1-timeOfDay)/0.15:1));

    // Collect visible crop cells near player
    var batch=[];
    var r0=Math.max(1,Math.floor(px-maxDist)), r1=Math.min(MAP_W-2,Math.floor(px+maxDist));
    var c0=Math.max(1,Math.floor(py-maxDist)), c1=Math.min(MAP_H-2,Math.floor(py+maxDist));
    for(var cy=c0;cy<=c1;cy++){
      for(var cx=r0;cx<=r1;cx++){
        if(!cropMap[cy]||!cropMap[cy][cx]) continue;
        var ct=cropMap[cy][cx];
        // 3 plants per crop cell in a row
        for(var pi=0;pi<3;pi++){
          var wx=cx+0.18+pi*0.32, wy=cy+0.5+Math.sin(cx*5.1+cy*3.7+pi)*0.15;
          var d2=(wx-px)*(wx-px)+(wy-py)*(wy-py);
          if(d2>maxDist*maxDist) continue;
          batch.push({wx:wx,wy:wy,ct:ct,d2:d2});
        }
      }
    }
    // Back to front for proper painter's order
    batch.sort(function(a,b){return b.d2-a.d2;});

    batch.forEach(function(sp){
      var proj=_projectSpriteAt(sp.wx,sp.wy);
      if(!proj) return;
      var dist=Math.sqrt(sp.d2);
      var fog=Math.min(1,Math.max(0,(dist-fogStart)/(fogEnd-fogStart)));
      var sprH=Math.min(H*.38, H*0.14/Math.max(0.25,proj.tz));
      if(sprH<3) return;
      ctx.save();
      ctx.globalAlpha=Math.max(0,(1-fog)*lightF*.9);
      _drawCropPlantAt(ctx, sp.ct, proj.sx, H/2+bobY, sprH);
      ctx.restore();
    });
  }

  // Project world point to screen using sprite transform
  function _projectSpriteAt(wx,wy){
    var dx=wx-player.x, dy=wy-player.y;
    var ca=Math.cos(player.angle), sa=Math.sin(player.angle);
    var plX=-sa, plY=ca;
    var invDet=1/(plX*ca-plY*sa); // always 1
    var tx=invDet*(ca*dx+sa*dy);
    var tz=invDet*(plX*(-dy)+plY*dx); // transform y = depth
    // Re-derive properly
    var tranX= plY*dx-plX*dy;
    var tranZ=-sa*dx+ca*dy;
    if(tranZ<=0.15) return null;
    var sx=Math.floor((W/2)*(1+tranX/tranZ));
    if(sx<-60||sx>W+60) return null;
    return {sx:sx, tz:tranZ};
  }

  // Draw a single crop plant billboard at screen coords
  function _drawCropPlantAt(ctx2, cropType, sx, groundY, h){
    if(h<3) return;
    var cols={
      1:['#4daa1f','#7acc40','#e8c820'], // corn: green + yellow cob
      2:['#6aa03a','#9acc60','#7acc40'], // soy
      3:['#c8a820','#e8c830','#d4a018'], // wheat: golden
      4:['#2a5a12','#4a8a22','#3a6a18'], // coffee: dark green
      5:['#c8c498','#e8e4b8','#f0f0d8'], // cotton: white/cream
      6:['#5a9a30','#7ab850','#50881a']  // default
    };
    var c=cols[cropType]||cols[6];

    // Stem
    ctx2.strokeStyle=c[0]; ctx2.lineWidth=Math.max(1,h*.07); ctx2.lineCap='round';
    ctx2.beginPath();
    ctx2.moveTo(sx, groundY);
    ctx2.bezierCurveTo(sx+h*.04, groundY-h*.38, sx-h*.04, groundY-h*.72, sx, groundY-h);
    ctx2.stroke();

    // Two leaves
    ctx2.fillStyle=c[0];
    ctx2.beginPath(); ctx2.ellipse(sx+h*.12, groundY-h*.38, h*.14, h*.046, -0.38, 0, Math.PI*2); ctx2.fill();
    ctx2.beginPath(); ctx2.ellipse(sx-h*.10, groundY-h*.65, h*.12, h*.040, 0.38, 0, Math.PI*2); ctx2.fill();

    // Crop-specific top
    if(cropType===1){ // corn cob
      ctx2.fillStyle=c[2];
      ctx2.beginPath(); ctx2.ellipse(sx, groundY-h*1.05, h*.055, h*.17, 0.08, 0, Math.PI*2); ctx2.fill();
      ctx2.strokeStyle=c[2]; ctx2.lineWidth=1; ctx2.beginPath();
      ctx2.moveTo(sx-h*.06, groundY-h*.95); ctx2.lineTo(sx+h*.06, groundY-h*.95); ctx2.stroke();
    } else if(cropType===3){ // wheat ear
      ctx2.fillStyle=c[2];
      ctx2.beginPath(); ctx2.ellipse(sx, groundY-h*1.06, h*.036, h*.20, 0, 0, Math.PI*2); ctx2.fill();
      ctx2.strokeStyle=c[2]; ctx2.lineWidth=.8;
      for(var si=-2;si<=2;si++){
        ctx2.beginPath(); ctx2.moveTo(sx,groundY-h*.92-si*h*.035);
        ctx2.lineTo(sx+h*.07*(si%2?-1:1), groundY-h*.90-si*h*.038); ctx2.stroke();
      }
    } else if(cropType===5){ // cotton boll
      ctx2.fillStyle=c[2]; ctx2.lineWidth=.8;
      ctx2.beginPath(); ctx2.arc(sx, groundY-h, h*.10, 0, Math.PI*2); ctx2.fill();
      ctx2.fillStyle='rgba(255,255,240,0.7)';
      ctx2.beginPath(); ctx2.arc(sx+h*.04, groundY-h*.96, h*.06, 0, Math.PI*2); ctx2.fill();
    } else { // default round top
      ctx2.fillStyle=c[1];
      ctx2.beginPath(); ctx2.arc(sx, groundY-h, h*.085, 0, Math.PI*2); ctx2.fill();
    }
  }

  // ---- WALL CASTING ----
  function _renderWalls() {
    var lightF = Math.max(0.1, Math.min(1, timeOfDay<0.3?timeOfDay/0.3:timeOfDay>0.85?(1-timeOfDay)/0.15:1));
    var FOV=1.0472, halfFOV=FOV/2;
    var step = renderQuality;

    for(var col=0; col<W; col+=step) {
      var angle = player.angle - halfFOV + (col/W)*FOV;
      var hit   = _castRay(angle);
      if(!hit.hit) continue;
      var dist  = Math.max(0.05, hit.dist);
      var wallH = Math.min(H, H*0.75/dist);
      var wallY = H/2 - wallH/2 + bobY;

      // height-adjusted wall (taller on hills)
      var cellH = hit.mapX>=0&&hit.mapY>=0&&hit.mapX<MAP_W&&hit.mapY<MAP_H ?
                  (heightMap[hit.mapY]?heightMap[hit.mapY][hit.mapX]:0) : 0;
      wallY -= cellH * 15 / Math.max(0.5, dist);

      // Texture
      var texKey = _wallTexKey(hit.cell);
      var tex    = TEX[texKey];
      var texX   = Math.floor(hit.wallX * 64) & 63;

      if(tex) {
        ctx.drawImage(tex, texX, 0, 1, 64, col, wallY, step, wallH);
      }

      // Shade overlay
      var fogF   = Math.min(1, Math.max(0,(dist-fogStart)/(fogEnd-fogStart)));
      var sideS  = hit.side ? 0.18 : 0;
      var shade  = Math.min(0.98, fogF*0.8 + sideS + (1-lightF)*0.7);
      ctx.fillStyle='rgba(0,0,0,'+shade.toFixed(2)+')';
      ctx.fillRect(col, wallY, step, wallH);

      // Puddle / water: blue tint
      if(hit.cell===5) {
        ctx.fillStyle='rgba(60,120,200,0.35)';
        ctx.fillRect(col, wallY, step, wallH);
      }
    }
  }

  function _wallTexKey(cell) {
    return {1:'wall',2:'barn',3:'wood',4:'fence',5:'wall',6:'grain',7:'silo'}[cell]||'wall';
  }

  function _castRay(angle) {
    var rdx=Math.cos(angle), rdy=Math.sin(angle);
    var mx=Math.floor(player.x), my=Math.floor(player.y);
    var ddx=Math.abs(1/rdx)||1e30, ddy=Math.abs(1/rdy)||1e30;
    var sx,sy,sdx,sdy;
    if(rdx<0){sx=-1;sdx=(player.x-mx)*ddx;}else{sx=1;sdx=(mx+1-player.x)*ddx;}
    if(rdy<0){sy=-1;sdy=(player.y-my)*ddy;}else{sy=1;sdy=(my+1-player.y)*ddy;}
    var hit=false,side=0,cell=0,steps=80;
    while(!hit&&steps-->0){
      if(sdx<sdy){sdx+=ddx;mx+=sx;side=0;}else{sdy+=ddy;my+=sy;side=1;}
      if(mx<0||my<0||mx>=MAP_W||my>=MAP_H){hit=true;cell=1;break;}
      if(wallMap[my]&&wallMap[my][mx]>0){hit=true;cell=wallMap[my][mx];}
    }
    var dist;
    if(side===0) dist=(mx-player.x+(1-sx)/2)/rdx;
    else          dist=(my-player.y+(1-sy)/2)/rdy;
    var wallX;
    if(side===0) wallX=player.y+dist*rdy; else wallX=player.x+dist*rdx;
    wallX-=Math.floor(wallX);
    return {hit:hit,dist:Math.max(0,dist),cell:cell,side:side,wallX:wallX,mapX:mx,mapY:my};
  }

  // ---- SPRITES ----
  function _renderSprites() {
    var list = spriteList.map(function(s){
      var dx=s.x-player.x, dy=s.y-player.y;
      return {s:s, dist2:dx*dx+dy*dy};
    });
    list.sort(function(a,b){return b.dist2-a.dist2;});

    var lightF=Math.max(0.1,Math.min(1,timeOfDay<0.3?timeOfDay/0.3:timeOfDay>0.85?(1-timeOfDay)/0.15:1));

    list.forEach(function(item){
      var s=item.s;
      var dist=Math.sqrt(item.dist2);
      if(dist>fogEnd*1.1) return;

      var dx=s.x-player.x, dy=s.y-player.y;
      var invDet=1/(Math.cos(player.angle)*Math.sin(player.angle+Math.PI/2)-Math.sin(player.angle)*Math.cos(player.angle+Math.PI/2));
      var tx=invDet*(Math.sin(player.angle+Math.PI/2)*dx-Math.cos(player.angle+Math.PI/2)*dy);
      var tz=invDet*(-Math.sin(player.angle)*dx+Math.cos(player.angle)*dy);
      if(tz<=0.1) return;

      var screenX=Math.floor((W/2)*(1+tx/tz));
      var sprH=Math.min(H*2, Math.abs(Math.floor(H/tz)));
      var sprW=sprH;
      var sY=Math.floor(H/2-sprH/2+bobY);

      ctx.save();
      var fog=Math.min(1,Math.max(0,(dist-fogStart)/(fogEnd-fogStart)));
      ctx.globalAlpha=Math.max(0.05, (1-fog)*lightF);
      _drawSpriteAt(ctx, s, screenX, sY, sprW, sprH);
      ctx.restore();
    });
  }

  function _drawSpriteAt(ctx, sp, sx, sy, sw, sh) {
    if(sp.type==='tree') {
      var ts=sp.size||1;
      // Trunk
      ctx.fillStyle='#5a3010';
      ctx.fillRect(sx-sw*0.07, sy+sh*0.5, sw*0.14, sh*0.5);
      // Canopy layers (3 tiers like real trees)
      ctx.fillStyle='#1a5a0a';
      ctx.beginPath(); ctx.ellipse(sx,sy+sh*0.25,sw*0.45,sh*0.4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#2a7010';
      ctx.beginPath(); ctx.ellipse(sx-sw*0.06,sy+sh*0.15,sw*0.38,sh*0.32,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#3a8015';
      ctx.beginPath(); ctx.ellipse(sx+sw*0.04,sy+sh*0.05,sw*0.25,sh*0.22,0,0,Math.PI*2); ctx.fill();
    } else if(sp.type==='npc') {
      // NPC silhouette drawn with canvas art
      var scale=sh/200;
      var tmpC=document.createElement('canvas');
      tmpC.width=Math.ceil(sw)+20; tmpC.height=Math.ceil(sh)+10;
      var tmpCtx=tmpC.getContext('2d');
      var char=CHARACTERS[sp.charId];
      if(char) drawCharacter(tmpCtx, char, tmpC.width/2, tmpC.height*0.88, scale*0.8);
      ctx.drawImage(tmpC, sx-tmpC.width/2, sy);
    } else if(sp.type==='vehicle') {
      _drawVehicle(ctx, sp, sx, sy, sw, sh);
    } else {
      // Object marker
      ctx.fillStyle='rgba(255,220,0,0.9)';
      ctx.beginPath(); ctx.arc(sx,sy+sh/2,Math.max(4,sw*0.15),0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.font=Math.max(10,sh*0.3)+'px sans-serif'; ctx.textAlign='center';
      var icons={soil:'📡',pest:'🔦',bomb:'💣',sample:'🧪',plant_spot:'🌱',
        certify_point:'✅',spring:'💧',waste:'♻️',bug_point:'🐞',
        products:'📦',fair_gate:'🎪',compost_site:'♻️',drone_start:'🚁'};
      var obj=objects.find(function(o){return Math.hypot(o.x-sp.x,o.y-sp.y)<2});
      if(obj){ctx.fillText(icons[obj.type]||'?',sx,sy+sh/2+6);}
    }
  }

  function _drawVehicle(ctx, sp, sx, sy, sw, sh) {
    if(sp.vehicleType==='tractor') {
      ctx.fillStyle='#3a7a30'; ctx.fillRect(sx-sw*0.45,sy+sh*0.3,sw*0.9,sh*0.4);
      ctx.fillStyle='#2a5a20'; ctx.fillRect(sx-sw*0.25,sy+sh*0.1,sw*0.5,sh*0.35);
      ctx.fillStyle='rgba(150,220,255,0.5)'; ctx.fillRect(sx-sw*0.2,sy+sh*0.12,sw*0.4,sh*0.18);
      ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.arc(sx-sw*0.28,sy+sh*0.7,sw*0.18,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+sw*0.28,sy+sh*0.7,sw*0.18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(sx-sw*0.28,sy+sh*0.7,sw*0.12,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+sw*0.28,sy+sh*0.7,sw*0.12,0,Math.PI*2); ctx.fill();
    } else if(sp.vehicleType==='truck'||sp.vehicleType==='planter') {
      ctx.fillStyle='#4a3010'; ctx.fillRect(sx-sw*0.48,sy+sh*0.25,sw*0.96,sh*0.5);
      ctx.fillStyle='#6a4a1a'; ctx.fillRect(sx-sw*0.38,sy+sh*0.08,sw*0.4,sh*0.35);
      ctx.fillStyle='rgba(150,220,255,0.5)'; ctx.fillRect(sx-sw*0.35,sy+sh*0.1,sw*0.35,sh*0.2);
      ctx.fillStyle='#111';
      ctx.beginPath(); ctx.arc(sx-sw*0.3,sy+sh*0.75,sw*0.16,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+sw*0.3,sy+sh*0.75,sw*0.16,0,Math.PI*2); ctx.fill();
    }
  }

  // ---- WEATHER EFFECTS ----
  function _renderWeather() {
    if(weather==='rain'||weather==='storm'){
      ctx.save(); ctx.strokeStyle='rgba(120,150,200,0.3)'; ctx.lineWidth=1;
      var drops=weather==='storm'?150:80;
      for(var i=0;i<drops;i++){
        var rx=Math.random()*W, ry=Math.random()*H;
        ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-2,ry+14); ctx.stroke();
      }
      ctx.globalAlpha=0.06; ctx.fillStyle='#4060a0'; ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
    if(weather==='fog'){
      ctx.save();
      var fg=ctx.createLinearGradient(0,H*0.35,0,H);
      fg.addColorStop(0,'rgba(190,210,195,0)');
      fg.addColorStop(1,'rgba(190,210,195,0.55)');
      ctx.fillStyle=fg; ctx.fillRect(0,0,W,H); ctx.restore();
    }
    if(timeOfDay<0.25){
      ctx.fillStyle='rgba(0,0,20,'+(0.25-timeOfDay)*3+')';
      ctx.fillRect(0,0,W,H);
    }
  }

  function _renderVignette() {
    var vg=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.75);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.35)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  }

  // ============================================================
  // MOVEMENT & PHYSICS
  // ============================================================
  function _bindInput() {
    document.addEventListener('keydown',function(e){
      keys[e.code]=true;
      if(e.code==='KeyE') _tryInteract();
    });
    document.addEventListener('keyup',function(e){keys[e.code]=false;});
    document.addEventListener('mousemove',function(e){
      if(locked){ player.angle+=e.movementX*mouseSens; }
    });
    document.addEventListener('pointerlockchange',function(){
      locked=!!document.pointerLockElement;
    });
  }

  function _tryInteract() {
    if(nearVehicle&&!inVehicle){ inVehicle=true; return; }
    if(inVehicle){ inVehicle=false; return; }
    if(nearObject){ onInteract(nearObject); }
  }

  function update(dt) {
    bobTimer+=dt;
    running=keys['ShiftLeft']||keys['ShiftRight'];

    // Vehicle-specific physics
    var vType = nearVehicle ? nearVehicle.vehicleType : (inVehicle&&nearVehicle?nearVehicle.vehicleType:'');
    var vSpeed, vTurnRate, vBob;
    if(inVehicle) {
      switch(vType) {
        case 'tractor':   vSpeed=1.8; vTurnRate=0.9; vBob=0.5; break;
        case 'car':       vSpeed=5.5; vTurnRate=2.2; vBob=3; break;
        case 'truck':     vSpeed=2.8; vTurnRate=1.0; vBob=1; break;
        case 'harvester': vSpeed=1.2; vTurnRate=0.6; vBob=0.3; break;
        case 'planter':   vSpeed=1.5; vTurnRate=0.8; vBob=0.4; break;
        default:          vSpeed=3.0; vTurnRate=1.5; vBob=1.5;
      }
    } else {
      vSpeed = running?4.2:2.6; vTurnRate=2.0; vBob=running?6:3;
    }

    var speed = vSpeed * dt;
    var moveX=0,moveY=0;
    if(keys['KeyW']||keys['ArrowUp'])  {moveX+=Math.cos(player.angle);moveY+=Math.sin(player.angle);}
    if(keys['KeyS']||keys['ArrowDown']){moveX-=Math.cos(player.angle);moveY-=Math.sin(player.angle);}
    if(keys['KeyA']||keys['ArrowLeft']) player.angle-=vTurnRate*dt;
    if(keys['KeyD']||keys['ArrowRight'])player.angle+=vTurnRate*dt;

    bobY = vBob * Math.sin(bobTimer*(running?10:6));

    var nx=player.x+moveX*speed, ny=player.y+moveY*speed;
    if(nx<1||ny<1||nx>=MAP_W-1||ny>=MAP_H-1){
      var msgs=['Hum, não é por aqui!','A fazenda acaba aqui.','Tem cerca ali!','Olha o limite da propriedade!'];
      onBoundary(msgs[Math.floor(Date.now()/3000)%msgs.length]);
      return;
    }
    // collision
    if(wallMap[Math.floor(ny)]&&wallMap[Math.floor(ny)][Math.floor(nx)]===0){player.x=nx;player.y=ny;}
    else if(wallMap[Math.floor(player.y)]&&wallMap[Math.floor(player.y)][Math.floor(nx)]===0){player.x=nx;}
    else if(wallMap[Math.floor(ny)]&&wallMap[Math.floor(ny)][Math.floor(player.x)]===0){player.y=ny;}

    // Near detection
    nearObject=null; nearVehicle=null;
    for(var i=0;i<objects.length;i++){
      var o=objects[i]; if(o.done) continue;
      if(Math.hypot(o.x-player.x,o.y-player.y)<1.8){nearObject=o;break;}
    }
    for(var j=0;j<spriteList.length;j++){
      var s=spriteList[j]; if(s.type!=='vehicle') continue;
      if(Math.hypot(s.x-player.x,s.y-player.y)<2.2){nearVehicle=s;break;}
    }

    if(missionTimer>0){ missionTimer-=dt; if(missionTimer<=0&&timerCb) timerCb('timeout'); }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function start(missionId, opts) {
    opts=opts||{};
    if(opts.quality) renderQuality=opts.quality==='high'?1:opts.quality==='low'?3:2;
    if(opts.mouseSens) mouseSens=opts.mouseSens*0.00055;
    timerCb=opts.onTimerEnd||null;
    generateMap(missionId);
    if(animFrame) cancelAnimationFrame(animFrame);
    lastTime=performance.now();
    function loop(now){
      var dt=Math.min((now-lastTime)/1000,0.05); lastTime=now;
      update(dt); render(dt);
      animFrame=requestAnimationFrame(loop);
    }
    animFrame=requestAnimationFrame(loop);
  }

  function stop(){ if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;} unlockPointer(); }
  function lockPointer(){ if(canvas) canvas.requestPointerLock(); }
  function unlockPointer(){ if(document.pointerLockElement) document.exitPointerLock(); }

  function markObjectDone(id){ for(var i=0;i<objects.length;i++) if(objects[i].id===id){objects[i].done=true;break;} }
  function getObjectsCompleted(){ return objects.filter(function(o){return o.done&&!o.extra.avoid;}).length; }
  function getTotalObjects(){ return objects.filter(function(o){return !o.extra.avoid;}).length; }
  function getTimer(){ return missionTimer; }
  function getNearObject(){ return nearObject; }
  function getNearVehicle(){ return nearVehicle; }
  function isInVehicle(){ return inVehicle; }

  function renderMinimap(mmC) {
    var mc=mmC.getContext('2d'), ms=120, cell=4;
    var cols=ms/cell, rows=ms/cell;
    mc.fillStyle='rgba(0,0,0,0.75)'; mc.fillRect(0,0,ms,ms);
    var offX=Math.floor(player.x)-cols/2, offY=Math.floor(player.y)-rows/2;
    for(var y=0;y<rows;y++) for(var x=0;x<cols;x++) {
      var wx=Math.floor(offX+x), wy=Math.floor(offY+y);
      if(wx<0||wy<0||wx>=MAP_W||wy>=MAP_H) continue;
      var w=wallMap[wy]?wallMap[wy][wx]:0;
      var crop=cropMap[wy]?cropMap[wy][wx]:0;
      if(w>0) mc.fillStyle='#9a6030';
      else if(crop>0) mc.fillStyle='rgba(80,160,30,0.7)';
      else mc.fillStyle='rgba(40,80,20,0.4)';
      mc.fillRect(x*cell,y*cell,cell-0.5,cell-0.5);
    }
    objects.forEach(function(o){
      var sx=(o.x-offX)*cell, sy=(o.y-offY)*cell;
      mc.fillStyle=o.done?'#4a4':'#ff0';
      mc.beginPath(); mc.arc(sx,sy,3,0,Math.PI*2); mc.fill();
    });
    var px=(player.x-offX)*cell, py=(player.y-offY)*cell;
    mc.fillStyle='#0f0'; mc.beginPath(); mc.arc(px,py,4,0,Math.PI*2); mc.fill();
    mc.strokeStyle='#0f0'; mc.lineWidth=2;
    mc.beginPath(); mc.moveTo(px,py);
    mc.lineTo(px+Math.cos(player.angle)*10,py+Math.sin(player.angle)*10); mc.stroke();
  }

  return {
    init:init, start:start, stop:stop, resize:resize,
    lockPointer:lockPointer, unlockPointer:unlockPointer,
    generateMap:generateMap,
    generatePlantationMap:generatePlantationMap,
    markObjectDone:markObjectDone,
    getObjectsCompleted:getObjectsCompleted,
    getTotalObjects:getTotalObjects,
    getTimer:getTimer, getNearObject:getNearObject,
    getNearVehicle:getNearVehicle, isInVehicle:isInVehicle,
    renderMinimap:renderMinimap,
    setQuality:function(q){renderQuality=q==='high'?1:q==='low'?3:2;},
    setMouseSens:function(s){mouseSens=s*0.00055;},
    getPlayer:function(){ return {x:player.x,y:player.y,angle:player.angle}; }
  };
})();
