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

1. Abra o site e entre na **Administração**.
2. Cole sua chave da Anthropic (crie em console.anthropic.com e defina um limite de gasto).
3. Siga a seta dourada no parque.

## Segurança

O site é estático e público. **Nenhuma chave fica no código.** Cada pessoa cola a própria chave, que fica guardada só no navegador dela (localStorage) e vai direto para a API.

## Estrutura

```
index.html          página do parque
assets/onion.css    estilos
assets/onion.js     parque, etapas e estado
assets/ai.js        chamadas à API da Anthropic (streaming)
```

## Status

- [x] Parque interativo com etapas encadeadas
- [x] Textos com IA: temas, títulos, roteiro, descrição, capa, prompts de cena
- [ ] Imagens e capas com Gemini
- [ ] Narração com ElevenLabs
- [ ] OnionCut: render do vídeo no navegador
