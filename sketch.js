// ═════════════════════════════════════════════════════════════
// AGRINHO 2026 - AGRO FORTE, FUTURO SUSTENTÁVEL
// Jogo 100% em primeira pessoa | JavaScript Puro (sem bibliotecas)
// ═════════════════════════════════════════════════════════════

// ==================== ELEMENTOS DOM ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');
const loadingDiv = document.getElementById('loading');

// ==================== ESTADOS GLOBAIS ====================
let estadoTela = 0;          // 0=clique, 1=aviso, 2=estúdio, 3=menu, 4=jogo
let tempoEstado = 0;
let campaignActive = false;
let trailerAtivo = false;
let trailerFrame = 0;
let menuHover = -1;
let menuCam = 0;
let menuStars = [];
const OPCOES_MENU = ["🚜 CAMPANHA", "🌿 SANDBOX"];

// ==================== PARTÍCULAS ====================
let nuvens = [], passaros = [], graos = [], poeira = [], brasas = [], fumaca = [];
let anguloCubo = 0;
let frameCount = 0;

// ==================== ÁUDIO (Web Audio API) ====================
let audioCtx = null;
let musicGain = null;
let musicOscs = [];
let musicInterval = null;
let musicActive = false;
let audioReady = false;
let stepTimer = 0;
let windNoise = null;

// ==================== CAMPANHA ====================
let campaignState = "levelSelect";
let currentPhase = 0;
let phasesUnlocked = [true, false, false, false, false, false];
let csFrame = 0, csIdx = 0;
let pauseOpt = 0;

// ==================== SANDBOX ====================
let sandboxActive = false;
let sbWeather = 0, sbTool = 0, sbWeatherTimer = 0, lightningFlash = 0, stormParts = [];
const SB_WEATHER_NAMES = ["☀ DIA CLARO", "⛅ NUBLADO", "🌙 NOITE TÁTICA", "⛈ TEMPESTADE"];

// ==================== PLAYER ====================
let player = {
    x: 3.5, y: 3.5, angle: 0, pitch: 0,
    stamina: 100, health: 100,
    running: false, crouching: false, moving: false, bobTime: 0
};
let pointerLocked = false;
let mouseX = 0, mouseY = 0;
let keys = {};
let zBuf = new Float32Array(800);
let windParts = [];

// ==================== OBJETIVOS ====================
let objTotal = 0, objDone = 0;
let phaseTimer = -1, phaseWin = false;

// ==================== INTERAÇÃO ====================
let dialogActive = false, dialogNPC = null, dialogLine = 0, interactCool = 0;
let pickupAnim = 0;
let activeNPCs = [], spots = [];
let lastTimestamp = 0;
let movedX = 0, movedY = 0;

// ==================== CONSTANTES ====================
const MAPSIZE = 24;
const TEX = 32;
let txWall = [], txTree = [], txBarn = [], txCorn = [], txRock = [];

// ==================== MAPAS (6 fases) ====================
const SPAWNS = [[3.5,3.5,0],[2.5,3.5,0],[2.5,16.5,0],[2.5,2.5,0],[3.5,3.5,0],[3.5,3.5,0]];

const MAPS = [
  // Fase 1
  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,2,0,0,0,0,4,4,4,4,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,7,0,0,4,4,4,4,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,0,0,1,3,3,1,0,0,0,2,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,0,0,1,0,0,1,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,4,0,0,0,7,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,4,4,0,0,0,7,4,4,4,0,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  // Fase 2 (simplificada por espaço - mesmo padrão)
  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,2,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,2,0,0,0,4,4,4,4,4,4,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,2,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,4,4,0,0,0,0,4,4,4,0,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  // Fases 3-6 (mesmo padrão simplificado por espaço)
  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],[1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,1],[1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],[1,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  // Fases 4,5,6 (copiamos a estrutura da fase 1 para simplificar - funcional)
  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,2,0,0,0,0,4,4,4,4,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,7,0,0,4,4,4,4,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,0,0,1,3,3,1,0,0,0,2,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,0,0,1,0,0,1,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,4,0,0,0,7,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,4,4,0,0,0,7,4,4,4,0,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  // Fase 5
  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  // Fase 6
  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,2,0,0,0,2,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,0,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,0,0,2,0,0,2,0,0,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,0,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,2,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,4,4,4,4,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,4,4,0,0,0,0,4,4,4,4,0,0,0,0,4,4,0,0,0,0,0,1],[1,0,4,4,0,2,0,0,4,4,4,4,0,0,2,0,4,4,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]
];

// ==================== DADOS DE FASE ====================
const PHASE_DATA = [
  {name:"FASE 1",subtitle:"Escaneamento do Solo",tool:"SCANNER",toolTip:"[E] Escanear ponto crítico",objLabel:"Pontos escaneados",objTotal:5,hasTimer:false,skyTop:[110,185,248],skyBot:[65,138,210],floorTop:[115,82,38],floorBot:[72,50,20],wallR:148,wallG:108,wallB:58,fogR:145,fogG:165,fogB:190,fogDist:14,night:false,fogDensity:0.06},
  {name:"FASE 2",subtitle:"Mapeamento Noturno",tool:"SCANNER NOTURNO",toolTip:"[E] Escanear praga",objLabel:"Pragas mapeadas",objTotal:6,hasTimer:false,skyTop:[8,12,28],skyBot:[4,8,20],floorTop:[18,28,12],floorBot:[8,14,5],wallR:38,wallG:48,wallB:30,fogR:12,fogG:22,fogB:14,fogDist:5.5,night:true,fogDensity:0.16},
  {name:"FASE 3",subtitle:"Interrupção do Agrotóxico",tool:"HACKEAR",toolTip:"[E] Hackear bomba",objLabel:"Bombas desativadas",objTotal:5,hasTimer:true,timerSec:240,skyTop:[205,100,22],skyBot:[160,68,14],floorTop:[118,72,22],floorBot:[80,48,10],wallR:172,wallG:98,wallB:32,fogR:190,fogG:115,fogB:48,fogDist:9,night:false,fogDensity:0.1},
  {name:"FASE 4",subtitle:"Coleta de Amostras",tool:"COLETOR",toolTip:"[E] Coletar amostra",objLabel:"Amostras coletadas",objTotal:6,hasTimer:false,skyTop:[72,70,82],skyBot:[45,44,55],floorTop:[62,52,45],floorBot:[38,30,25],wallR:88,wallG:82,wallB:78,fogR:80,fogG:78,fogB:85,fogDist:9,night:false,fogDensity:0.1},
  {name:"FASE 5",subtitle:"Plantio de Remediação",tool:"PLANTADEIRA",toolTip:"[E] Plantar muda",objLabel:"Mudas plantadas",objTotal:7,hasTimer:false,skyTop:[60,185,205],skyBot:[32,140,165],floorTop:[42,108,52],floorBot:[25,68,30],wallR:42,wallG:108,wallB:68,fogR:120,fogG:178,fogB:195,fogDist:12,night:false,fogDensity:0.07},
  {name:"FASE 6",subtitle:"Inspeção Final",tool:"DRONE",toolTip:"[E] Inspecionar área",objLabel:"Áreas inspecionadas",objTotal:6,hasTimer:false,skyTop:[82,205,252],skyBot:[42,165,222],floorTop:[55,148,55],floorBot:[32,100,32],wallR:68,wallG:152,wallB:68,fogR:150,fogG:210,fogB:240,fogDist:16,night:false,fogDensity:0.05}
];

// ==================== PERSONAGENS ====================
const CHARS = [
  {name:"SEU JUCA",skinR:200,skinG:148,skinB:96,hairR:55,hairG:38,hairB:18,shirtR:180,shirtG:50,shirtB:50,pantR:100,pantG:70,pantB:40,hat:true,coat:false},
  {name:"MARINA",skinR:215,skinG:168,skinB:128,hairR:38,hairG:24,hairB:10,shirtR:55,shirtG:165,shirtB:80,pantR:48,pantG:80,pantB:145,hat:false,coat:false},
  {name:"PEDRO",skinR:198,skinG:158,skinB:118,hairR:78,hairG:52,hairB:28,shirtR:205,shirtG:205,shirtB:225,pantR:58,pantG:78,pantB:162,hat:false,coat:false},
  {name:"D.CONCEIÇÃO",skinR:188,skinG:142,skinB:102,hairR:185,hairG:185,hairB:188,shirtR:225,shirtG:182,shirtB:52,pantR:58,pantG:38,pantB:82,hat:false,coat:false},
  {name:"TONHO",skinR:192,skinG:148,skinB:104,hairR:48,hairG:32,hairB:14,shirtR:82,shirtG:82,shirtB:92,pantR:58,pantG:58,pantB:70,hat:true,coat:false},
  {name:"BIU",skinR:172,skinG:132,skinB:92,hairR:18,hairG:12,hairB:8,shirtR:48,shirtG:122,shirtB:48,pantR:38,pantG:88,pantB:38,hat:true,coat:false},
  {name:"LENA",skinR:222,skinG:178,skinB:138,hairR:205,hairG:162,hairB:58,shirtR:245,shirtG:242,shirtB:205,pantR:205,pantG:202,pantB:165,hat:false,coat:false},
  {name:"DR.COSTA",skinR:202,skinG:162,skinB:122,hairR:58,hairG:42,hairB:28,shirtR:245,shirtG:245,shirtB:250,pantR:78,pantG:78,pantB:100,hat:false,coat:true},
  {name:"ANA",skinR:218,skinG:172,skinB:132,hairR:28,hairG:18,hairB:8,shirtR:162,shirtG:82,shirtB:182,pantR:58,pantG:58,pantB:82,hat:false,coat:false},
  {name:"PROF.CLARA",skinR:228,skinG:182,skinB:142,hairR:118,hairG:78,hairB:38,shirtR:78,shirtG:122,shirtB:205,pantR:58,pantG:48,pantB:82,hat:false,coat:false}
];

// ==================== NPCs por fase ====================
const NPC_DATA = [
  [{c:0,x:7.5,y:7.5,d:0},{c:1,x:10.5,y:5.5,d:1},{c:2,x:14.5,y:9.5,d:2},{c:3,x:5.5,y:13.5,d:3},{c:4,x:16.5,y:13.5,d:4}],
  [{c:1,x:6.5,y:10.5,d:0},{c:5,x:12.5,y:6.5,d:1},{c:8,x:9.5,y:14.5,d:2}],
  [{c:0,x:10.5,y:3.5,d:0},{c:1,x:15.5,y:7.5,d:1},{c:5,x:6.5,y:14.5,d:2},{c:9,x:12.5,y:12.5,d:3}],
  [{c:1,x:5.5,y:8.5,d:0},{c:7,x:10.5,y:4.5,d:1},{c:8,x:15.5,y:10.5,d:2}],
  [{c:0,x:6.5,y:6.5,d:0},{c:1,x:12.5,y:12.5,d:1},{c:2,x:15.5,y:6.5,d:2},{c:7,x:4.5,y:14.5,d:3},{c:4,x:9.5,y:4.5,d:4}],
  [{c:0,x:8.5,y:8.5,d:0},{c:1,x:14.5,y:5.5,d:1},{c:6,x:6.5,y:14.5,d:2},{c:9,x:15.5,y:14.5,d:3},{c:3,x:4.5,y:4.5,d:4}]
];

// ==================== DIÁLOGOS ====================
const DIALOGUES = [
  [["Essa terra tá pedindo socorro...","Quarenta anos lavrando aqui.","Você vê o que eu sinto no olho?"],["Scanner mapeia acidez e umidade.","Encontre os 5 pontos críticos!"],["Papai tá certo de desconfiar...","Mas os dados não mentem."]],
  [["Modo noturno ativo!","Infravermelho detecta pragas."],["Guarda rural aqui.","À noite as pragas ficam espertas."],["Vim registrar a infestação.","Isso é manchete nacional!"]],
  [["Timer rodando! 4 minutos!","Cada bomba desativada salva o rio."],["Contaminação grave!","Desative as bombas rápido!"],["Filmando tudo.","Bombas nos galpões laranja."]],
  [["Trinta anos de trabalho...","Mas a terra se recupera."],["Com as amostras certas, curamos o solo."],["Seja forte, vamos reconstruir."]],
  [["Cada muda é uma promessa.","Plante nos pontos azuis!"],["Raízes profundas filtram o solo.","Espécies nativas."],["Minha mãe dizia: plante uma árvore."]],
  [["Lavoura renascendo!","Inspecione com o drone."],["Certificação sustentável.","Cada área confirmada = ponto."],["Abelhas voltaram!","Biodiversidade de volta!"]]
];

const CUTSCENE_DATA = [
  [["narrador","Paraná, interior. 40 anos de trabalho.",260],["juca","Essa terra tem memória, Tico.",290],["marina","Scanner detecta acidez e umidade.",280],["tico","Encontre os pontos críticos!",220]],
  [["narrador","Pragas atacam na calada da noite.",260],["marina","Infestação severa no norte.",280],["tico","Visão noturna ativada.",240]],
  [["narrador","Agrotóxicos ilegais ameaçam o aquífero.",270],["marina","O rio está em risco! Hackeie o sistema!",300],["tico","ALERTA! 5 bombas. TIMER: 4 MINUTOS!",250]],
  [["narrador","Campo devastado.",270],["juca","Olha o que fizeram com minha terra.",300],["marina","Com as amostras certas, curamos o solo.",285]],
  [["narrador","A recuperação é possível!",260],["marina","Espécies nativas restauram o solo!",290],["tico","Plante nos pontos azuis!",230]],
  [["narrador","Meses depois. A lavoura pulsa.",250],["juca","A tecnologia salvou minha terra.",300],["tico","Inspecione todas as áreas para a vitória!",240]]
];

const ENDING_SCENES = [
  ["narrador","A lavoura foi recuperada. O rio corre limpo.",285],
  ["juca","Marina, você tinha razão. Me perdoe.",295],
  ["marina","Agro forte E futuro sustentável juntos.",285],
  ["tico","Missão concluída! Agrinho 2026!",265]
];

// ==================== FUNÇÕES AUXILIARES ====================
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function mapRange(v, a1, a2, b1, b2) { return b1 + (v - a1) * (b2 - b1) / (a2 - a1); }
function randomRange(min, max) { return min + Math.random() * (max - min); }
function noise2D(x, y) { return Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5; }

// ==================== INICIALIZAÇÃO ====================
function init() {
    buildTextures();
    initParticles();
    initAudio();
    loadProgress();
    requestAnimationFrame(gameLoop);
    setupEventListeners();
}

function buildTextures() {
    for(let v = 0; v < TEX; v++) {
        for(let u = 0; u < TEX; u++) {
            let rough = noise2D(u * 0.22, v * 0.18) * 0.28 + Math.sin(u * 1.1 + v * 0.3) * 0.06 + 0.75;
            txWall.push(rough);
            txTree.push(noise2D(u * 0.09, v * 0.12) * 0.45 + 0.55);
            txBarn.push(noise2D(u * 0.06, v * 0.02) * 0.38 + 0.62);
            txCorn.push(noise2D(u * 0.15, v * 0.18) * 0.3 + 0.5);
            txRock.push(noise2D(u * 0.22, v * 0.22) * 0.42 + 0.48);
        }
    }
}

function getTex(tile, col, row) {
    let idx = (row % TEX) * TEX + (col % TEX);
    switch(tile) {
        case 1: return txWall[idx];
        case 2: return txTree[idx];
        case 3: return txBarn[idx];
        case 4: return txCorn[idx];
        case 5: return txRock[idx];
        default: return 0.85;
    }
}

function initParticles() {
    for(let i = 0; i < 14; i++) nuvens.push({x: randomRange(0, 800), y: randomRange(25, 115), w: randomRange(85, 215), vel: randomRange(0.05, 0.22), alpha: randomRange(150, 235)});
    for(let i = 0; i < 9; i++) passaros.push({x: randomRange(0, 800), y: randomRange(50, 145), tam: randomRange(4, 10), vel: randomRange(0.3, 1.0), fase: randomRange(0, Math.PI * 2)});
    for(let i = 0; i < 240; i++) graos.push({x: randomRange(80, 720), y: randomRange(-650, -5), vy: randomRange(2.5, 7.5), vx: randomRange(-0.8, 0.8), r: randomRange(3, 7.5), ativo: true});
    for(let i = 0; i < 110; i++) menuStars.push({x: randomRange(0, 800), y: randomRange(0, 280), r: randomRange(0.5, 2.5)});
    for(let i = 0; i < 70; i++) windParts.push({x: randomRange(0, 800), y: randomRange(0, 500), speed: randomRange(2, 8), alpha: randomRange(20, 90), len: randomRange(15, 55), curveAmp: randomRange(1, 4), t: randomRange(0, Math.PI * 2)});
    for(let i = 0; i < 60; i++) stormParts.push({x: randomRange(0, 800), y: randomRange(0, 500), len: randomRange(8, 22), spd: randomRange(12, 28), a: randomRange(60, 180)});
}

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0;
        musicGain.connect(audioCtx.destination);
    } catch(e) { console.log("Audio not supported"); }
}

function startAudio() {
    if(audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function loadProgress() {
    try {
        let saved = localStorage.getItem('agrinho2026_v8');
        if(saved) phasesUnlocked = JSON.parse(saved);
    } catch(e) {}
}

function saveProgress() {
    try {
        localStorage.setItem('agrinho2026_v8', JSON.stringify(phasesUnlocked));
    } catch(e) {}
}

// ==================== EVENTOS ====================
function setupEventListeners() {
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
}

function handleCanvasClick(e) {
    if(estadoTela === 0) {
        startAudio();
        mudarEstado(1);
    }
}

function handleMouseDown(e) {
    if(estadoTela === 4 && (campaignActive && campaignState === 'gameplay') && !trailerAtivo && !sandboxActive) {
        canvas.requestPointerLock();
    }
}

function handlePointerLockChange() {
    pointerLocked = document.pointerLockElement === canvas;
    if(!pointerLocked) {
        mouseX = 0;
        mouseY = 0;
    }
}

function handleMouseMove(e) {
    if(pointerLocked && estadoTela === 4 && campaignActive && campaignState === 'gameplay') {
        player.angle += (e.movementX || 0) * 0.002;
        player.pitch = clamp(player.pitch + (e.movementY || 0) * 1.5, -80, 80);
    }
    movedX = e.movementX || 0;
    movedY = e.movementY || 0;
}

function handleKeyDown(e) {
    let k = e.key;
    keys[k] = true;
    keys[k.toLowerCase()] = true;
    
    if(estadoTela === 3 && (k === 'r' || k === 'R')) {
        trailerFrame = 0;
        for(let i = 0; i < graos.length; i++) { graos[i].y = randomRange(-600, -5); graos[i].ativo = true; }
        trailerAtivo = true;
        mudarEstado(4);
        return;
    }
    
    if(estadoTela === 3) {
        mudarEstado(4);
        return;
    }
    
    if(estadoTela === 4 && trailerAtivo && (k === ' ' || k === 'Space' || k === 'Escape')) {
        finalizarTrailer();
        return;
    }
    
    if(estadoTela === 4 && !trailerAtivo && !campaignActive && !sandboxActive) {
        if(k === 'r' || k === 'R') {
            trailerFrame = 0;
            for(let i = 0; i < graos.length; i++) { graos[i].y = randomRange(-600, -5); graos[i].ativo = true; }
            trailerAtivo = true;
        }
        return;
    }
    
    if(sandboxActive) {
        if(k === 'Escape') { sandboxActive = false; if(document.exitPointerLock) document.exitPointerLock(); return; }
        if(k === 'c' || k === 'C') { sbWeather = (sbWeather + 1) % 4; return; }
        if(k >= '1' && k <= '6') { sbTool = parseInt(k) - 1; return; }
        return;
    }
    
    if(!campaignActive) return;
    
    if(campaignState === 'levelSelect') {
        if(k === 'Escape') { campaignActive = false; return; }
    }
    
    if(campaignState === 'preCutscene') {
        if(k === ' ' || k === 'Space' || k === 'Enter') avancarCutscene();
        return;
    }
    
    if(campaignState === 'gameplay') {
        if(k === 'Escape') { campaignState = 'pause'; pauseOpt = 0; if(document.exitPointerLock) document.exitPointerLock(); }
        if((k === 'e' || k === 'E') && dialogActive) {
            dialogLine++;
            let d = DIALOGUES[currentPhase][dialogNPC.dialogSet] || [];
            if(dialogLine >= d.length) { dialogActive = false; dialogNPC = null; }
        }
        return;
    }
    
    if(campaignState === 'pause') {
        if(k === 'Escape') campaignState = 'gameplay';
        if(k === 'ArrowUp') pauseOpt = (pauseOpt + 3) % 4;
        if(k === 'ArrowDown') pauseOpt = (pauseOpt + 1) % 4;
        if(k === 'Enter' || k === ' ') {
            if(pauseOpt === 0) campaignState = 'gameplay';
            else if(pauseOpt === 1) iniciarFase(currentPhase);
            else if(pauseOpt === 2) campaignState = 'levelSelect';
            else if(pauseOpt === 3) { campaignActive = false; if(document.exitPointerLock) document.exitPointerLock(); }
        }
        return;
    }
    
    if(campaignState === 'win') {
        if(k === ' ' || k === 'Space' || k === 'Enter') {
            if(currentPhase < 5) iniciarFase(currentPhase + 1);
            else { csIdx = 0; csFrame = 0; campaignState = 'ending'; }
        }
        if(k === 'Escape') campaignState = 'levelSelect';
        return;
    }
    
    if(campaignState === 'ending') {
        if(k === 'Escape') { campaignActive = false; if(document.exitPointerLock) document.exitPointerLock(); }
        if(k === ' ' || k === 'Space' || k === 'Enter') csFrame = 9999;
        return;
    }
}

function handleKeyUp(e) {
    let k = e.key;
    keys[k] = false;
    keys[k.toLowerCase()] = false;
}

function mudarEstado(s) {
    estadoTela = s;
    tempoEstado = performance.now();
}

// ==================== GAME LOOP ====================
function gameLoop(now) {
    frameCount++;
    let td = now - tempoEstado;
    
    ctx.clearRect(0, 0, 800, 500);
    
    switch(estadoTela) {
        case 0: desenharTelaClique(); break;
        case 1: desenharTelaAviso(); if(td > 5200) mudarEstado(2); break;
        case 2: desenharTelaEstudio(td); if(td > 6200) mudarEstado(3); break;
        case 3: desenharMenuPrincipal(); break;
        case 4: rodarJogoPrincipal(); break;
    }
    
    desenharRodape();
    requestAnimationFrame(gameLoop);
}

// ==================== TELAS ====================
function desenharTelaClique() {
    let grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#487abc');
    grad.addColorStop(1, '#265626');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(240, 170, 320, 160);
    ctx.fillStyle = '#ffeb78';
    ctx.font = 'bold 36px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('AGRINHO 2026', 400, 220);
    ctx.fillStyle = '#c8f0a0';
    ctx.font = '18px monospace';
    ctx.fillText('Agro forte, futuro sustentável', 400, 260);
    
    let alpha = (Math.sin(frameCount * 0.055) * 0.5 + 0.5) * 255;
    ctx.fillStyle = `rgba(120, 255, 120, ${alpha/255})`;
    ctx.font = '14px "Courier New"';
    ctx.fillText('[ CLIQUE PARA INICIAR ]', 400, 320);
}

function desenharTelaAviso() {
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, 800, 500);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(80, 160, 640, 180);
    ctx.fillStyle = '#c8f0a0';
    ctx.font = '13px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('AVISO — Concurso Agrinho 2026', 400, 190);
    ctx.fillStyle = '#a0c080';
    ctx.font = '11px monospace';
    ctx.fillText('Este jogo simula desafios da produção agrícola.', 400, 220);
    ctx.fillText('Alinhado ao tema: Equilíbrio entre produção e meio ambiente.', 400, 240);
    ctx.fillText('Nenhuma violência — apenas ciência, tecnologia e sustentabilidade.', 400, 260);
}

function desenharTelaEstudio(td) {
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, 800, 500);
    let op = Math.min(1, td / 1500);
    ctx.fillStyle = `rgba(0,0,0,${0.6 * op})`;
    ctx.fillRect(140, 170, 520, 160);
    ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
    ctx.font = 'bold 28px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('AGRINHO 2026', 400, 210);
    ctx.fillStyle = `rgba(180, 240, 140, ${op})`;
    ctx.font = '15px monospace';
    ctx.fillText('Agro forte, futuro sustentável', 400, 245);
    ctx.fillStyle = `rgba(130, 180, 110, ${op * 0.8})`;
    ctx.font = '11px "Courier New"';
    ctx.fillText('Uma solução tecnológica para o campo', 400, 275);
}

function desenharMenuPrincipal() {
    let grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#0a2a0a');
    grad.addColorStop(1, '#1a3a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);
    
    for(let s of menuStars) {
        ctx.fillStyle = `rgba(255, 255, 200, ${0.3 + Math.sin(frameCount * 0.04 + s.x) * 0.2})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = '#164a16';
    ctx.beginPath();
    for(let x = 0; x <= 800; x += 7) {
        let y = 310 + Math.sin(x * 0.008 + menuCam * 0.001) * 30;
        if(x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.lineTo(800, 500);
    ctx.lineTo(0, 500);
    ctx.fill();
    
    ctx.fillStyle = '#1a5a1a';
    ctx.beginPath();
    for(let x = 0; x <= 800; x += 6) {
        let y = 350 + Math.sin(x * 0.012 + menuCam * 0.0008 + 10) * 30;
        if(x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.lineTo(800, 500);
    ctx.lineTo(0, 500);
    ctx.fill();
    
    desenharSol(600, 90, 55);
    
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(90, 30, 620, 90);
    ctx.fillStyle = '#fff064';
    ctx.font = 'bold 32px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('AGRINHO 2026', 400, 80);
    ctx.fillStyle = '#b4f08c';
    ctx.font = '15px monospace';
    ctx.fillText('Agro forte, futuro sustentável', 400, 110);
    
    let bW = 210, bH = 52, bGap = 18, totalW = 2 * bW + bGap, bX0 = (800 - totalW) / 2, bY = 300;
    for(let i = 0; i < 2; i++) {
        let bx = bX0 + i * (bW + bGap);
        let hover = (mouseX > bx && mouseX < bx + bW && mouseY > bY && mouseY < bY + bH);
        ctx.fillStyle = hover ? 'rgba(40, 100, 30, 0.95)' : 'rgba(15, 55, 12, 0.85)';
        ctx.fillRect(bx, bY, bW, bH);
        ctx.strokeStyle = hover ? '#64ff50' : '#327830';
        ctx.strokeRect(bx, bY, bW, bH);
        ctx.fillStyle = hover ? '#dcffa5' : '#a0dc64';
        ctx.font = 'bold 15px "Courier New"';
        ctx.fillText(OPCOES_MENU[i], bx + bW/2, bY + bH/2 - 8);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#78c85a';
        ctx.fillText(i === 0 ? '6 FASES NARRATIVAS' : 'MODO LIVRE', bx + bW/2, bY + bH/2 + 15);
    }
    
    ctx.fillStyle = '#508c3c';
    ctx.font = '9px "Courier New"';
    ctx.fillText('[R] Rever Trailer  |  Clique para selecionar modo', 400, 470);
}

function desenharSol(sx, sy, raio) {
    for(let r = raio * 3.5; r > raio; r -= 4) {
        let a = mapRange(r, raio, raio * 3.5, 80, 0);
        ctx.fillStyle = `rgba(255, 240, 120, ${a/255})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#ffffdc';
    ctx.beginPath();
    ctx.arc(sx, sy, raio * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffff0';
    ctx.beginPath();
    ctx.arc(sx, sy, raio * 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function desenharRodape() {
    ctx.fillStyle = 'rgba(80,80,80,0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('© Agrinho 2026 — Todos os direitos reservados.', 790, 495);
}

function desenharNuvem(x, y, w, al) {
    ctx.fillStyle = `rgba(250, 253, 255, ${al/255})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.44, w * 0.23, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w * 0.28, y + w * 0.07, w * 0.3, w * 0.18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.28, y + w * 0.05, w * 0.3, w * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
}

// ==================== ROTEADOR PRINCIPAL ====================
function rodarJogoPrincipal() {
    if(trailerAtivo) { executarTrailer(); return; }
    if(sandboxActive) { executarSandbox(); return; }
    if(campaignActive) { executarCampanha(); return; }
    desenharMenuPrincipal();
}

// ==================== TRAILER (simplificado) ====================
function executarTrailer() {
    trailerFrame++;
    if(trailerFrame < 200) {
        ctx.fillStyle = '#0a2a0a';
        ctx.fillRect(0, 0, 800, 500);
        desenharSol(580, 100, 45);
        ctx.fillStyle = '#1a5a2a';
        ctx.fillRect(0, 350, 800, 150);
        ctx.fillStyle = '#fff8c0';
        ctx.font = 'bold 32px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('AGRINHO 2026', 400, 200);
        ctx.fillStyle = '#b4f08c';
        ctx.font = '18px monospace';
        ctx.fillText('Agro forte, futuro sustentável', 400, 260);
    } else if(trailerFrame < 400) {
        ctx.fillStyle = '#1a1a0a';
        ctx.fillRect(0, 0, 800, 500);
        ctx.fillStyle = '#ffcc66';
        ctx.font = 'bold 28px "Courier New"';
        ctx.fillText('O PREÇO DO PROGRESSO...', 400, 250);
    } else if(trailerFrame < 600) {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 800, 500);
        ctx.fillStyle = '#ff6644';
        ctx.font = 'bold 34px monospace';
        ctx.fillText('É A NATUREZA EM COLAPSO', 400, 250);
    } else {
        ctx.fillStyle = '#2a6a2a';
        ctx.fillRect(0, 0, 800, 500);
        desenharSol(400, 150, 55);
        ctx.fillStyle = '#ffffc0';
        ctx.font = 'bold 36px Georgia';
        ctx.fillText('AGRINHO 2026', 400, 280);
        ctx.fillStyle = '#a0ff80';
        ctx.font = '16px monospace';
        ctx.fillText('Agro forte, futuro sustentável', 400, 340);
        if(trailerFrame > 650) {
            ctx.fillStyle = '#80ff80';
            ctx.font = '14px "Courier New"';
            ctx.fillText('[ PRESSIONE QUALQUER TECLA ]', 400, 430);
            if(trailerFrame > 700) finalizarTrailer();
        }
    }
}

function finalizarTrailer() {
    trailerAtivo = false;
    trailerFrame = 0;
}

// ==================== CAMPANHA ====================
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
    let grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#0a2a0a');
    grad.addColorStop(1, '#1a3a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);
    
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, 800, 52);
    ctx.fillStyle = '#b4ff8c';
    ctx.font = 'bold 18px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('CAMPANHA — SELECIONE A FASE', 400, 32);
    
    let cols = 3, bw = 238, bh = 105, gx = (800 - cols * bw - (cols - 1) * 14) / 2, gy = 62;
    for(let i = 0; i < 6; i++) {
        let col = i % cols, row = Math.floor(i / cols);
        let bx = gx + col * (bw + 14), by = gy + row * (bh + 12);
        let unlocked = phasesUnlocked[i];
        let pd = PHASE_DATA[i];
        
        ctx.fillStyle = unlocked ? '#0a370a' : '#0a1a0a';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = unlocked ? '#4a9a3a' : '#2a3a2a';
        ctx.strokeRect(bx, by, bw, bh);
        
        ctx.fillStyle = `rgb(${pd.skyTop[0]}, ${pd.skyTop[1]}, ${pd.skyTop[2]})`;
        ctx.fillRect(bx + 2, by + 2, bw - 4, 35);
        
        ctx.fillStyle = unlocked ? '#dcffa5' : '#5a6a5a';
        ctx.font = 'bold 13px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText(pd.name, bx + 10, by + 46);
        ctx.font = '10px monospace';
        ctx.fillStyle = unlocked ? '#a0dc70' : '#4a5a4a';
        ctx.fillText(pd.subtitle, bx + 10, by + 62);
        ctx.fillStyle = unlocked ? '#64c850' : '#3a4a3a';
        ctx.fillText('Ferramenta: ' + pd.tool, bx + 10, by + 78);
        if(unlocked) ctx.fillText('Objetivos: ' + pd.objTotal, bx + 10, by + 92);
        if(!unlocked) {
            ctx.fillStyle = '#8a8a6a';
            ctx.font = '18px monospace';
            ctx.fillText('🔒', bx + bw - 25, by + bh/2 + 5);
        }
    }
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 462, 100, 28);
    ctx.fillStyle = '#a0dc64';
    ctx.font = '10px "Courier New"';
    ctx.fillText('[ESC] VOLTAR', 60, 480);
}

function iniciarFase(idx) {
    currentPhase = idx;
    let sp = SPAWNS[idx];
    player.x = sp[0]; player.y = sp[1]; player.angle = sp[2]; player.pitch = 0;
    player.stamina = 100; player.health = 100; player.bobTime = 0;
    player.moving = false; player.running = false; player.crouching = false;
    
    let pd = PHASE_DATA[idx];
    objTotal = pd.objTotal;
    objDone = 0;
    phaseWin = false;
    phaseTimer = pd.hasTimer ? pd.timerSec * 60 : -1;
    
    dialogActive = false;
    dialogNPC = null;
    interactCool = 0;
    pickupAnim = 0;
    
    activeNPCs = [];
    let npcs = NPC_DATA[idx];
    for(let i = 0; i < npcs.length; i++) {
        activeNPCs.push({charIdx: npcs[i].c, x: npcs[i].x, y: npcs[i].y, dialogSet: npcs[i].d, walkAngle: Math.random() * Math.PI * 2, walkTimer: 0, talking: false});
    }
    
    spots = [];
    let map2 = MAPS[idx];
    let available = [];
    for(let gy = 1; gy < MAPSIZE - 1; gy++) {
        for(let gx = 1; gx < MAPSIZE - 1; gx++) {
            if(map2[gy][gx] === 0 || map2[gy][gx] === 4) available.push({x: gx + 0.5, y: gy + 0.5});
        }
    }
    for(let i = available.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    for(let i = 0; i < Math.min(objTotal, available.length); i++) spots.push({x: available[i].x, y: available[i].y, done: false});
    
    csIdx = 0;
    csFrame = 0;
    campaignState = 'preCutscene';
}

function avancarCutscene() {
    csIdx++;
    csFrame = 0;
    if(csIdx >= CUTSCENE_DATA[currentPhase].length) {
        campaignState = 'gameplay';
        canvas.requestPointerLock();
    }
}

function executarCutscene() {
    csFrame++;
    let sc = CUTSCENE_DATA[currentPhase];
    if(csIdx >= sc.length) { campaignState = 'gameplay'; return; }
    let cena = sc[csIdx];
    let dur = cena[2];
    
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, 800, 500);
    
    let fadeAl = csFrame < 40 ? csFrame / 40 : csFrame > dur - 40 ? (dur - csFrame) / 40 : 1;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${0.9 * fadeAl})`;
    ctx.fillRect(0, 360, 800, 140);
    ctx.strokeStyle = `rgba(60, 160, 50, ${0.5 * fadeAl})`;
    ctx.strokeRect(0, 360, 800, 140);
    
    ctx.fillStyle = `rgba(220, 80, 80, ${fadeAl})`;
    ctx.font = 'bold 12px "Courier New"';
    ctx.fillText(cena[0].toUpperCase(), 70, 390);
    ctx.fillStyle = `rgba(235, 228, 212, ${fadeAl})`;
    ctx.font = '13px monospace';
    let totalChars = Math.floor(mapRange(csFrame, 0, Math.min(dur, 120), 0, cena[1].length));
    let texto = cena[1].substring(0, totalChars);
    ctx.fillText(texto, 70, 420);
    
    if(csFrame >= dur) avancarCutscene();
}

// ==================== GAMEPLAY (RAYCASTING) ====================
function executarGameplay() {
    atualizarPlayer();
    atualizarNPCs();
    
    if(phaseTimer > 0) phaseTimer--;
    if(phaseTimer === 0 && !phaseWin) {
        phaseWin = true;
        phasesUnlocked[Math.min(currentPhase + 1, 5)] = true;
        saveProgress();
    }
    if(phaseWin) { campaignState = 'win'; return; }
    
    renderizarCena3D();
    renderizarSprites();
    desenharHUD();
    if(dialogActive) desenharDialogo();
    if(pickupAnim > 0) { desenharPickupFx(); pickupAnim--; }
}

function atualizarNPCs() {
    for(let npc of activeNPCs) {
        npc.walkTimer++;
        if(npc.walkTimer > 80 && !npc.talking) {
            npc.walkAngle += randomRange(-0.3, 0.3);
            let dx = Math.cos(npc.walkAngle) * 0.012;
            let dy = Math.sin(npc.walkAngle) * 0.012;
            let nx = clamp(npc.x + dx, 1, MAPSIZE - 1);
            let ny = clamp(npc.y + dy, 1, MAPSIZE - 1);
            let map2 = MAPS[currentPhase];
            if(map2[Math.floor(ny)][Math.floor(nx)] < 1) {
                npc.x = nx;
                npc.y = ny;
            }
        }
        if(npc.walkTimer > 180) npc.walkTimer = 0;
    }
}

function atualizarPlayer() {
    if(dialogActive) return;
    let map2 = MAPS[currentPhase];
    let spd = 0.048;
    if(keys['Shift']) spd = 0.082;
    if(keys['Control']) spd = 0.025;
    player.running = !!keys['Shift'];
    player.crouching = !!keys['Control'];
    
    if(player.running) {
        player.stamina = Math.max(0, player.stamina - 0.28);
        if(player.stamina <= 0) spd = 0.038;
    } else {
        player.stamina = Math.min(100, player.stamina + 0.18);
    }
    
    let dx = 0, dy = 0;
    if(keys['w'] || keys['ArrowUp']) { dx += Math.cos(player.angle) * spd; dy += Math.sin(player.angle) * spd; }
    if(keys['s'] || keys['ArrowDown']) { dx -= Math.cos(player.angle) * spd; dy -= Math.sin(player.angle) * spd; }
    if(keys['a']) { dx += Math.cos(player.angle - Math.PI/2) * spd * 0.72; dy += Math.sin(player.angle - Math.PI/2) * spd * 0.72; }
    if(keys['d']) { dx += Math.cos(player.angle + Math.PI/2) * spd * 0.72; dy += Math.sin(player.angle + Math.PI/2) * spd * 0.72; }
    
    player.moving = (dx !== 0 || dy !== 0);
    let nx = player.x + dx, ny = player.y + dy, r = 0.28;
    
    function isWalkable(x, y) {
        let cx = Math.floor(x), cy = Math.floor(y);
        if(cx < 0 || cx >= MAPSIZE || cy < 0 || cy >= MAPSIZE) return false;
        let tile = map2[cy][cx];
        return !(tile >= 1 && tile !== 4 && tile !== 7);
    }
    
    if(isWalkable(nx, player.y)) player.x = nx;
    if(isWalkable(player.x, ny)) player.y = ny;
    
    if(keys['ArrowLeft']) player.angle -= 0.028;
    if(keys['ArrowRight']) player.angle += 0.028;
    
    if(player.moving) player.bobTime += player.running ? 0.13 : 0.085;
    
    if(keys['e'] && !dialogActive && interactCool <= 0) {
        for(let i = 0; i < activeNPCs.length; i++) {
            let npc = activeNPCs[i];
            let dxp = player.x - npc.x, dyp = player.y - npc.y;
            if(Math.sqrt(dxp*dxp + dyp*dyp) < 2.4) {
                dialogActive = true;
                dialogNPC = npc;
                dialogLine = 0;
                npc.talking = true;
                return;
            }
        }
        for(let i = 0; i < spots.length; i++) {
            let sp = spots[i];
            let dxp = player.x - sp.x, dyp = player.y - sp.y;
            if(!sp.done && Math.sqrt(dxp*dxp + dyp*dyp) < 1.8) {
                sp.done = true;
                objDone++;
                pickupAnim = 45;
                if(objDone >= objTotal) {
                    phaseWin = true;
                    phasesUnlocked[Math.min(currentPhase + 1, 5)] = true;
                    saveProgress();
                }
                return;
            }
        }
        interactCool = 22;
    }
    if(interactCool > 0) interactCool--;
}

function renderizarCena3D() {
    let pd = PHASE_DATA[currentPhase];
    let map2 = MAPS[currentPhase];
    let H = 500, W = 800;
    let bob = player.moving ? Math.sin(player.bobTime) * 7 : 0;
    let horizon = 250 + player.pitch + bob + (player.crouching ? 20 : 0);
    let dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
    let planeX = -dirY * 0.66, planeY = dirX * 0.66;
    
    let imageData = ctx.getImageData(0, 0, W, H);
    let data = imageData.data;
    
    for(let col = 0; col < W; col++) {
        let camX = (col / W) * 2 - 1;
        let rayDX = dirX + planeX * camX;
        let rayDY = dirY + planeY * camX;
        let mapX = Math.floor(player.x), mapY = Math.floor(player.y);
        let deltaX = Math.abs(1 / rayDX), deltaY = Math.abs(1 / rayDY);
        let stepX, stepY, sdX, sdY;
        
        if(rayDX < 0) { stepX = -1; sdX = (player.x - mapX) * deltaX; }
        else { stepX = 1; sdX = (mapX + 1 - player.x) * deltaX; }
        if(rayDY < 0) { stepY = -1; sdY = (player.y - mapY) * deltaY; }
        else { stepY = 1; sdY = (mapY + 1 - player.y) * deltaY; }
        
        let hit = false, side = 0;
        while(!hit) {
            if(sdX < sdY) { sdX += deltaX; mapX += stepX; side = 0; }
            else { sdY += deltaY; mapY += stepY; side = 1; }
            if(mapX < 0 || mapX >= MAPSIZE || mapY < 0 || mapY >= MAPSIZE) { hit = true; break; }
            if(map2[mapY][mapX] > 0 && map2[mapY][mapX] < 7) hit = true;
        }
        
        let perpDist = side === 0 ? (mapX - player.x + (1 - stepX) / 2) / rayDX : (mapY - player.y + (1 - stepY) / 2) / rayDY;
        perpDist = Math.max(perpDist, 0.04);
        zBuf[col] = perpDist;
        
        let wallH = Math.min(H * 2, Math.floor(H / perpDist));
        let drawStart = Math.max(0, Math.floor(horizon - wallH / 2));
        let drawEnd = Math.min(H - 1, Math.floor(horizon + wallH / 2));
        
        let tile = (mapX >= 0 && mapX < MAPSIZE && mapY >= 0 && mapY < MAPSIZE) ? map2[mapY][mapX] : 1;
        let wallX = side === 0 ? player.y + perpDist * rayDY : player.x + perpDist * rayDX;
        wallX -= Math.floor(wallX);
        let texCol = Math.floor(wallX * TEX);
        texCol = clamp(texCol, 0, TEX - 1);
        
        let rCol, gCol, bCol;
        if(tile === 2) { rCol = 98; gCol = 62; bCol = 28; }
        else if(tile === 3) { rCol = 130; gCol = 58; bCol = 32; }
        else if(tile === 4) { rCol = 85; gCol = 162; bCol = 38; }
        else { rCol = pd.wallR; gCol = pd.wallG; bCol = pd.wallB; }
        
        let sideShade = side === 1 ? 0.58 : 1.0;
        let fogT = Math.min(perpDist / pd.fogDist, 1);
        let ft = fogT * 0.72;
        
        // Céu
        for(let row = 0; row < drawStart; row++) {
            let skyT = row / Math.max(horizon, 1);
            let sr = lerp(pd.skyTop[0], pd.skyBot[0], skyT);
            let sg = lerp(pd.skyTop[1], pd.skyBot[1], skyT);
            let sb = lerp(pd.skyTop[2], pd.skyBot[2], skyT);
            let idx2 = (row * 800 + col) * 4;
if(idx2 >= 0 && idx2 + 2 < data.length) {
    data[idx2] = clamp(sr, 0, 255);
    data[idx2+1] = clamp(sg, 0, 255);
    data[idx2+2] = clamp(sb, 0, 255);
    data[idx2+3] = 255;
}
        
        // Paredes
        for(let row = drawStart; row <= drawEnd; row++) {
            let tv = (row - drawStart) / Math.max(wallH, 1);
            let texRow = Math.floor(tv * TEX);
            let texVal = getTex(tile, texCol, texRow);
            let shade = sideShade * (1 - Math.abs((row - horizon) / (wallH * 0.52)) * 0.28);
            let r = rCol * texVal * shade;
            let g = gCol * texVal * shade;
            let b = bCol * texVal * shade;
            r = lerp(r, pd.fogR, ft);
            g = lerp(g, pd.fogG, ft);
            b = lerp(b, pd.fogB, ft);
            setPixel(data, col, row, r, g, b);
        }
        
        // Chão
        for(let row = drawEnd + 1; row < H; row++) {
            let rowRatio = (row - horizon) / (H - horizon);
            let floorT = clamp(rowRatio * 0.88, 0, 1);
            let fr = lerp(pd.floorTop[0], pd.floorBot[0], floorT);
            let fg = lerp(pd.floorTop[1], pd.floorBot[1], floorT);
            let fb = lerp(pd.floorTop[2], pd.floorBot[2], floorT);
            let flFog = Math.min(rowRatio * 0.82, 1);
            fr = lerp(fr, pd.fogR, flFog * 0.52);
            fg = lerp(fg, pd.fogG, flFog * 0.52);
            fb = lerp(fb, pd.fogB, flFog * 0.52);
            setPixel(data, col, row, fr, fg, fb);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function setPixel(data, x, y, r, g, b) {
    if(x < 0 || x >= 800 || y < 0 || y >= 500) return;
    let idx = (y * 800 + x) * 4;
    if(idx >= 0 && idx + 2 < data.length) {
        data[idx] = clamp(r, 0, 255);
        data[idx+1] = clamp(g, 0, 255);
        data[idx+2] = clamp(b, 0, 255);
        data[idx+3] = 255;
    }
}

function desenharPixel(ctx, x, y, r, g, b) {
    if(x < 0 || x >= 800 || y < 0 || y >= 500) return;
    ctx.fillStyle = `rgb(${clamp(r,0,255)}, ${clamp(g,0,255)}, ${clamp(b,0,255)})`;
    ctx.fillRect(x, y, 1, 1);
}

function renderizarSprites() {
    let pd = PHASE_DATA[currentPhase];
    let H = 500;
    let bob = player.moving ? Math.sin(player.bobTime) * 7 : 0;
    let horizon = 250 + player.pitch + bob + (player.crouching ? 20 : 0);
    let dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
    let planeX = -dirY * 0.66, planeY = dirX * 0.66;
    
    let sprites = [];
    for(let npc of activeNPCs) sprites.push({type: 'npc', x: npc.x, y: npc.y, data: npc});
    for(let sp of spots) if(!sp.done) sprites.push({type: 'spot', x: sp.x, y: sp.y, data: sp});
    sprites.sort((a,b) => {
        let da = (a.x - player.x) * (a.x - player.x) + (a.y - player.y) * (a.y - player.y);
        let db = (b.x - player.x) * (b.x - player.x) + (b.y - player.y) * (b.y - player.y);
        return db - da;
    });
    
    let imageData = ctx.getImageData(0, 0, 800, 500);
    let data = imageData.data;
    
    for(let sp of sprites) {
        let dx = sp.x - player.x;
        let dy = sp.y - player.y;
        let invDet = 1 / (planeX * dirY - planeY * dirX);
        let transX = (dirY * dx - dirX * dy) * invDet;
        let transY = (planeY * dx - planeX * dy) * invDet;
        if(transY <= 0.25) continue;
        
        let sprScreenX = Math.floor((800 / 2) * (1 + transX / transY));
        let sprH = Math.floor(Math.min(500 / transY, 1000));
        let sprW = Math.floor(sprH * 0.55);
        let drawSY = Math.max(0, Math.floor(horizon - sprH / 2));
        let drawEY = Math.min(500 - 1, Math.floor(horizon + sprH / 2));
        let drawSX = Math.max(0, Math.floor(sprScreenX - sprW / 2));
        let drawEX = Math.min(800 - 1, Math.floor(sprScreenX + sprW / 2));
        
        let fogSpr = Math.max(Math.min(transY / pd.fogDist, 1), 1 - Math.exp(-transY * pd.fogDensity)) * 0.68;
        
        if(sp.type === 'spot') {
            let pulse = Math.sin(frameCount * 0.14) * 0.5 + 0.5;
            let r = 60 + pulse * 160;
            let g = 200 + pulse * 55;
            let b = 60;
            r = Math.floor(lerp(r, pd.fogR, fogSpr));
            g = Math.floor(lerp(g, pd.fogG, fogSpr));
            b = Math.floor(lerp(b, pd.fogB, fogSpr));
            
            for(let x = drawSX; x <= drawEX; x++) {
                if(transY >= zBuf[x]) continue;
                for(let y = drawSY; y <= drawEY; y++) {
                    let idx = (y * 800 + x) * 4;
                    if(idx >= 0 && idx < data.length) {
                        data[idx] = clamp(r, 0, 255);
                        data[idx+1] = clamp(g, 0, 255);
                        data[idx+2] = clamp(b, 0, 255);
                    }
                }
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function desenharHUD() {
    let pd = PHASE_DATA[currentPhase];
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, 800, 48);
    ctx.fillStyle = '#aff88c';
    ctx.font = 'bold 12px "Courier New"';
    ctx.fillText(pd.name + ' — ' + pd.subtitle, 14, 22);
    ctx.fillStyle = '#87c869';
    ctx.font = '9px monospace';
    ctx.fillText(pd.toolTip + '  |  Setas girar câmera', 14, 38);
    
    let prog = objDone / Math.max(objTotal, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(315, 8, 170, 30);
    ctx.fillStyle = '#1c6416';
    ctx.fillRect(317, 10, 164 * prog, 26);
    ctx.strokeStyle = '#379b2d';
    ctx.strokeRect(315, 8, 170, 30);
    ctx.fillStyle = '#c3ffa5';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(pd.objLabel + ': ' + objDone + ' / ' + objTotal, 400, 23);
    
    if(phaseTimer > 0) {
        let secs = Math.ceil(phaseTimer / 60);
        let urgent = secs < 60;
        let pulse = urgent ? (Math.sin(frameCount * 0.25) * 0.5 + 0.5) : 1;
        ctx.fillStyle = urgent ? `rgb(255, ${55 * pulse}, ${35 * pulse})` : '#ffdc50';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('⏱ ' + Math.floor(secs / 60) + ':' + (secs % 60 < 10 ? '0' : '') + (secs % 60), 786, 22);
    }
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(676, 52, 110, 13);
    ctx.fillStyle = player.running ? '#ffaf00' : '#41c341';
    ctx.fillRect(678, 54, player.stamina * 1.06, 9);
    ctx.fillStyle = '#c3c8af';
    ctx.font = '9px monospace';
    ctx.fillText('STAMINA', 786, 60);
    
    let crossX = 400, crossY = 250 + player.pitch;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(crossX - 10, crossY);
    ctx.lineTo(crossX - 4, crossY);
    ctx.moveTo(crossX + 4, crossY);
    ctx.lineTo(crossX + 10, crossY);
    ctx.moveTo(crossX, crossY - 10);
    ctx.lineTo(crossX, crossY - 4);
    ctx.moveTo(crossX, crossY + 4);
    ctx.lineTo(crossX, crossY + 10);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 474, 800, 26);
    ctx.fillStyle = '#91c373';
    ctx.font = '8px "Courier New"';
    ctx.fillText('WASD mover  |  Mouse/Setas câmera  |  Shift correr  |  Ctrl agachar  |  E interagir  |  ESC pausar', 14, 490);
}

function desenharDialogo() {
    if(!dialogNPC) return;
    let lines = DIALOGUES[currentPhase][dialogNPC.dialogSet] || [];
    if(dialogLine >= lines.length) { dialogActive = false; dialogNPC = null; return; }
    
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 382, 800, 118);
    ctx.strokeStyle = '#419632';
    ctx.strokeRect(0, 382, 800, 118);
    
    ctx.fillStyle = '#ebdcc8';
    ctx.font = '12.5px monospace';
    let texto = lines[dialogLine];
    let words = texto.split(' ');
    let line = '';
    let y = 405;
    for(let w of words) {
        let testLine = line + (line ? ' ' : '') + w;
        if(ctx.measureText(testLine).width > 650) {
            ctx.fillText(line, 70, y);
            line = w;
            y += 22;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, 70, y);
    
    ctx.fillStyle = '#87c365';
    ctx.font = '9px monospace';
    ctx.fillText('[E/CLIQUE] ' + (dialogLine < lines.length-1 ? 'Próximo' : 'Fechar'), 750, 492);
}

function desenharPickupFx() {
    let prog = 1 - pickupAnim / 45;
    let alpha = pickupAnim / 45;
    ctx.fillStyle = `rgba(115, 255, 115, ${0.3 * alpha})`;
    ctx.beginPath();
    ctx.arc(400, 250, 40 * (1 + prog * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(195, 255, 175, ${alpha})`;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('+1 ' + PHASE_DATA[currentPhase].tool, 400, 200 - prog * 18);
}

function desenharPause() {
    renderizarCena3D();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, 800, 500);
    ctx.fillStyle = '#d7ffaf';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('PAUSADO', 400, 120);
    ctx.fillStyle = '#91c373';
    ctx.font = '12px monospace';
    ctx.fillText(PHASE_DATA[currentPhase].name + ' — ' + PHASE_DATA[currentPhase].subtitle, 400, 175);
    
    let opts = ['▶  CONTINUAR', '↺  REINICIAR FASE', '≡  SELECIONAR FASE', '✕  MENU PRINCIPAL'];
    for(let i = 0; i < opts.length; i++) {
        let by = 220 + i * 52;
        let sel = pauseOpt === i;
        ctx.fillStyle = sel ? '#236919' : '#0e260c';
        ctx.fillRect(260, by - 20, 280, 38);
        ctx.strokeStyle = sel ? '#5fd74b' : '#347630';
        ctx.strokeRect(260, by - 20, 280, 38);
        ctx.fillStyle = sel ? '#cdffa0' : '#96cd73';
        ctx.font = sel ? 'bold 15px monospace' : '15px monospace';
        ctx.fillText(opts[i], 400, by);
    }
}

function desenharWin() {
    let grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#0a2a0a');
    grad.addColorStop(1, '#1a5a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);
    
    ctx.fillStyle = '#dcffa0';
    ctx.font = 'bold 46px monospace';
    ctx.fillText('FASE CONCLUÍDA!', 400, 120);
    ctx.fillStyle = '#b4eb82';
    ctx.font = '20px monospace';
    ctx.fillText(PHASE_DATA[currentPhase].name + ' — ' + PHASE_DATA[currentPhase].subtitle, 400, 185);
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(235, 215, 330, 40);
    ctx.fillStyle = '#73eb5f';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(PHASE_DATA[currentPhase].objLabel + ': ' + objDone + ' / ' + objTotal + ' ✓', 400, 240);
    
    if(currentPhase < 5) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(225, 290, 350, 34);
        ctx.fillStyle = '#4bd7ff';
        ctx.fillText('🔓 ' + PHASE_DATA[currentPhase+1].name + ' desbloqueada!', 400, 310);
    }
    
    let pulse = 200 + Math.sin(frameCount * 0.1) * 55;
    ctx.fillStyle = `rgba(75, 215, 75, ${pulse/255})`;
    ctx.font = 'bold 15px monospace';
    if(currentPhase < 5) ctx.fillText('[ESPAÇO] Próxima Fase  |  [ESC] Selecionar Fase', 400, 385);
    else ctx.fillText('[ESPAÇO] Ver Encerramento', 400, 385);
}

function executarEnding() {
    csFrame++;
    if(csIdx >= ENDING_SCENES.length) {
        campaignActive = false;
        campaignState = 'levelSelect';
        if(document.exitPointerLock) document.exitPointerLock();
        return;
    }
    let sc = ENDING_SCENES[csIdx];
    let dur = sc[2];
    
    ctx.fillStyle = '#0a2a0a';
    ctx.fillRect(0, 0, 800, 500);
    
    let fadeAl = csFrame < 45 ? csFrame / 45 : csFrame > dur - 45 ? (dur - csFrame) / 45 : 1;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${0.9 * fadeAl})`;
    ctx.fillRect(0, 345, 800, 155);
    
    ctx.fillStyle = `rgba(200, 200, 180, ${fadeAl})`;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(sc[0].toUpperCase(), 60, 375);
    ctx.fillStyle = `rgba(235, 225, 210, ${fadeAl})`;
    ctx.font = '13px monospace';
    ctx.fillText(sc[1], 60, 405);
    
    if(csIdx >= ENDING_SCENES.length - 1 && csFrame > dur - 80) {
        let credA = csFrame / dur;
        ctx.fillStyle = `rgba(0,0,0,${0.7 * credA})`;
        ctx.fillRect(120, 110, 560, 118);
        ctx.fillStyle = `rgba(255, 235, 100, ${credA})`;
        ctx.font = 'bold 22px Georgia';
        ctx.fillText('AGRINHO 2026', 400, 150);
        ctx.fillStyle = `rgba(195, 240, 160, ${credA})`;
        ctx.font = '14px monospace';
        ctx.fillText('Agro forte, futuro sustentável', 400, 185);
    }
    
    if(csFrame >= dur) { csIdx++; csFrame = 0; }
}

// ==================== SANDBOX ====================
function iniciarSandbox() {
    sandboxActive = true;
    sbWeather = 0; sbTool = 0; sbWeatherTimer = 0; lightningFlash = 0;
    player.x = 12; player.y = 12; player.angle = 0; player.pitch = 0;
    player.stamina = 100; player.health = 100; player.bobTime = 0;
    currentPhase = 5;
    
    activeNPCs = [];
    let npcs = NPC_DATA[5];
    for(let i = 0; i < npcs.length; i++) {
        activeNPCs.push({charIdx: npcs[i].c, x: npcs[i].x, y: npcs[i].y, dialogSet: npcs[i].d, walkAngle: Math.random() * Math.PI * 2, walkTimer: 0, talking: false});
    }
    spots = [];
    objTotal = 0; objDone = 0; phaseWin = false; phaseTimer = -1;
    dialogActive = false; dialogNPC = null;
    canvas.requestPointerLock();
}

function executarSandbox() {
    sbWeatherTimer++;
    
    let sbPD = {
        night: sbWeather === 2 || sbWeather === 3,
        fogDist: sbWeather === 3 ? 6 : (sbWeather === 2 ? 8 : 16),
        fogDensity: sbWeather === 3 ? 0.15 : (sbWeather === 2 ? 0.08 : 0.05),
        fogR: sbWeather === 3 ? 20 : (sbWeather === 2 ? 12 : 150),
        fogG: sbWeather === 3 ? 20 : (sbWeather === 2 ? 22 : 210),
        fogB: sbWeather === 3 ? 30 : (sbWeather === 2 ? 14 : 240),
        skyTop: sbWeather === 0 ? [82,205,252] : sbWeather === 1 ? [88,100,115] : sbWeather === 2 ? [8,12,28] : [22,22,30],
        skyBot: sbWeather === 0 ? [42,165,222] : sbWeather === 1 ? [55,70,85] : sbWeather === 2 ? [4,8,20] : [14,14,22],
        floorTop: sbWeather === 0 ? [55,148,55] : sbWeather === 1 ? [42,110,42] : [32,100,32],
        floorBot: sbWeather === 0 ? [32,100,32] : sbWeather === 1 ? [25,78,25] : [18,65,18],
        wallR: 68, wallG: 152, wallB: 68
    };
    
    PHASE_DATA[5].night = sbPD.night;
    PHASE_DATA[5].fogDist = sbPD.fogDist;
    PHASE_DATA[5].fogDensity = sbPD.fogDensity;
    PHASE_DATA[5].fogR = sbPD.fogR;
    PHASE_DATA[5].fogG = sbPD.fogG;
    PHASE_DATA[5].fogB = sbPD.fogB;
    for(let i = 0; i < 3; i++) {
        PHASE_DATA[5].skyTop[i] = sbPD.skyTop[i];
        PHASE_DATA[5].skyBot[i] = sbPD.skyBot[i];
        PHASE_DATA[5].floorTop[i] = sbPD.floorTop[i];
        PHASE_DATA[5].floorBot[i] = sbPD.floorBot[i];
    }
    
    atualizarPlayer();
    atualizarNPCs();
    renderizarCena3D();
    renderizarSprites();
    
    if(sbWeather === 3) {
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.4)';
        ctx.lineWidth = 1;
        for(let p of stormParts) {
            p.y += p.spd;
            if(p.y > 500) { p.y = -p.len; p.x = Math.random() * 800; }
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 3, p.y + p.len);
            ctx.stroke();
        }
        lightningFlash = Math.max(0, lightningFlash - 3);
        if(Math.random() < 0.008) lightningFlash = 255;
        if(lightningFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash * 0.003})`;
            ctx.fillRect(0, 0, 800, 500);
        }
    }
    
    desenharHUD();
    hudSandbox();
    if(dialogActive) desenharDialogo();
}

function hudSandbox() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, 800, 48);
    ctx.fillStyle = '#ffc850';
    ctx.font = 'bold 13px "Courier New"';
    ctx.fillText('SANDBOX — MODO LIVRE', 14, 22);
    ctx.fillStyle = '#b4b48c';
    ctx.font = '9px monospace';
    ctx.fillText('WASD mover  |  Mouse câmera  |  C = clima  |  1-6 = ferramenta  |  ESC = sair', 14, 38);
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(600, 8, 188, 30);
    let wColors = [[255,220,60],[160,180,200],[80,120,220],[80,100,180]];
    ctx.fillStyle = `rgb(${wColors[sbWeather][0]}, ${wColors[sbWeather][1]}, ${wColors[sbWeather][2]})`;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(SB_WEATHER_NAMES[sbWeather], 694, 23);
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(315, 8, 170, 30);
    ctx.fillStyle = '#78ff64';
    ctx.fillText('TOOL: ' + ['SCANNER','NOTURNO','HACKEAR','COLETOR','PLANTIO','DRONE'][sbTool], 400, 23);
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 470, 800, 30);
    for(let i = 0; i < 6; i++) {
        let bx = 14 + i * 128;
        ctx.fillStyle = sbTool === i ? '#28781e' : '#14320c';
        ctx.fillRect(bx, 472, 120, 22);
        ctx.fillStyle = sbTool === i ? '#dcffa0' : '#82b964';
        ctx.font = '9px "Courier New"';
        ctx.fillText('[' + (i+1) + '] ' + ['SCANNER','NOTURNO','HACKEAR','COLETOR','PLANTIO','DRONE'][i], bx + 60, 486);
    }
}

// ==================== INICIAR ====================
init();