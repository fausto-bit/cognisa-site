# Cognisa — Panteão Vital

Site de apoio a pacientes e cuidadores do Dr. Fausto Azambuja Machado (geriatria e clínica médica), estruturado em torno do **Panteão Vital**: seis domínios do envelhecimento com qualidade, representados por seis deuses gregos.

Site estático (HTML/CSS/JS puro), sem build step — pode ser publicado diretamente via GitHub Pages.

## Estrutura

```
.
├── index.html              → Home
├── formularios.html        → Hub com todos os instrumentos clínicos
├── sobre.html
├── contato.html
├── apolo.html               → Medicina baseada em evidências / polifarmácia
├── hermes.html               → Tecnologia, comunicação e diretivas antecipadas
├── atena.html                → Cognição e reserva cerebral
├── hefesto.html              → Força, sarcopenia e prevenção de quedas
├── demeter.html               → Nutrição e microbioma
├── hestia.html                → Lar, cuidador e sobrecarga
├── cognisa-*.html           → 15 formulários clínicos interativos (ver lista abaixo)
└── img/                      → Símbolos dos deuses + selo do Panteão Vital
```

## Formulários incluídos

**Acesso paciente/cuidador:** AUA Symptom Score, GDS-15, NPI-Q, Escala de Zarit, IMC, ABVD (Katz), AIVD (Lawton), AUDIT, MAN, SARC-F, CFI, Diário de Sono Simplificado.

**Exclusivo médico:** IVCF-20, MEEM, MoCA, Classificação ASA, CURB-65, Escala de Braden, BODE Index, IVSF-10.

Todos os formulários rodam 100% no navegador (sem backend), com exportação em PDF via [jsPDF](https://github.com/parallax/jsPDF) carregado por CDN, e opção de copiar o resultado para a área de transferência.

## Publicando (GitHub → Vercel)

1. Suba todo o conteúdo desta pasta para a raiz de um repositório no GitHub (mantendo `img/` junto dos `.html`).
2. Em [vercel.com](https://vercel.com), **Add New → Project → Import** o repositório do GitHub.
3. Framework preset: **Other** (site estático). Não é necessário build command nem output directory — a raiz já contém os `.html`.
4. Deploy. O projeto fica disponível em `https://<projeto>.vercel.app`.
5. Para o domínio próprio: no projeto → **Settings → Domains**, adicione `cognisa.med.br` (e `www.cognisa.med.br`, se quiser).
6. A Vercel mostra os registros DNS a configurar (normalmente um `A` para `@` e um `CNAME` para `www`). Adicione esses registros no painel DNS onde o domínio está gerenciado — não é necessário trocar os nameservers.
7. A Vercel emite o certificado SSL automaticamente depois que o DNS propaga.

## Pendências conhecidas

- Calculadora **AHA PREVENT 2026** (risco cardiovascular): ainda não implementada — depende dos coeficientes oficiais da equação ou de decisão por linkar para a calculadora oficial (`professional.heart.org/prevent`).
- Página de Contato: campos de Instagram e WhatsApp/telefone ainda como placeholder.

## Aviso legal

Todo o conteúdo é educativo e os formulários são ferramentas de apoio e triagem — não substituem avaliação médica presencial.
