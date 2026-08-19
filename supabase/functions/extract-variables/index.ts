// Cognisa - Painel privado - Edge Function: extract-variables
//
// Recebe um texto clínico livre e devolve sugestões de valores para as
// variáveis CORE-76, com o trecho de evidência usado para cada uma.
// NUNCA grava no banco diretamente — a gravação só acontece depois que o
// médico revisa e confirma cada sugestão na tela do Prontuário (portão de
// validação manual obrigatório).
//
// Deploy: pela dashboard do Supabase (Edge Functions -> extract-variables -> Editor -> Deploy).
// IMPORTANTE: nas configuracoes desta function, "Verify JWT" / "Enforce JWT Verification"
// precisa ficar DESLIGADO -- senao o proprio Supabase bloqueia ate o preflight de CORS do
// navegador antes de chegar aqui. A checagem de login e feita manualmente abaixo
// (checkAuth), entao a function continua protegida mesmo com essa opcao desligada.
//
// Secret necessario: ANTHROPIC_API_KEY (Edge Functions -> Manage secrets).
// SUPABASE_URL e SUPABASE_ANON_KEY ja vem prontos automaticamente, nao precisa configurar.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-5";

// Mesmo dicionário CORE-76 usado em painel/prontuario.html.
// Se o dicionário mudar lá, atualize aqui também (não há build step para compartilhar).
const SIMNAO = ["Sim", "Não"];
const CORE76: Array<{ domain: string; vars: Array<[string, string, string, string[]?]> }> = [
  { domain: "Demografia e contexto clínico", vars: [
    ["V01", "Idade (anos)", "n"], ["V02", "Sexo ao nascimento", "s", ["Masculino", "Feminino"]],
    ["V03", "Escolaridade (anos completos)", "n"],
    ["V04", "Estado civil", "s", ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"]],
    ["V05", "Local de residência", "s", ["Casa própria", "Casa alugada", "ILPI", "Residência de familiares", "Outro"]],
    ["V06", "Arranjo domiciliar", "s", ["Sozinho", "Cônjuge", "Filhos", "Outros familiares", "Cuidador formal"]],
  ]},
  { domain: "Morbidade e carga de doença", vars: [
    ["V07", "Hipertensão", "s", SIMNAO], ["V08", "Diabetes", "s", SIMNAO],
    ["V09", "Doença cardiovascular (DAC/IC/DAOP/FA)", "s", SIMNAO],
    ["V10", "Doença cerebrovascular (AVC/AIT)", "s", SIMNAO], ["V11", "Doença pulmonar crônica", "s", SIMNAO],
    ["V12", "Doença renal crônica", "s", ["Não", "Sim — estágio 1", "Sim — estágio 2", "Sim — estágio 3a", "Sim — estágio 3b", "Sim — estágio 4", "Sim — estágio 5"]],
    ["V13", "Doença osteoarticular relevante", "s", SIMNAO],
    ["V14", "Câncer", "s", ["Nenhum", "Prévio", "Ativo", "Em tratamento"]],
  ]},
  { domain: "Medicamentos e prescrição", vars: [
    ["V15", "Número total de medicamentos", "n"], ["V16", "Polifarmácia (≥5)", "s", SIMNAO],
    ["V17", "Hiperpolifarmácia (≥10)", "s", SIMNAO],
    ["V18", "Nº medicamentos potencialmente inapropriados (Beers/STOPP)", "n"],
    ["V19", "Carga anticolinérgica (escore)", "n"],
    ["V20", "Nº medicamentos associados a risco de queda", "n"],
    ["V21", "Nº prescrições potencialmente omissas (START)", "n"],
    ["V22", "Intervenção de deprescrição no período", "s", ["Nenhuma", "Redução", "Suspensão", "Substituição"]],
  ]},
  { domain: "Funcionalidade", vars: [
    ["V23", "Katz — ABVD (escore)", "n"], ["V24", "Lawton-Brody — AIVD (escore)", "n"],
    ["V25", "Dependência ABVD", "s", ["Independente", "Parcial", "Importante"]],
    ["V26", "Dependência AIVD", "s", ["Independente", "Parcial", "Importante"]],
    ["V27", "Capacidade de caminhar", "s", ["Independente", "Com dispositivo", "Com assistência", "Incapaz"]],
    ["V28", "Uso de dispositivo auxiliar", "s", SIMNAO],
    ["V29", "Atividade física habitual (min/semana)", "n"],
    ["V30", "Mudança funcional desde a última avaliação", "s", ["Melhorou", "Estável", "Piorou"]],
  ]},
  { domain: "Mobilidade e quedas", vars: [
    ["V31", "Queda nos últimos 12 meses", "s", SIMNAO], ["V32", "Número de quedas/12 meses", "n"],
    ["V33", "Queda recorrente (≥2/12 meses)", "s", SIMNAO], ["V34", "Queda com lesão", "s", SIMNAO],
    ["V35", "Queda com fratura", "s", SIMNAO], ["V36", "TUG (segundos, valor bruto)", "n"],
    ["V37", "Velocidade de marcha habitual (m/s)", "n"],
    ["V38", "Medo de cair (FES-I ou equivalente, escore)", "n"],
  ]},
  { domain: "Fragilidade e sarcopenia", vars: [
    ["V39", "Clinical Frailty Scale (1-9)", "s", ["1","2","3","4","5","6","7","8","9"]],
    ["V40", "Fenótipo de Fried (5 componentes)", "t"],
    ["V41", "SARC-F (0-10)", "n"], ["V42", "Força de preensão palmar (kg)", "n"],
    ["V43", "Sentar-levantar 5x (segundos)", "n"], ["V44", "Massa muscular (valor + método)", "t"],
    ["V45", "Circunferência da panturrilha (cm)", "n"],
  ]},
  { domain: "Cognição e neuropsiquiatria", vars: [
    ["V46", "MoCA (escore bruto + versão + escolaridade)", "t"],
    ["V47", "Diagnóstico cognitivo", "s", ["Normal", "Comprometimento subjetivo (CCS)", "MCI/CCL", "Demência"]],
    ["V48", "Tipo provável de transtorno neurocognitivo", "t"], ["V49", "Delirium prévio", "s", SIMNAO],
    ["V50", "Risco de delirium", "s", ["Baixo", "Moderado", "Alto"]],
    ["V51", "Mudança cognitiva percebida pelo informante", "s", ["Sim", "Não", "Não se aplica"]],
    ["V52", "Sintomas neuropsiquiátricos (NPI-Q, escore)", "n"],
  ]},
  { domain: "Nutrição", vars: [
    ["V53", "Peso (kg)", "n"], ["V54", "IMC (kg/m²)", "n"],
    ["V55", "Perda ponderal não intencional 6m (%)", "n"], ["V56", "MNA-SF (0-14)", "n"],
    ["V57", "Circunferência da panturrilha (cm)", "n"],
    ["V58", "Ingestão proteica estimada (g/kg/dia)", "n"], ["V59", "Risco de disfagia", "s", SIMNAO],
  ]},
  { domain: "Humor, sono e comportamento", vars: [
    ["V60", "Depressão (GDS-15, escore)", "n"], ["V61", "Ansiedade (GAD-7 ou equivalente, escore)", "n"],
    ["V62", "Qualidade do sono", "s", ["Boa", "Regular", "Ruim"]],
    ["V63", "Insônia clinicamente relevante", "s", SIMNAO], ["V64", "Sonolência diurna", "s", SIMNAO],
  ]},
  { domain: "Sentidos, continência e saúde oral", vars: [
    ["V65", "Déficit visual", "s", ["Normal", "Leve", "Moderado", "Grave"]],
    ["V66", "Déficit auditivo", "s", SIMNAO],
    ["V67", "Incontinência urinária", "s", ["Não", "Sim — urgência", "Sim — esforço", "Sim — mista", "Sim — outra"]],
    ["V68", "Incontinência fecal", "s", SIMNAO], ["V69", "Saúde oral (OHAT ou equivalente, escore)", "n"],
  ]},
  { domain: "Contexto social, segurança e objetivos", vars: [
    ["V70", "Rede de suporte social", "s", ["Adequada", "Parcial", "Inadequada"]],
    ["V71", "Sobrecarga do cuidador (Zarit, escore)", "n"],
    ["V72", "Risco social/violência/negligência", "s", SIMNAO],
    ["V73", "Diretivas antecipadas / objetivos de cuidado", "s", ["Não discutido", "Discutido", "Registrado", "DAV existente"]],
  ]},
  { domain: "Laboratório e fisiologia", vars: [
    ["V74", "Hemoglobina (g/dL)", "n"], ["V75", "Creatinina + eGFR (valor + método)", "t"],
    ["V76", "Albumina (g/dL)", "n"],
  ]},
];

function buildVariableCatalog(): string {
  return CORE76.map(d => {
    const lines = d.vars.map(([id, label, type, options]) => {
      if (type === "s" && options) return `${id} | ${label} | seleção única, valor deve ser exatamente uma destas opções: ${options.join(" / ")}`;
      if (type === "n") return `${id} | ${label} | número (só o valor, sem unidade)`;
      return `${id} | ${label} | texto curto`;
    });
    return `## ${d.domain}\n${lines.join("\n")}`;
  }).join("\n\n");
}

const SYSTEM_PROMPT = `Você extrai variáveis clínicas estruturadas de um texto de história clínica em \
português (BR), escrito por um médico geriatra, para popular uma coorte de pesquisa. \
Use exclusivamente informação explícita ou de inferência clínica direta e segura no texto — \
nunca invente, nunca deduza por estatística populacional. Se uma variável não tem evidência \
clara no texto, simplesmente não a inclua na resposta (não adivinhe). \
Para variáveis de seleção (tipo "s"), o valor retornado precisa ser IDÊNTICO a uma das opções \
listadas para aquela variável. Para variáveis numéricas, retorne só o número. \
Para cada variável incluída, cite o trecho exato do texto original que embasa o valor.`;

const TOOL = {
  name: "extract_variables",
  description: "Registra as variáveis clínicas identificadas no texto, cada uma com valor e evidência.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            variable_id: { type: "string", description: "Código da variável, ex: V07" },
            value: { type: "string" },
            evidence: { type: "string", description: "Trecho literal do texto original que embasa o valor" },
          },
          required: ["variable_id", "value", "evidence"],
        },
      },
    },
    required: ["suggestions"],
  },
};

const ALLOWED_ORIGINS = new Set(["https://cognisa.med.br", "https://www.cognisa.med.br"]);

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://cognisa.med.br",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function isLoggedIn(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  return res.ok;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await isLoggedIn(req))) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada nos secrets da function." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let freeText: string;
  try {
    const body = await req.json();
    freeText = (body.freeText || "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!freeText) {
    return new Response(JSON.stringify({ error: "Texto vazio." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userMessage = `Dicionário de variáveis disponíveis:\n\n${buildVariableCatalog()}\n\n---\n\nTexto clínico:\n\n${freeText}`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [TOOL],
      tool_choice: { type: "tool", name: "extract_variables" },
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return new Response(JSON.stringify({ error: `Erro da API Anthropic: ${errText}` }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await anthropicRes.json();
  const toolUse = data.content?.find((block: { type: string }) => block.type === "tool_use");
  const suggestions = toolUse?.input?.suggestions ?? [];

  // Descarta qualquer variable_id que não exista no dicionário (defesa contra alucinação de código).
  const validIds = new Set(CORE76.flatMap(d => d.vars.map(v => v[0])));
  const cleaned = suggestions.filter((s: { variable_id: string }) => validIds.has(s.variable_id));

  return new Response(JSON.stringify({ suggestions: cleaned }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
