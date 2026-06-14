# OLAVO-NO-CAMPO

#agrinho2026 #agrinho

O meu projeto para o Agrinho é o "AGRINHO 2026 — Agro forte, futuro sustentável", um jogo de simulação e aventura onde o jogador assume o papel de um jovem agricultor chamado Tico, que precisa restaurar a saúde do solo de uma fazenda no Paraná. O objetivo é completar 6 missões desafiadoras que envolvem escanear áreas degradadas, eliminar pragas, desativar bombas de agrotóxico ilegais, coletar amostras de solo contaminado, plantar mudas nativas e realizar uma inspeção final com drone. O projeto foi desenvolvido pensando diretamente no tema "Agro forte, futuro sustentável: equilíbrio entre produção e meio ambiente", mostrando que é possível aliar tecnologia e sustentabilidade para recuperar o campo. Para vencer, o jogador precisa equilibrar o uso de ferramentas tecnológicas (scanner, drone, bioinsumos) com ações ecológicas (plantio nativo, coleta de amostras), enfrentando desafios como tempo limitado e pragas noturnas.

Na parte técnica, o jogo foi desenvolvido do zero utilizando JavaScript Puro com a biblioteca p5.js, além de HTML5 e CSS3. A lógica do simulador funciona através de um sistema de estados centralizado, que gerencia menu, trailer, campanha, sandbox e plantação. Quando o usuário interage com a tela (teclado e mouse), os eventos disparam funções que atualizam o jogador, NPCs, objetivos e o mapa em tempo real através do Canvas. O jogo conta com um sistema de diálogos com NPCs, cutscenes introdutórias para cada missão, mini-mapa, timer na missão 3, barra de stamina, e um simulador de plantação com pH, água e pragas. O código é organizado e bem estruturado, com salvamento de progresso via localStorage.

Ferramentas utilizadas:

Editor de códigos: VsCode (https://vscode.dev/)

Auxílio do DeepSeek, Replit IA para geração de códigos

Biblioteca gráfica: p5.js (https://p5js.org/)

Áudios e efeitos sonoros: gerados localmente com osciladores do p5.js
