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
