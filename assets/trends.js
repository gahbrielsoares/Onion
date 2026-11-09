/* Onion · sinais de tendência em tempo real
 * YouTube em alta (YouTube Data API v3), Google agora (Gemini com Pesquisa Google)
 * e Wikipedia mais lidas (grátis). Tudo chamado direto do navegador.
 */
const Trends = (() => {
  const REG = {
    "Mundo todo":     { yt: "US", wiki: "en.wikipedia", lang: "en", nome: "no mundo todo (principalmente EUA e Europa)", t24: "", news: "hl=en-US&gl=US&ceid=US:en" },
    "Estados Unidos": { yt: "US", wiki: "en.wikipedia", lang: "en", nome: "nos Estados Unidos", t24: "united-states/", news: "hl=en-US&gl=US&ceid=US:en" },
    "Reino Unido":    { yt: "GB", wiki: "en.wikipedia", lang: "en", nome: "no Reino Unido", t24: "united-kingdom/", news: "hl=en-GB&gl=GB&ceid=GB:en" },
    "Canadá":         { yt: "CA", wiki: "en.wikipedia", lang: "en", nome: "no Canadá", t24: "canada/", news: "hl=en-CA&gl=CA&ceid=CA:en" },
    "Austrália":      { yt: "AU", wiki: "en.wikipedia", lang: "en", nome: "na Austrália", t24: "australia/", news: "hl=en-AU&gl=AU&ceid=AU:en" },
    "Brasil":         { yt: "BR", wiki: "pt.wikipedia", lang: "pt", nome: "no Brasil", t24: "brazil/", news: "hl=pt-BR&gl=BR&ceid=BR:pt-419" },
    "Índia":          { yt: "IN", wiki: "en.wikipedia", lang: "en", nome: "na Índia", t24: "india/", news: "hl=en-IN&gl=IN&ceid=IN:en" },
    "Alemanha":       { yt: "DE", wiki: "de.wikipedia", lang: "de", nome: "na Alemanha", t24: "germany/", news: "hl=de&gl=DE&ceid=DE:de" }
  };
  const fail = (code, message) => ({ code, message });
  const ytKey = () => AI.get().keys.youtube || AI.get().keys.google || "";
  const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + " mi" : n >= 1e3 ? Math.round(n / 1e3) + " mil" : String(n);

  async function ytFetch(path, params) {
    const k = ytKey(); if (!k) throw fail("no_key", "Sem chave pro YouTube. Configure em Administração › Tendências ao vivo.");
    const u = "https://www.googleapis.com/youtube/v3/" + path + "?" + new URLSearchParams({ ...params, key: k });
    const r = await fetch(u);
    if (!r.ok) {
      let j = {}; try { j = await r.json(); } catch (e) {}
      const reason = j.error?.errors?.[0]?.reason || j.error?.status || "", msg = j.error?.message || "";
      if (/accessNotConfigured|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED|blocked/i.test(reason + msg)) throw fail("yt_off", "A YouTube Data API v3 não está ativada pra essa chave. Ative em console.cloud.google.com (APIs e serviços › Biblioteca › YouTube Data API v3) no mesmo projeto da chave.");
      if (/quota/i.test(reason + msg)) throw fail("yt_quota", "A cota diária da YouTube Data API acabou. Ela renova amanhã.");
      if (r.status === 400 || r.status === 403) throw fail("auth", "O YouTube recusou a chave: " + (msg || r.status));
      throw fail("http", "YouTube respondeu " + r.status);
    }
    return r.json();
  }
  function mapVideos(items) {
    const now = Date.now();
    return items.map(v => {
      const views = +v.statistics?.viewCount || 0, hrs = Math.max(1, (now - new Date(v.snippet.publishedAt)) / 36e5);
      return { titulo: v.snippet.title, canal: v.snippet.channelTitle, views, porHora: Math.round(views / hrs), dias: +(hrs / 24).toFixed(1), id: v.id };
    });
  }
  async function youtube(region, niche) {
    const R = REG[region] || REG["Estados Unidos"];
    const pop = mapVideos((await ytFetch("videos", { part: "snippet,statistics", chart: "mostPopular", regionCode: R.yt, maxResults: 50 })).items || []);
    let nicho = [];
    if (niche) {
      const after = new Date(Date.now() - 7 * 864e5).toISOString();
      const s = await ytFetch("search", { part: "snippet", type: "video", order: "viewCount", publishedAfter: after, q: niche, regionCode: R.yt, relevanceLanguage: R.lang, maxResults: 25 });
      const ids = (s.items || []).map(i => i.id.videoId).filter(Boolean);
      if (ids.length) nicho = mapVideos((await ytFetch("videos", { part: "snippet,statistics", id: ids.join(",") })).items || []);
    }
    pop.sort((a, b) => b.porHora - a.porHora); nicho.sort((a, b) => b.porHora - a.porHora);
    return { pop: pop.slice(0, 30), nicho: nicho.slice(0, 15) };
  }

  async function googleModel() {
    const c = AI.get();
    if (c.text.provider === "google" && c.text.model) return c.text.model;
    let ids = AI.cachedModels("google", "text"); if (!ids.length) ids = await AI.listModels("google", "text");
    return AI.pickDefault("text", ids);
  }
  async function google(region, niche, signal) {
    const k = AI.get().keys.google; if (!k) throw fail("no_key", "Precisa da chave do Google (Gemini) pra pesquisar no Google.");
    const R = REG[region] || REG["Estados Unidos"], hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    const prompt = `Hoje é ${hoje}. Pesquise no Google o que está em alta AGORA, nos últimos 7 dias, ${R.nome}: assuntos com muita busca, conversa nas redes e visualizações em vídeos. Considere lançamentos (games, filmes, séries), celebridades, crimes e casos policiais, golpes, mistérios, ciência, tecnologia, economia, esportes e polêmicas.${niche ? ` Inclua também o que está em alta ligado a: ${niche}.` : ""}
Liste 15 assuntos específicos (nada genérico). Para cada um: o assunto, por que está em alta exatamente agora e uma evidência concreta (data, número ou fato recente).`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(await googleModel())}:generateContent`, {
      method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": k },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
    });
    if (!r.ok) { let m = ""; try { m = (await r.json()).error?.message || ""; } catch (e) {} throw fail("http", "Pesquisa Google via Gemini falhou: " + (m || r.status)); }
    const j = await r.json(), c = j.candidates?.[0];
    const text = (c?.content?.parts || []).map(p => p.text || "").join("").trim();
    const fontes = (c?.groundingMetadata?.groundingChunks || []).map(g => g.web).filter(Boolean).map(w => ({ titulo: w.title, url: w.uri })).slice(0, 12);
    return { text, fontes };
  }

  // os sites de tendência são lidos pelos servidores do Google (Gemini com leitura de páginas
  // e Pesquisa Google), porque o navegador não pode abrir esses sites direto
  function siteList(region) {
    const R = REG[region] || REG["Estados Unidos"];
    return [
      ["Google Trends", `https://trends.google.com/trending/rss?geo=${R.yt}`],
      ["X (Twitter) · trends24", `https://trends24.in/${R.t24}`],
      ["TikTok Creative Center", `https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en?region=${R.yt}&period=7`],
      ["Reddit", `https://old.reddit.com/r/popular/?geo_filter=${R.yt}`],
      ["Google Notícias", `https://news.google.com/rss?${R.news}`],
      ["Exploding Topics", "https://explodingtopics.com/"]
    ];
  }
  const nk = s => (s || "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  async function sites(region, niche, signal) {
    const k = AI.get().keys.google; if (!k) throw fail("no_key", "Precisa da chave do Google (Gemini) pra ler os sites de tendência.");
    const R = REG[region] || REG["Estados Unidos"], list = siteList(region), hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    const prompt = `Hoje é ${hoje}. Você é um analista de tendências. Abra e leia AGORA estas páginas, que mostram o que está em alta ${R.nome}:
${list.map(([n, u]) => `- ${n}: ${u}`).join("\n")}
Se uma página não abrir ou vier vazia, pesquise no Google o equivalente de hoje (por exemplo "hashtags em alta TikTok ${region} hoje", "assuntos do momento X ${region}").${niche ? `
Dê atenção extra ao que tiver ligação com: ${niche}.` : ""}
Responda SÓ com linhas neste formato, até 8 por fonte, do mais quente pro menos quente:
FONTE | ASSUNTO | EVIDÊNCIA (posição, volume de buscas, número de posts, upvotes ou data)
Use exatamente estes nomes de fonte: ${list.map(l => l[0]).join(", ")}. Não invente números: se a página não mostrar número, escreva a posição.`;
    const model = await googleModel();
    const call = tools => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": k },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools })
    });
    let r = await call([{ url_context: {} }, { google_search: {} }]);
    if (r.status === 400) r = await call([{ google_search: {} }]);   // modelo sem leitura de páginas: só Pesquisa Google
    if (!r.ok) { let m = ""; try { m = (await r.json()).error?.message || ""; } catch (e) {} throw fail("http", "Leitura dos sites falhou: " + (m || r.status)); }
    const j = await r.json(), c = j.candidates?.[0];
    const text = (c?.content?.parts || []).map(p => p.text || "").join("").trim();
    const meta = (c?.urlContextMetadata || c?.url_context_metadata || {});
    const got = (meta.urlMetadata || meta.url_metadata || []).map(m => ({ url: m.retrievedUrl || m.retrieved_url, ok: /SUCCESS/i.test(m.urlRetrievalStatus || m.url_retrieval_status || "") }));
    const itens = text.split("\n").map(l => l.split("|").map(x => x.trim())).map(p => { p[0] = (p[0] || "").replace(/^[-*•\d.\s]+/, ""); return p; }).filter(p => p.length >= 2 && p[1])
      .map(([fonte, assunto, ev]) => ({ fonte, assunto, ev: ev || "" }));
    const porFonte = list.map(([n, u]) => ({ nome: n, url: u, lido: got.some(g => g.ok && g.url && g.url.split("?")[0].replace(/\/$/, "") === u.split("?")[0].replace(/\/$/, "")), itens: itens.filter(i => { const a = nk(i.fonte), b = nk(n); return a.startsWith(b.slice(0, 10)) || b.startsWith(a.slice(0, 10)); }) }));
    return { porFonte, itens, fontes: (c?.groundingMetadata?.groundingChunks || []).map(g => g.web).filter(Boolean).map(w => ({ titulo: w.title, url: w.uri })).slice(0, 10) };
  }

  async function wikipedia(region) {
    const R = REG[region] || REG["Estados Unidos"];
    for (let back = 1; back <= 3; back++) {
      const d = new Date(Date.now() - back * 864e5);
      const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0"), dd = String(d.getUTCDate()).padStart(2, "0");
      const r = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${R.wiki}/all-access/${y}/${m}/${dd}`);
      if (!r.ok) continue;
      const arts = (await r.json()).items?.[0]?.articles || [];
      const out = arts.filter(a => !a.article.includes(":") && !/^(Main_Page|Wikipédia|Página_principal|Hauptseite|-)$/i.test(a.article))
        .slice(0, 30).map(a => ({ titulo: a.article.replace(/_/g, " "), views: a.views }));
      return { dia: `${dd}/${m}`, artigos: out };
    }
    throw fail("http", "A Wikipedia não respondeu.");
  }

  // junta os sinais escolhidos; cada fonte que falhar vira um aviso, sem travar as outras
  async function collect({ region, niche, sources, onStatus, signal }) {
    const out = { region, at: Date.now(), avisos: [] };
    if (sources.youtube) { onStatus && onStatus("lendo o YouTube em alta"); try { out.youtube = await youtube(region, niche); } catch (e) { out.avisos.push("YouTube: " + e.message); } }
    if (sources.sites) { onStatus && onStatus("lendo Google Trends, X, TikTok, Reddit e notícias"); try { out.sites = await sites(region, niche, signal); } catch (e) { if (e.name === "AbortError") throw fail("cancelled", "Interrompido"); out.avisos.push("Sites: " + e.message); } }
    if (sources.google) { onStatus && onStatus("pesquisando no Google o que bomba agora"); try { out.google = await google(region, niche, signal); } catch (e) { if (e.name === "AbortError") throw fail("cancelled", "Interrompido"); out.avisos.push("Google: " + e.message); } }
    if (sources.wiki) { onStatus && onStatus("vendo o que o povo mais leu ontem"); try { out.wiki = await wikipedia(region); } catch (e) { out.avisos.push("Wikipedia: " + e.message); } }
    return out;
  }
  function asPrompt(sig) {
    const parts = [];
    if (sig.youtube) {
      parts.push("VÍDEOS EM ALTA NO YOUTUBE AGORA (título | canal | views | views por hora | dias no ar):\n" + sig.youtube.pop.slice(0, 25).map(v => `- ${v.titulo} | ${v.canal} | ${fmtN(v.views)} | ${fmtN(v.porHora)}/h | ${v.dias}d`).join("\n"));
      if (sig.youtube.nicho.length) parts.push("VÍDEOS DO NICHO QUE MAIS CRESCERAM NA ÚLTIMA SEMANA:\n" + sig.youtube.nicho.map(v => `- ${v.titulo} | ${v.canal} | ${fmtN(v.views)} | ${fmtN(v.porHora)}/h`).join("\n"));
    }
    if (sig.sites && sig.sites.itens.length) parts.push("EM ALTA NOS SITES DE TENDÊNCIA (fonte | assunto | evidência):\n" + sig.sites.itens.slice(0, 50).map(i => `- ${i.fonte} | ${i.assunto} | ${i.ev}`).join("\n"));
    if (sig.google && sig.google.text) parts.push("O QUE ESTÁ EM ALTA NO GOOGLE (pesquisa feita agora):\n" + sig.google.text.slice(0, 6000));
    if (sig.wiki) parts.push(`ARTIGOS MAIS LIDOS NA WIKIPEDIA EM ${sig.wiki.dia} (título | views):\n` + sig.wiki.artigos.map(a => `- ${a.titulo} | ${fmtN(a.views)}`).join("\n"));
    return parts.join("\n\n");
  }
  async function testYouTube() { const j = await ytFetch("videos", { part: "snippet", chart: "mostPopular", regionCode: "US", maxResults: 1 }); return (j.items || []).length; }

  return { REG, collect, asPrompt, fmtN, testYouTube };
})();
