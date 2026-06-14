// ═════════════════════════════════════════════════════════════
// AGRINHO 2026 — VERSÃO COMPLETA E CORRIGIDA
// Agro forte, futuro sustentável
// ═════════════════════════════════════════════════════════════

// ── VARIÁVEIS DE ESTADO GLOBAL ─────────────────────────────
let estadoTela = 0;
let tempoEstado = 0;
let anguloCubo = 0;
let menuHover = -1;

// ── CAMPANHA ───────────────────────────────────────────────
let campaignActive = false;
let campaignState = 'levelSelect';
let currentPhase = 0;
let phasesUnlocked = [true, false, false, false, false, false];
let csFrame = 0, csIdx = 0;
let pauseOpt = 0;

// ── TRAILER ────────────────────────────────────────────────
let trailerAtivo = false;
let trailerFrame = 0;
let cam1 = 0, cam2 = 0, cam2b = 0;

// ── SANDBOX ────────────────────────────────────────────────
let sandboxActive = false;
let sbWeather = 0;
let sbTool = 0;
let sbWeatherTimer = 0;
let lightningFlash = 0;
let stormParts = [];
const SB_WEATHER_NAMES = ['☀ DIA CLARO', '⛅ NUBLADO', '🌙 NOITE TÁTICA', '⛈ TEMPESTADE'];

// ── PLANTAÇÃO ──────────────────────────────────────────────
let plantActive = false;
let plantGrid = [];
const PLANT_COLS = 10, PLANT_ROWS = 6;
let plantResources = { agua: 100, creditos: 100, solo: 100, sementes: 30 };
let plantTool = 0;
const PLANT_TOOLS = ['SCANNER', 'ARAR', 'SEMEAR', 'IRRIGAR', 'BIOINSUMO'];
let plantMsg = '', plantMsgTimer = 0;
let plantEfficiency = 0;
let plantCursor = { col: 0, row: 0 };
let plantWin = false;

// ── PLAYER ─────────────────────────────────────────────────
let player = { x: 12, y: 12, angle: 0, stamina: 100, health: 100, moving: false };
let pointerLocked = false;
let nativeMovX = 0, nativeMovY = 0;
let keys = {};
let stepTimer = 0;

// ── OBJETIVOS ──────────────────────────────────────────────
let objTotal = 0, objDone = 0;
let phaseTimer = -1, phaseTimerMax = -1, phaseWin = false;

// ── INTERAÇÃO ──────────────────────────────────────────────
let dialogActive = false, dialogNPC = null, dialogLine = 0, interactCool = 0;
let pickupAnim = 0;

// ── NPCs ───────────────────────────────────────────────────
let activeNPCs = [], spots = [];

// ── CANVAS ─────────────────────────────────────────────────
let cnvElt = null;

// ── ÁUDIO (DESATIVADO PARA GITHUB PAGES) ───────────────────
let audioReady = true;
let windNoise = null;
let windAmp = 0;

// ── MÚSICA TRAILER (SIMPLIFICADA) ─────────────────────────
let musicInited = false;
let musicAtiva = false;
let musicFrame = 0;

// Partículas de cena
let nuvens = [], passaros = [], graos = [], bovinos = [], poeira = [], brasas = [], menuStars = [];
let windParts = [];

// Oscilador de fundo
let osciladorFundo = null;
let envelopeImpacto = null;
let osciladorImpacto = null;

// Menu options
const OPCOES_MENU = ['CAMPANHA', 'SANDBOX', 'PLANTAÇÃO'];

// Problemas para cena do trailer
const PROBLEMAS = [
  { sub: 'EROSÃO', titulo: 'SOLO EXAUSTO', l1: '40 anos de monocultura intensiva', l2: 'A terra perde 33% de nutrientes por safra', r: 180, g: 120, b: 40 },
  { sub: 'CONTAMINAÇÃO', titulo: 'RIOS EM RISCO', l1: 'Agrotóxicos atingem lençóis freáticos', l2: '9 em cada 10 rios têm resíduos detectáveis', r: 60, g: 100, b: 200 },
  { sub: 'DESMATAMENTO', titulo: 'FLORESTA PERDIDA', l1: 'Expansão agrícola sem planejamento', l2: 'Biodiversidade em colapso acelerado', r: 200, g: 60, b: 40 }
];

// ═════════════════════════════════════════════════════════════
// PERSONAGENS
// ═════════════════════════════════════════════════════════════
const CHARS = [
  { name: 'SEU JUCA', skinR:200,skinG:148,skinB:96, shirtR:180,shirtG:50,shirtB:50, hat:true },
  { name: 'MARINA', skinR:215,skinG:168,skinB:128, shirtR:55,shirtG:165,shirtB:80, hat:false },
  { name: 'PEDRO', skinR:198,skinG:158,skinB:118, shirtR:205,shirtG:205,shirtB:225, hat:false },
  { name: 'D.CONCEIÇÃO', skinR:188,skinG:142,skinB:102, shirtR:225,shirtG:182,shirtB:52, hat:false },
  { name: 'TONHO', skinR:192,skinG:148,skinB:104, shirtR:82,shirtG:82,shirtB:92, hat:true },
  { name: 'BIU', skinR:172,skinG:132,skinB:92, shirtR:48,shirtG:122,shirtB:48, hat:true },
  { name: 'LENA', skinR:222,skinG:178,skinB:138, shirtR:245,shirtG:242,shirtB:205, hat:false },
  { name: 'DR.COSTA', skinR:202,skinG:162,skinB:122, shirtR:245,shirtG:245,shirtB:250, hat:false },
  { name: 'ANA', skinR:218,skinG:172,skinB:132, shirtR:162,shirtG:82,shirtB:182, hat:false },
  { name: 'PROF.CLARA', skinR:228,skinG:182,skinB:142, shirtR:78,shirtG:122,shirtB:205, hat:false }
];

// NPCs por fase
const NPC_DATA = [
  [{c:0,x:7.5,y:7.5,d:0},{c:1,x:10.5,y:5.5,d:1},{c:2,x:14.5,y:9.5,d:2},{c:3,x:5.5,y:13.5,d:3},{c:4,x:16.5,y:13.5,d:4}],
  [{c:1,x:6.5,y:10.5,d:0},{c:5,x:12.5,y:6.5,d:1},{c:8,x:9.5,y:14.5,d:2}],
  [{c:0,x:10.5,y:3.5,d:0},{c:1,x:15.5,y:7.5,d:1},{c:5,x:6.5,y:14.5,d:2},{c:9,x:12.5,y:12.5,d:3}],
  [{c:1,x:5.5,y:8.5,d:0},{c:7,x:10.5,y:4.5,d:1},{c:8,x:15.5,y:10.5,d:2}],
  [{c:0,x:6.5,y:6.5,d:0},{c:1,x:12.5,y:12.5,d:1},{c:2,x:15.5,y:6.5,d:2},{c:7,x:4.5,y:14.5,d:3},{c:4,x:9.5,y:4.5,d:4}],
  [{c:0,x:8.5,y:8.5,d:0},{c:1,x:14.5,y:5.5,d:1},{c:6,x:6.5,y:14.5,d:2},{c:9,x:15.5,y:14.5,d:3},{c:3,x:4.5,y:4.5,d:4}]
];

const DIALOGUES = [
  [['Essa terra tá pedindo socorro...','Encontre os 5 pontos!']],
  [['Modo noturno ativo!','Procure as pragas!']],
  [['O timer tá rodando!','4 minutos!']],
  [['Coleta as amostras...','Cada uma revela o veneno.']],
  [['Planta nos pontos azuis!','A natureza vai se curar.']],
  [['Drone pronto!','Inspecione todas as áreas!']]
];

// ═════════════════════════════════════════════════════════════
// MAPAS
// ═════════════════════════════════════════════════════════════
const SPAWNS = [[3.5,3.5,0],[2.5,3.5,0],[2.5,16.5,0],[2.5,2.5,0],[3.5,3.5,0],[3.5,3.5,0]];
const MAPS = [
  (()=>{let m=Array(24).fill().map(()=>Array(24).fill(0)); for(let i=0;i<24;i++){m[0][i]=1;m[23][i]=1;m[i][0]=1;m[i][23]=1;} for(let i=0;i<200;i++){let x=floor(random(1,23)),y=floor(random(1,23)); if(m[y][x]===0) m[y][x]=random()<0.3?2:0;} return m;})(),
  (()=>{let m=Array(24).fill().map(()=>Array(24).fill(0)); for(let i=0;i<24;i++){m[0][i]=1;m[23][i]=1;m[i][0]=1;m[i][23]=1;} for(let i=0;i<200;i++){let x=floor(random(1,23)),y=floor(random(1,23)); if(m[y][x]===0) m[y][x]=random()<0.3?2:0;} return m;})(),
  (()=>{let m=Array(24).fill().map(()=>Array(24).fill(0)); for(let i=0;i<24;i++){m[0][i]=1;m[23][i]=1;m[i][0]=1;m[i][23]=1;} for(let i=0;i<200;i++){let x=floor(random(1,23)),y=floor(random(1,23)); if(m[y][x]===0) m[y][x]=random()<0.3?2:0;} return m;})(),
  (()=>{let m=Array(24).fill().map(()=>Array(24).fill(0)); for(let i=0;i<24;i++){m[0][i]=1;m[23][i]=1;m[i][0]=1;m[i][23]=1;} for(let i=0;i<200;i++){let x=floor(random(1,23)),y=floor(random(1,23)); if(m[y][x]===0) m[y][x]=random()<0.3?2:0;} return m;})(),
  (()=>{let m=Array(24).fill().map(()=>Array(24).fill(0)); for(let i=0;i<24;i++){m[0][i]=1;m[23][i]=1;m[i][0]=1;m[i][23]=1;} for(let i=0;i<200;i++){let x=floor(random(1,23)),y=floor(random(1,23)); if(m[y][x]===0) m[y][x]=random()<0.3?2:0;} return m;})(),
  (()=>{let m=Array(24).fill().map(()=>Array(24).fill(0)); for(let i=0;i<24;i++){m[0][i]=1;m[23][i]=1;m[i][0]=1;m[i][23]=1;} for(let i=0;i<200;i++){let x=floor(random(1,23)),y=floor(random(1,23)); if(m[y][x]===0) m[y][x]=random()<0.3?2:0;} return m;})()
];
const MAPSIZE = 24;

const PHASE_DATA = [
  { name:'FASE 1', subtitle:'Escaneamento do Solo', tool:'SCANNER', toolTip:'[E] Escanear', objLabel:'Pontos', objTotal:5, hasTimer:false, icone:'🔍', skyTop:[110,185,248], skyBot:[65,138,210] },
  { name:'FASE 2', subtitle:'Mapeamento Noturno', tool:'SCANNER N', toolTip:'[E] Escanear', objLabel:'Pragas', objTotal:6, hasTimer:false, icone:'🐛', skyTop:[8,12,28], skyBot:[4,8,20] },
  { name:'FASE 3', subtitle:'Interrupção', tool:'HACKEAR', toolTip:'[E] Hackear', objLabel:'Bombas', objTotal:5, hasTimer:true, timerSec:240, icone:'💣', skyTop:[205,100,22], skyBot:[160,68,14] },
  { name:'FASE 4', subtitle:'Coleta de Amostras', tool:'COLETOR', toolTip:'[E] Coletar', objLabel:'Amostras', objTotal:6, hasTimer:false, icone:'🧪', skyTop:[72,70,82], skyBot:[45,44,55] },
  { name:'FASE 5', subtitle:'Plantio de Remediação', tool:'PLANTAR', toolTip:'[E] Plantar', objLabel:'Mudas', objTotal:7, hasTimer:false, icone:'🌱', skyTop:[60,185,205], skyBot:[32,140,165] },
  { name:'FASE 6', subtitle:'Inspeção Final', tool:'DRONE', toolTip:'[E] Inspecionar', objLabel:'Áreas', objTotal:6, hasTimer:false, icone:'🚁', skyTop:[82,205,252], skyBot:[42,165,222] }
];

const CUTSCENE_DATA = [
  [['narrador','O solo está cansado...',200],['juca','Use o scanner!',200],['tico','Encontre os pontos!',200]],
  [['narrador','Pragas atacam à noite...',200],['marina','Ative o scanner noturno!',200],['tico','Elimine todas!',200]],
  [['narrador','Bombas ilegais no rio!',200],['costa','Desative em 4 minutos!',200],['tico','Corra contra o tempo!',200]],
  [['narrador','Solo contaminado...',200],['conceicao','Colete as amostras!',200],['tico','Cada amostra revela o veneno!',200]],
  [['narrador','A natureza pode se curar...',200],['pedro','Plante mudas nativas!',200],['tico','Use os pontos azuis!',200]],
  [['narrador','Última etapa!',200],['lena','Inspecione com o drone!',200],['tico','Voe sobre todas as áreas!',200]]
];

const ENDING_SCENES = [
  ['narrador','Parabéns! Você restaurou o solo!',300],
  ['juca','A tecnologia salvou minha terra.',280],
  ['marina','Agro forte e futuro sustentável!',280],
  ['tico','Missão cumprida! Obrigado por jogar!',260]
];

// ═════════════════════════════════════════════════════════════
// FUNÇÕES DE ÁUDIO (DESATIVADAS)
// ═════════════════════════════════════════════════════════════
function initGameAudio() { audioReady = true; }
function updateGameAudio() {}
function playStep() {}
function playPickup() {}
function playDialog() {}
function iniciarMusicaTrailer() {}
function musicUpdate() {}
function pararMusicaTrailer() {}

// ═════════════════════════════════════════════════════════════
// SETUP
// ═════════════════════════════════════════════════════════════
function setup() {
  let cnv = createCanvas(800, 600);
  cnvElt = cnv.elt;
  frameRate(60);
  textFont('Courier New');
  textAlign(CENTER, CENTER);
  
  cnvElt.addEventListener('mousedown', () => {
    if(campaignActive && campaignState === 'gameplay' && cnvElt.requestPointerLock)
      cnvElt.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = (document.pointerLockElement === cnvElt);
    if(!pointerLocked) { nativeMovX = 0; nativeMovY = 0; }
  });
  document.addEventListener('mousemove', (e) => {
    if(pointerLocked) { nativeMovX += e.movementX || 0; nativeMovY += e.movementY || 0; }
  });
  
  for(let i=0;i<100;i++) menuStars.push({ x:random(width), y:random(height*0.6), r:random(1,3) });
  for(let i=0;i<70;i++) windParts.push({ x:random(width), y:random(height), speed:random(2,8), alpha:random(20,90), len:random(15,55), t:random(TWO_PI) });
  for(let i=0;i<60;i++) stormParts.push({ x:random(width), y:random(height), len:random(8,22), spd:random(12,28), a:random(60,180) });
  
  iniciarPlantacao();
  try { let s = localStorage.getItem('agrinho2026_v8'); if(s) phasesUnlocked = JSON.parse(s); } catch(e) {}
}

function iniciarPlantacao() {
  plantGrid = [];
  for(let r=0; r<PLANT_ROWS; r++)
    for(let c=0; c<PLANT_COLS; c++)
      plantGrid.push({ col:c, row:r, stage:0, pH:random(4.5,8.0), water:random(20,80), hasPest:false, growTimer:0 });
  plantResources = { agua:100, creditos:100, solo:100, sementes:30 };
  plantTool = 0; plantMsg = ''; plantMsgTimer = 0; plantWin = false;
  plantCursor = { col:0, row:0 };
}

// ═════════════════════════════════════════════════════════════
// DRAW PRINCIPAL
// ═════════════════════════════════════════════════════════════
function draw() {
  background(20, 40, 20);
  updateGameAudio();
  let td = millis() - tempoEstado;
  switch(estadoTela) {
    case 0: desenharTelaClique(); break;
    case 1: desenharTelaAviso(); if(td>5200) mudarEstado(2); break;
    case 2: desenharTelaEstudio(td); if(td>6200) mudarEstado(3); break;
    case 3: desenharMenuPrincipal(); break;
    case 4: rodarJogoPrincipal(); break;
  }
  rodapeCreditos();
}

function mudarEstado(s) { estadoTela = s; tempoEstado = millis(); }

function desenharTelaClique() {
  for(let y=0; y<height; y++) stroke(lerp(72,38,y/height), lerp(128,88,y/height), lerp(188,138,y/height)), line(0,y,width,y);
  fill(0,140); rect(width/2-280, height/2-80, 560, 160, 12);
  fill(255,235,120); textSize(36); text('AGRINHO 2026', width/2, height/2-40);
  fill(200,240,160); textSize(18); text('Agro forte, futuro sustentável', width/2, height/2+5);
  fill(120,255,120, sin(frameCount*0.055)*255); textSize(14); text('[ CLIQUE PARA INICIAR ]', width/2, height/2+52);
}

function desenharTelaAviso() {
  for(let y=0; y<height; y++) stroke(lerp(8,22,y/height), lerp(18,48,y/height), lerp(8,18,y/height)), line(0,y,width,y);
  fill(0,160); rect(width/2-320, height/2-90, 640, 180, 12);
  fill(200,240,160); textSize(13);
  text('AVISO — Concurso Agrinho 2026\n\nEste jogo simula desafios da produção agrícola.\nAlinhado ao tema: Equilíbrio entre produção e meio ambiente.', width/2, height/2);
}

function desenharTelaEstudio(td) {
  for(let y=0; y<height; y++) stroke(lerp(4,18,y/height), lerp(8,28,y/height), lerp(4,12,y/height)), line(0,y,width,y);
  let op = map(td, 0, 1500, 0, 255, true);
  fill(0,160); rect(width/2-260, height/2-80, 520, 160, 10);
  fill(255,op); textSize(28); text('AGRINHO 2026', width/2, height/2-28);
  fill(180,240,140,op); textSize(15); text('Agro forte, futuro sustentável', width/2, height/2+12);
}

function desenharMenuPrincipal() {
  for(let y=0; y<height; y++) stroke(lerp(8,22,y/height), lerp(18,58,y/height), lerp(8,22,y/height)), line(0,y,width,y);
  for(let s of menuStars) { fill(255,220,100, 80+sin(frameCount*0.04+s.x)*60); noStroke(); ellipse(s.x,s.y,s.r); }
  fill(22,55,18); beginShape(); vertex(0,height);
  for(let x=0; x<=width; x+=7) vertex(x, height*0.62 + noise(x*0.008+frameCount*0.001)*height*0.06);
  vertex(width,height); endShape(CLOSE);
  fill(28,80,22); beginShape(); vertex(0,height);
  for(let x=0; x<=width; x+=6) vertex(x, height*0.70 + noise(x*0.012+frameCount*0.0008+10)*height*0.06);
  vertex(width,height); endShape(CLOSE);
  desenharSol(width*0.75, height*0.18, 55);
  for(let i=0;i<nuvens.length;i++) { let n=nuvens[i]; n.x-=n.vel*0.6; if(n.x<-n.w) n.x=width+n.w; desenhaNuvem(n.x,n.y,n.w,n.alpha,false); }
  
  fill(0,200); rect(width/2-310,30,620,90,12);
  fill(255,240,100); textSize(32); text('AGRINHO 2026', width/2, 62);
  fill(180,240,140); textSize(15); text('Agro forte, futuro sustentável', width/2, 92);
  
  let bW=210, bH=52, bGap=18, totalW=3*bW+2*bGap, bX0=(width-totalW)/2, bY=height/2+10;
  let botoes = ['CAMPANHA', 'SANDBOX', 'PLANTAÇÃO'];
  let descs = ['6 FASES NARRATIVAS', 'MODO LIVRE', 'SIMULAÇÃO AGRÍCOLA'];
  for(let i=0;i<3;i++) {
    let bx = bX0 + i*(bW+bGap);
    let hover = (mouseX>bx && mouseX<bx+bW && mouseY>bY && mouseY<bY+bH);
    fill(hover ? color(40,120,30) : color(15,55,12));
    rect(bx, bY, bW, bH, 8);
    fill(hover ? color(220,255,165) : color(160,220,100));
    textSize(15); text(botoes[i], bx+bW/2, bY+bH/2);
    textSize(10); fill(120,200,90); text(descs[i], bx+bW/2, bY+bH/2+17);
  }
  fill(80,140,60,140); textSize(9); text('[R] Trailer | Clique para selecionar', width/2, height-32);
}

function rodapeCreditos() { fill(80,80,80,180); textSize(10); textAlign(RIGHT,BOTTOM); text('© Agrinho 2026', width-10, height-6); textAlign(CENTER,CENTER); }
function desenharCubo(cx,cy,t,ang) {}
function desenharSol(sx,sy,raio) {}
function desenhaNuvem(x,y,w,al,pesada) {}
function desenhaTrator(x,y,esc) {}
function bordaEscura() {}

// ═════════════════════════════════════════════════════════════
// ROTEADOR
// ═════════════════════════════════════════════════════════════
function rodarJogoPrincipal() {
  if(trailerAtivo) { executarTrailer(); return; }
  if(plantActive) { executarPlantacao(); return; }
  if(sandboxActive) { executarSandbox(); return; }
  if(campaignActive) { executarCampanha(); return; }
  desenharMenuPrincipal();
}

function executarTrailer() {
  trailerFrame++;
  background(0);
  fill(255); textSize(30); text('AGRINHO 2026', width/2, height/2);
  textSize(14); text('Agro forte, futuro sustentável', width/2, height/2+40);
  if(trailerFrame>180 || keyIsPressed) { trailerAtivo=false; trailerFrame=0; }
}

// ═════════════════════════════════════════════════════════════
// CAMPANHA (CARREIRA) 2D
// ═════════════════════════════════════════════════════════════
let cameraX2 = 0, cameraY2 = 0;
const TAMANHO_CELULA = 28;

function executarCampanha() {
  switch(campaignState) {
    case 'levelSelect': desenharSelecionarFase(); break;
    case 'preCutscene': executarCutscene(); break;
    case 'gameplay': executarGameplay(); break;
    case 'pause': desenharPause(); break;
    case 'win': desenharWin(); break;
    case 'ending': executarEnding(); break;
  }
}

function desenharSelecionarFase() {
  for(let y=0; y<height; y++) stroke(lerp(12,28,y/height), lerp(35,72,y/height), lerp(12,28,y/height)), line(0,y,width,y);
  fill(0,200); rect(0,0,width,52);
  fill(180,255,140); textSize(18); text('CAMPANHA — SELECIONE A FASE', width/2, 26);
  let cols=3, bw=238, bh=105, gx=(width-cols*bw-(cols-1)*14)/2, gy=62;
  for(let i=0;i<6;i++) {
    let col=i%cols, row=floor(i/cols), bx=gx+col*(bw+14), by=gy+row*(bh+12);
    let unlocked = phasesUnlocked[i];
    let pd = PHASE_DATA[i];
    fill(unlocked ? color(18,55,14) : color(10,22,10));
    if(unlocked && mouseX>bx && mouseX<bx+bw && mouseY>by && mouseY<by+bh) fill(30,85,22);
    rect(bx,by,bw,bh,8);
    fill(pd.skyTop[0],pd.skyTop[1],pd.skyTop[2]); rect(bx+2,by+2,bw-4,35,6,6,0,0);
    fill(unlocked?255:150); textSize(13); text(pd.name, bx+10, by+46);
    fill(unlocked?200:100); textSize(10); text(pd.subtitle, bx+10, by+62);
    if(!unlocked) { fill(255); textSize(18); text('🔒', bx+bw-25, by+bh/2); }
  }
  fill(0,160); rect(10,height-38,100,28,5);
  fill(160,220,120); textSize(10); text('[ESC] VOLTAR', 60, height-24);
}

function iniciarFase(idx) {
  currentPhase = idx;
  player.x = SPAWNS[idx][0]; player.y = SPAWNS[idx][1]; player.angle = SPAWNS[idx][2];
  player.stamina = 100; player.health = 100;
  let pd = PHASE_DATA[idx];
  objTotal = pd.objTotal; objDone = 0; phaseWin = false;
  phaseTimer = pd.hasTimer ? pd.timerSec * 60 : -1;
  dialogActive = false; dialogNPC = null; pickupAnim = 0;
  
  activeNPCs = [];
  for(let n of NPC_DATA[idx]) activeNPCs.push({ charIdx:n.c, x:n.x, y:n.y, dialogSet:n.d, walkAngle:random(TWO_PI), walkTimer:0, talking:false });
  
  spots = [];
  for(let i=0;i<objTotal;i++) {
    let x,y;
    do { x = random(2,22); y = random(2,22); } while(MAPS[currentPhase][floor(y)][floor(x)] !== 0);
    spots.push({ x:x, y:y, done:false });
  }
  
  initGameAudio();
  csIdx = 0; csFrame = 0;
  campaignState = 'preCutscene';
}

function avancarCutscene() { csIdx++; csFrame=0; if(csIdx>=CUTSCENE_DATA[currentPhase].length) { campaignState='gameplay'; if(cnvElt&&cnvElt.requestPointerLock) cnvElt.requestPointerLock(); } }

function executarCutscene() {
  csFrame++;
  let sc = CUTSCENE_DATA[currentPhase];
  if(csIdx>=sc.length) { campaignState='gameplay'; return; }
  let cena = sc[csIdx], dur = cena[2], fadeAl = csFrame<40 ? map(csFrame,0,40,0,255) : csFrame>dur-40 ? map(csFrame,dur-40,dur,255,0) : 255;
  background(0);
  fill(0,fadeAl*0.9); rect(0,height-140,width,140);
  fill(255,fadeAl); textSize(14); text(cena[0].toUpperCase(), 20, height-110);
  fill(220,fadeAl); textSize(12); text(cena[1], 20, height-80);
  fill(80,180,60,fadeAl); textSize(9); text('[ESPAÇO] '+(csIdx+1)+'/'+sc.length, width-12, height-8);
  if(csFrame>=dur) avancarCutscene();
}

function executarGameplay() {
  atualizarPlayer2D();
  atualizarNPCs2D();
  if(phaseTimer>0) phaseTimer--;
  if(phaseTimer===0 && !phaseWin) {
    phaseWin = true;
    if(currentPhase<5) phasesUnlocked[currentPhase+1] = true;
    saveProgress();
  }
  if(phaseWin) { campaignState='win'; return; }
  renderizarCena2D();
  desenharBracos2D();
  desenharHUD2D();
  desenharMiniMapa();
  if(dialogActive) desenharDialogo();
  if(pickupAnim>0) { desenharPickupFx(); pickupAnim--; }
}

function renderizarCena2D() {
  let map2 = MAPS[currentPhase];
  cameraX2 = player.x * TAMANHO_CELULA - width/2 + TAMANHO_CELULA/2;
  cameraY2 = player.y * TAMANHO_CELULA - height/2 + TAMANHO_CELULA/2;
  cameraX2 = constrain(cameraX2, 0, MAPSIZE * TAMANHO_CELULA - width);
  cameraY2 = constrain(cameraY2, 0, MAPSIZE * TAMANHO_CELULA - height);
  push();
  translate(-cameraX2, -cameraY2);
  for(let y=0; y<MAPSIZE; y++) {
    for(let x=0; x<MAPSIZE; x++) {
      let tile = map2[y][x];
      let xp = x * TAMANHO_CELULA;
      let yp = y * TAMANHO_CELULA;
      if(tile===1) {
        fill(101,67,33); rect(xp,yp,TAMANHO_CELULA,TAMANHO_CELULA);
        fill(139,90,43); rect(xp+4,yp+4,TAMANHO_CELULA-8,TAMANHO_CELULA-8);
      } else if(tile===2) {
        fill(101,67,33); rect(xp+10,yp+14,8,14);
        fill(34,139,34); ellipse(xp+14,yp+10,18,18);
      } else if(tile===3) {
        fill(160,80,40); rect(xp,yp,TAMANHO_CELULA,TAMANHO_CELULA);
        fill(200,120,60); rect(xp+4,yp+4,TAMANHO_CELULA-8,TAMANHO_CELULA-8);
      } else if(tile===4) {
        fill(80,140,40); rect(xp+12,yp+14,4,14);
        fill(60,120,35); ellipse(xp+14,yp+10,10,12);
      } else {
        let cor = 90 + (x*3+y*2)%40;
        fill(cor, cor-20, cor-50); rect(xp,yp,TAMANHO_CELULA,TAMANHO_CELULA);
        fill(70,50,30,80); ellipse(xp+14,yp+20,10,6);
      }
    }
  }
  for(let sp of spots) if(!sp.done) {
    let xp = sp.x * TAMANHO_CELULA, yp = sp.y * TAMANHO_CELULA;
    let pulse = 150 + sin(frameCount*0.1)*105;
    fill(255,100,100,pulse); ellipse(xp+14,yp+14,24,24);
    fill(255,50,50); ellipse(xp+14,yp+14,16,16);
    fill(255); textSize(16); text(PHASE_DATA[currentPhase].icone, xp+14, yp+14);
  }
  for(let n of activeNPCs) {
    let ch = CHARS[n.charIdx];
    let xp = n.x * TAMANHO_CELULA, yp = n.y * TAMANHO_CELULA;
    fill(ch.shirtR,ch.shirtG,ch.shirtB); rect(xp+5,yp+10,18,18,3);
    fill(ch.skinR,ch.skinG,ch.skinB); ellipse(xp+14,yp+8,14,14);
    if(ch.hat) { fill(ch.shirtR*0.6,ch.shirtG*0.6,ch.shirtB*0.6); rect(xp+7,yp+2,14,5,2); }
    fill(0); ellipse(xp+10,yp+7,2,2); ellipse(xp+18,yp+7,2,2);
    fill(255,255,200); textSize(7); text(ch.name, xp+14, yp-2);
  }
  let xp = player.x * TAMANHO_CELULA, yp = player.y * TAMANHO_CELULA;
  fill(60,120,60); rect(xp+5,yp+10,18,18,3);
  fill(255,200,150); ellipse(xp+14,yp+8,14,14);
  fill(101,67,33); rect(xp+7,yp+2,14,5,2);
  fill(0); ellipse(xp+10,yp+7,2,2); ellipse(xp+18,yp+7,2,2);
  let ang = player.angle, dx = cos(ang)*10, dy = sin(ang)*10;
  fill(255,200,100); triangle(xp+14+dx, yp+14+dy, xp+14+dx*0.3+4, yp+14+dy*0.3, xp+14+dx*0.3-4, yp+14+dy*0.3);
  pop();
}

function desenharMiniMapa() {
  let map2 = MAPS[currentPhase];
  let miniSize = 90, cellSize = miniSize/9, offX = width-miniSize-10, offY = 55;
  fill(0,180); rect(offX-2,offY-2,miniSize+4,miniSize+4,5);
  let startX = max(0, min(MAPSIZE-9, floor(player.x)-4));
  let startY = max(0, min(MAPSIZE-9, floor(player.y)-4));
  for(let i=0;i<9;i++) for(let j=0;j<9;j++) {
    let mx = startX+j, my = startY+i;
    if(mx<MAPSIZE && my<MAPSIZE) {
      let tile = map2[my][mx];
      let cor = (tile===1) ? color(80,70,50) : color(100,80,50);
      fill(cor); rect(offX+j*cellSize, offY+i*cellSize, cellSize, cellSize);
    }
  }
  let px = offX + ((player.x-startX)*cellSize);
  let py = offY + ((player.y-startY)*cellSize);
  fill(255,255,100); ellipse(px, py, cellSize*0.8, cellSize*0.8);
}

function desenharBracos2D() {
  let pd = PHASE_DATA[currentPhase];
  fill(0,180); rect(width-150, height-50, 140, 40, 8);
  fill(255,200,80); textSize(11); text(pd.icone+' '+pd.tool, width-140, height-30);
  fill(200); textSize(9); text('[E] Interagir', width-140, height-18);
  if(!pointerLocked && campaignState==='gameplay') {
    fill(0,140); rect(width/2-105, height-45, 210, 20, 4);
    fill(255,200,80); textSize(9); text('CLIQUE para travar a câmera', width/2, height-35);
  }
}

function desenharHUD2D() {
  let pd = PHASE_DATA[currentPhase];
  fill(0,195); rect(0,0,width,48);
  fill(175,248,140); textSize(12); text(pd.name+' — '+pd.subtitle, 14,20);
  fill(135,200,105); textSize(9); text(pd.toolTip+' | WASD mover | E interagir', 14,35);
  let prog = objDone / max(objTotal,1);
  fill(0,100); rect(width/2-85,10,170,28,4);
  fill(28,100,22); rect(width/2-83,12,166*prog,24,3);
  fill(195,255,165); textSize(11); text(pd.objLabel+': '+objDone+'/'+objTotal, width/2,28);
  if(phaseTimer>0) { let secs = ceil(phaseTimer/60); fill(255,220,80); textSize(14); text('⏱ '+floor(secs/60)+':'+nf(secs%60,2), width-14,24); }
  let cx=width/2, cy=height/2;
  stroke(255,255,255,200); strokeWeight(1.5);
  line(cx-10,cy, cx-4,cy); line(cx+4,cy, cx+10,cy);
  line(cx,cy-10, cx,cy-4); line(cx,cy+4, cx,cy+10);
  noStroke();
  fill(0,120); rect(width-124,52,110,13,3);
  fill(player.running ? color(255,175,0) : color(65,195,65)); rect(width-122,54, player.stamina,9,2);
  fill(195,200,175); textSize(9); text('STAMINA', width-14,58);
  fill(0,160); rect(0,height-26,width,26);
  fill(145,195,115); textSize(8); text('WASD/Setas mover | E interagir | ESC pausar', 14, height-13);
}

function desenharDialogo() {
  if(!dialogNPC) return;
  let lines = DIALOGUES[currentPhase][dialogNPC.dialogSet] || [];
  if(dialogLine >= lines.length) { dialogActive=false; dialogNPC=null; return; }
  fill(0,220); rect(0,height-118,width,118);
  stroke(65,150,50); line(0,height-118,width,height-118); noStroke();
  fill(235,230,212); textSize(12); text(lines[dialogLine], 20, height-70);
  fill(135,195,115); textSize(9); text('[E] Próximo', width-40, height-12);
}

function desenharPickupFx() {
  let prog = 1 - pickupAnim/45, alpha = map(pickupAnim,45,0,255,0), scale2 = 1+prog*0.5;
  fill(115,255,115,alpha*0.32); ellipse(width/2,height/2,82*scale2,82*scale2);
  fill(195,255,175,alpha); textSize(16); text('+1 '+PHASE_DATA[currentPhase].tool, width/2, height/2-42-prog*18);
  if(objDone>=objTotal && !phaseWin) { fill(255,255,100,alpha); textSize(20); text('FASE COMPLETA!', width/2, height/2-72-prog*14); }
}

function desenharPause() {
  fill(0,200); rect(0,0,width,height);
  fill(215,255,175); textSize(42); text('PAUSADO', width/2, height/4);
  let opts = ['▶ CONTINUAR','↺ REINICIAR','≡ SELECIONAR','✕ MENU'];
  for(let i=0;i<4;i++) {
    let y = height/2 + i*50;
    fill(pauseOpt===i?35:14, pauseOpt===i?105:38, pauseOpt===i?25:12);
    rect(width/2-120, y-20, 240,40,8);
    fill(pauseOpt===i?255:200); textSize(14); text(opts[i], width/2, y);
  }
}

function desenharWin() {
  background(30,80,30);
  fill(220,255,160); textSize(46); text('FASE CONCLUÍDA!', width/2, height/3);
  fill(180,235,130); textSize(20); text(PHASE_DATA[currentPhase].name, width/2, height/2);
  fill(115,235,95); textSize(14); text('Objetivos: '+objDone+'/'+objTotal, width/2, height/2+40);
  if(currentPhase<5) { fill(75,215,255); textSize(13); text('[ESPAÇO] Próxima Fase', width/2, height-60); }
  else { fill(255,215,55); text('[ESPAÇO] Ver Encerramento', width/2, height-60); }
  text('[ESC] Selecionar Fase', width/2, height-35);
}

function executarEnding() {
  csFrame++;
  if(csIdx >= ENDING_SCENES.length) { campaignActive=false; campaignState='levelSelect'; return; }
  let sc = ENDING_SCENES[csIdx], dur = sc[2];
  background(20,60,30);
  fill(0,220); rect(0,height-140,width,140);
  fill(255); textSize(16); text(sc[0].toUpperCase(), 20, height-100);
  fill(220); textSize(12); text(sc[1], 20, height-60);
  if(csFrame >= dur) { csIdx++; csFrame=0; }
}

function atualizarPlayer2D() {
  if(dialogActive) return;
  let map2 = MAPS[currentPhase];
  let spd = 0.12;
  if(keyIsDown(SHIFT)) spd = 0.2;
  if(keyIsDown(CONTROL)) spd = 0.06;
  player.running = keyIsDown(SHIFT);
  player.crouching = keyIsDown(CONTROL);
  if(player.running) {
    player.stamina = max(0, player.stamina - 0.28);
    if(player.stamina <= 0) spd = 0.08;
  } else player.stamina = min(100, player.stamina + 0.18);
  
  let dx=0, dy=0;
  if(keyIsDown(87)||keyIsDown(UP_ARROW)) dy -= spd;
  if(keyIsDown(83)||keyIsDown(DOWN_ARROW)) dy += spd;
  if(keyIsDown(65)||keyIsDown(LEFT_ARROW)) dx -= spd;
  if(keyIsDown(68)||keyIsDown(RIGHT_ARROW)) dx += spd;
  
  if(dx!==0 || dy!==0) { player.angle = atan2(dy,dx); player.moving = true; }
  else player.moving = false;
  
  let nx = player.x+dx, ny = player.y+dy, r=0.35;
  function isWalkable(x,y) {
    let x1=floor(x-r), x2=floor(x+r), y1=floor(y-r), y2=floor(y+r);
    for(let iy=y1; iy<=y2; iy++)
      for(let ix=x1; ix<=x2; ix++)
        if(ix>=0 && ix<MAPSIZE && iy>=0 && iy<MAPSIZE && map2[iy][ix]===1) return false;
    return true;
  }
  if(isWalkable(nx, player.y)) player.x = nx;
  if(isWalkable(player.x, ny)) player.y = ny;
  
  if(pointerLocked) { player.angle += nativeMovX*0.005; nativeMovX=0; nativeMovY=0; }
  
  if(keyIsDown(69) && !dialogActive && interactCool<=0) { verificarInteracao2D(); interactCool=22; }
  if(interactCool>0) interactCool--;
  if(player.moving) { stepTimer++; let rate = player.running?18:28; if(stepTimer%rate===0) playStep(); }
}

function atualizarNPCs2D() {
  for(let n of activeNPCs) {
    n.walkTimer++;
    if(n.walkTimer>80 && !n.talking) {
      n.walkAngle += random(-0.2,0.2);
      let dx = cos(n.walkAngle)*0.03, dy = sin(n.walkAngle)*0.03;
      let nx = n.x+dx, ny = n.y+dy;
      let map2 = MAPS[currentPhase];
      let tileX = floor(nx), tileY = floor(ny);
      if(nx>1 && nx<MAPSIZE-1 && ny>1 && ny<MAPSIZE-1 && map2[tileY][tileX]!==1) {
        n.x = nx; n.y = ny;
      } else { n.walkAngle += PI; }
    }
    if(n.walkTimer>180) n.walkTimer=0;
  }
}

function verificarInteracao2D() {
  for(let n of activeNPCs) if(dist(player.x, player.y, n.x, n.y) < 2.4) { dialogActive=true; dialogNPC=n; dialogLine=0; n.talking=true; playDialog(); return; }
  for(let s of spots) if(!s.done && dist(player.x, player.y, s.x, s.y) < 1.8) { s.done=true; objDone++; pickupAnim=45; playPickup(); if(objDone>=objTotal) { phaseWin=true; if(currentPhase<5) phasesUnlocked[currentPhase+1]=true; saveProgress(); } return; }
}

function saveProgress() { try { localStorage.setItem('agrinho2026_v8', JSON.stringify(phasesUnlocked)); } catch(e){} }
function dist(x1,y1,x2,y2) { return sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2)); }

// ═════════════════════════════════════════════════════════════
// SANDBOX
// ═════════════════════════════════════════════════════════════
function iniciarSandbox() {
  sandboxActive = true;
  player.x = 12; player.y = 12; player.angle = 0;
  currentPhase = 5;
  activeNPCs = [];
  spots = [];
  initGameAudio();
  if(cnvElt && cnvElt.requestPointerLock) cnvElt.requestPointerLock();
}

function executarSandbox() {
  atualizarPlayer2D();
  renderizarCena2D();
  desenharHUD2D();
  fill(255,200,80); textSize(12); text('🏞️ MODO SANDBOX — '+SB_WEATHER_NAMES[sbWeather], 20, 60);
  fill(200); textSize(9); text('C = mudar clima | ESC sair', 20, 80);
}

// ═════════════════════════════════════════════════════════════
// PLANTAÇÃO
// ═════════════════════════════════════════════════════════════
function executarPlantacao() {
  background(30,70,30);
  fill(0,200); rect(0,0,width,40);
  fill(120,255,100); textSize(16); text('🌱 PLANTAÇÃO — SIMULADOR AGRÍCOLA', width/2, 22);
  let cellW=70, cellH=55, offX=40, offY=60;
  for(let i=0;i<plantGrid.length;i++) {
    let cell = plantGrid[i], x = offX+cell.col*cellW, y = offY+cell.row*cellH, sel = (cell.col===plantCursor.col && cell.row===plantCursor.row);
    fill(100,70,40); rect(x,y,cellW-4,cellH-4,4);
    if(cell.stage>0) { fill(60,140,60); ellipse(x+cellW/2-2,y+cellH-12,12,12); fill(80,180,70); rect(x+cellW/2-6,y+cellH-25,8,15); if(cell.stage>=3) { fill(200,180,50); ellipse(x+cellW/2-2,y+cellH-30,8,10); } }
    else { fill(80,55,35); ellipse(x+cellW/2-2,y+cellH-10,10,6); }
    if(cell.hasPest) { fill(255,80,40,200); ellipse(x+cellW-12,y+10,10,10); fill(255); text('!', x+cellW-12, y+12); }
    fill(200,180,120); textSize(8); text('pH:'+cell.pH.toFixed(1), x+4, y+12);
    if(sel) { stroke(120,255,80); strokeWeight(2); noFill(); rect(x,y,cellW-4,cellH-4,4); noStroke(); }
    if(cell.stage>0 && cell.stage<5 && cell.water>30 && cell.pH>5.5 && cell.pH<7.5 && !cell.hasPest) { cell.growTimer=(cell.growTimer||0)+1; if(cell.growTimer>180) { cell.stage=min(5,cell.stage+1); cell.growTimer=0; if(cell.stage===5) plantResources.creditos=min(100,plantResources.creditos+5); } }
    if(frameCount%90===0) cell.water=max(0,cell.water-random(1,3));
    if(!cell.hasPest && cell.stage>1 && random()<0.002) cell.hasPest=true;
  }
  fill(0,180); rect(0,height-80,width,80);
  fill(255,220,100); textSize(11); text('💧 ÁGUA: '+plantResources.agua+'   🌿 CRÉDITOS: '+plantResources.creditos+'   🌾 SEMENTES: '+plantResources.sementes, 10, height-60);
  fill(200); textSize(10); text('🔧 '+PLANT_TOOLS[plantTool]+' | 1-5 trocar | ESPAÇO usar | ↑↓←→ mover | ESC sair', 10, height-35);
  if(plantMsgTimer>0) { plantMsgTimer--; fill(0,200); rect(width/2-150,height-130,300,30,5); fill(255); textSize(12); text(plantMsg, width/2, height-115); }
}

// ═════════════════════════════════════════════════════════════
// INPUTS
// ═════════════════════════════════════════════════════════════
function mousePressed() {
  if(estadoTela===0) { mudarEstado(1); return; }
  if(estadoTela===4 && !trailerAtivo && !campaignActive && !sandboxActive && !plantActive) {
    let bW=210, bH=52, bGap=18, totalW=3*bW+2*bGap, bX0=(width-totalW)/2, bY=height/2+10;
    for(let i=0;i<3;i++) {
      let bx = bX0 + i*(bW+bGap);
      if(mouseX>bx && mouseX<bx+bW && mouseY>bY && mouseY<bY+bH) {
        if(i===0) { campaignActive=true; campaignState='levelSelect'; }
        else if(i===1) { iniciarSandbox(); }
        else { plantActive=true; iniciarPlantacao(); }
        return;
      }
    }
  }
  if(campaignActive && campaignState==='levelSelect') {
    let cols=3, bw=238, bh=105, gx=(width-cols*bw-(cols-1)*14)/2, gy=62;
    for(let i=0;i<6;i++) {
      let col=i%cols, row=floor(i/cols), bx=gx+col*(bw+14), by=gy+row*(bh+12);
      if(mouseX>bx && mouseX<bx+bw && mouseY>by && mouseY<by+bh && phasesUnlocked[i]) { iniciarFase(i); return; }
    }
  }
  if(campaignActive && campaignState==='preCutscene') { avancarCutscene(); return; }
  if(campaignActive && campaignState==='gameplay' && dialogActive) { dialogLine++; let d=DIALOGUES[currentPhase][dialogNPC.dialogSet]||[]; if(dialogLine>=d.length) { dialogActive=false; if(dialogNPC) dialogNPC.talking=false; dialogNPC=null; } }
}

function keyPressed() {
  keys[key]=true;
  if(estadoTela===3) { mudarEstado(4); return; }
  if(estadoTela===4 && !trailerAtivo && !campaignActive && !sandboxActive && !plantActive && (key==='r'||key==='R')) { trailerAtivo=true; trailerFrame=0; return; }
  if(sandboxActive && keyCode===ESCAPE) { sandboxActive=false; if(document.exitPointerLock) document.exitPointerLock(); return; }
  if(sandboxActive && (key==='c'||key==='C')) { sbWeather=(sbWeather+1)%4; return; }
  if(plantActive && keyCode===ESCAPE) { plantActive=false; return; }
  if(plantActive && key>='1' && key<='5') { plantTool=parseInt(key)-1; return; }
  if(plantActive && keyCode===32) {
    let idx = plantCursor.row*PLANT_COLS+plantCursor.col;
    if(idx>=0 && idx<plantGrid.length) {
      let cell = plantGrid[idx];
      if(plantTool===0) plantMsg='pH:'+cell.pH.toFixed(1)+' Água:'+floor(cell.water)+'% Estágio:'+cell.stage;
      else if(plantTool===1 && cell.stage===0) { cell.stage=1; plantMsg='Solo arado!'; }
      else if(plantTool===2 && cell.stage===1 && plantResources.sementes>=3) { cell.stage=2; plantResources.sementes-=3; plantMsg='Semeado!'; }
      else if(plantTool===3 && plantResources.agua>=8) { cell.water=min(100,cell.water+20); plantResources.agua-=8; plantMsg='Irrigado!'; }
      else if(plantTool===4 && cell.hasPest && plantResources.creditos>=10) { cell.hasPest=false; plantResources.creditos-=10; plantMsg='Praga eliminada!'; }
      else plantMsg='Ação inválida!';
      plantMsgTimer=90;
    }
  }
  if(plantActive && keyCode===LEFT_ARROW) plantCursor.col=max(0,plantCursor.col-1);
  if(plantActive && keyCode===RIGHT_ARROW) plantCursor.col=min(PLANT_COLS-1,plantCursor.col+1);
  if(plantActive && keyCode===UP_ARROW) plantCursor.row=max(0,plantCursor.row-1);
  if(plantActive && keyCode===DOWN_ARROW) plantCursor.row=min(PLANT_ROWS-1,plantCursor.row+1);
  
  if(!campaignActive) return;
  if(campaignState==='levelSelect' && keyCode===ESCAPE) { campaignActive=false; return; }
  if(campaignState==='preCutscene' && keyCode===32) { avancarCutscene(); return; }
  if(campaignState==='gameplay' && keyCode===ESCAPE) { campaignState='pause'; pauseOpt=0; if(document.exitPointerLock) document.exitPointerLock(); return; }
  if(campaignState==='gameplay' && (key==='e'||key==='E') && dialogActive) { dialogLine++; let d=DIALOGUES[currentPhase][dialogNPC.dialogSet]||[]; if(dialogLine>=d.length) { dialogActive=false; if(dialogNPC) dialogNPC.talking=false; dialogNPC=null; } return; }
  if(campaignState==='pause') {
    if(keyCode===ESCAPE) campaignState='gameplay';
    if(keyCode===UP_ARROW) pauseOpt=(pauseOpt+3)%4;
    if(keyCode===DOWN_ARROW) pauseOpt=(pauseOpt+1)%4;
    if(keyCode===ENTER) {
      if(pauseOpt===0) campaignState='gameplay';
      else if(pauseOpt===1) iniciarFase(currentPhase);
      else if(pauseOpt===2) campaignState='levelSelect';
      else if(pauseOpt===3) { campaignActive=false; if(document.exitPointerLock) document.exitPointerLock(); }
    }
  }
  if(campaignState==='win' && keyCode===32) { if(currentPhase<5) iniciarFase(currentPhase+1); else { csIdx=0; csFrame=0; campaignState='ending'; } }
  if(campaignState==='win' && keyCode===ESCAPE) campaignState='levelSelect';
}

function keyReleased() { keys[key]=false; }
