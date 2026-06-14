// ============================================================
// AGRINHO 2026 — VERSÃO SIMPLIFICADA (TESTE)
// ============================================================

function setup() {
  createCanvas(800, 600);
  frameRate(60);
  textFont('Courier New');
  textAlign(CENTER, CENTER);
}

function draw() {
  background(20, 80, 30);
  
  // Título
  fill(255, 220, 100);
  textSize(32);
  text('AGRINHO 2026', width/2, height/2 - 40);
  
  // Subtítulo
  fill(180, 255, 120);
  textSize(18);
  text('Agro forte, futuro sustentável', width/2, height/2);
  
  // Instrução
  fill(255);
  textSize(14);
  text('Clique para iniciar', width/2, height/2 + 60);
  
  // Versão
  fill(150);
  textSize(10);
  text('v1.0 - Carregando...', width/2, height - 30);
}

function mousePressed() {
  // Redireciona para a tela de jogo
  console.log("Clique detectado!");
}
