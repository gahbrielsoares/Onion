# 🧅 Onion

A produtora de vídeos para canais dark, em forma de parque.
Cada prédio do **Onion Park** é uma etapa da produção: você clica, configura e manda o trabalho pro próximo prédio.

**Site:** https://gahbrielsoares.github.io/Onion/

## Fluxo

| Prédio | Etapa |
|---|---|
| Laboratório de Virais | Temas com potencial de viralizar por região |
| Laboratório de Ideias | Configuração do canal e fila de ideias |
| Torre dos Títulos | 10 títulos com ângulos e gatilhos |
| Prédio dos Roteiros | Roteiro em blocos com engenharia de retenção |
| Redação | Descrição e hashtags |
| Ateliê de Capas | Textos e composição da thumbnail |
| Prédio das Imagens | Cenas e prompts no estilo escolhido |
| Estúdio de Narração | Voz e velocidade |
| OnionCut | Montagem do vídeo |
| Arquivo e Datacenter | Biblioteca de vídeos prontos |
| Administração | Chaves de API |

## Como usar

1. Abra o site e entre na **Administração** (⚙ no topo).
2. Em cada etapa, escolha o provedor, cole a chave e clique em **Salvar e testar**. O teste já carrega os modelos disponíveis na sua conta.
3. Siga a seta dourada no parque.

| Etapa | Provedores |
|---|---|
| Textos | Anthropic, Google Gemini, OpenAI |
| Imagens e capas | Google Gemini, OpenAI |
| Narração | ElevenLabs, Google Gemini, OpenAI |
| OnionCut | Sem IA (padrão), ElevenLabs, OpenAI (só pra sincronia exata das legendas) |

## Segurança

O site é estático e público. **Nenhuma chave fica no código.** Cada pessoa cola a própria chave, que fica guardada só no navegador dela (localStorage) e vai direto para a API.

## Estrutura

```
index.html          página do parque
assets/onion.css    estilos
assets/onion.js     parque, etapas e estado
assets/ai.js        provedores de IA por etapa, chaves, modelos, textos e imagens
assets/store.js     imagens e áudios guardados no navegador (IndexedDB)
assets/voice.js     narração (TTS), vozes, transcrição e utilitários de áudio
assets/cut.js       OnionCut: alinhamento, cortes, legendas, prévia e render MP4
assets/trends.js    sinais de tendência em tempo real
assets/collage.js   colagem animada: storyboard, elenco recortado, imagens reais e quadros
assets/doc.js       documentário cinematográfico: storyboard e quadros
assets/sound.js     trilhas, efeitos sonoros e mixagem
assets/park.js      o parque em pixel art 2.5D, personagens, gerente e câmera
assets/auto.js      piloto automático e diário do gerente
assets/vendor/      JSZip e mp4-muxer (MIT)
```

## Status

- [x] Parque interativo com etapas encadeadas
- [x] Textos com IA: temas, títulos, roteiro, descrição, capa, prompts de cena
- [x] Administração com provedor e chave por etapa
- [x] Imagens e capas com Gemini ou OpenAI (guardadas no navegador, IndexedDB)
- [x] Pacote .zip com capa, cenas, roteiro e descrição
- [x] Narração com Gemini, ElevenLabs ou OpenAI (em trechos, com amostra de voz)
- [x] OnionCut: cortes nas pausas da voz, Ken Burns, templates, legendas animadas, prévia ao vivo
- [x] Tendências ao vivo: sites de tendência (Google Trends, X/trends24, TikTok Creative Center, Reddit, Google Notícias, Exploding Topics) lidos pelo Gemini, YouTube em alta (Data API v3), Google agora (Gemini + Pesquisa Google) e Wikipedia mais lidas
- [x] Estilo documentário cinematográfico: fotos de arquivo reais tratadas, molduras de filme, nomes e títulos dourados, capítulos, citações, retratos, diagramas 3D
- [x] Trilha gerada sem direitos autorais (4 climas) ou música própria, efeitos de transição (whoosh, impacto, riser, clique) e música que abaixa sob a voz
- [x] Estilo colagem animada (explicador desenhado) com imagens reais de domínio público do Wikimedia Commons e créditos automáticos
- [x] Shorts verticais (1080×1920), formato Batalha (X vs Y) e Short derivado de cada vídeo longo reaproveitando o elenco
- [x] Produção casada: cada etapa do vídeo longo já faz a do Short que leva pra ele (abas Longo/Short)
- [x] .zip organizado em pastas VIDEO LONGO e SHORT
- [x] Piloto automático: gera N vídeos sozinho, o gerente decide cada etapa e caminha entre os prédios
- [x] Render em MP4 (H.264) direto no navegador, com WebCodecs (Chrome ou Edge no computador)
