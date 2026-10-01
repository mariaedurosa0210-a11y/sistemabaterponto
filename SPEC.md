# 📋 ESPECIFICAÇÃO TÉCNICA PRINCIPAL (SPEC) — SISTEMA DE PONTO WEB

> **Público-alvo:** Agente de IA Assector/Programador (Google Jules).
> **Objetivo:** Orientar a criação autônoma e incremental do sistema de controle de ponto de funcionários.

---

## 🤖 INSTRUÇÕES DE EXECUÇÃO PARA O AGENTE DE IA (GOOGLE JULES)

1. **Ação Prévia Obrigatoria:**
   - Se houver qualquer dúvida, ambiguidade ou inconsistência nos requisitos, **NÃO CODIFIQUE**. Solicite esclarecimentos antes de prosseguir.
2. **Divisão de Tarefas:**
   - Sempre divida programações extensas em tarefas e subtarefas incrementais.
   - Execute e teste uma funcionalidade/módulo por vez.
3. **Registro Continuo de Progresso (`backlog.md`):**
   - Crie e mantenha um arquivo `backlog.md` na raiz do repositório.
   - Registre todas as funcionalidades implementadas, ajustadas, refatoradas ou alteradas a cada sessão de trabalho.

---

## 🏛️ ARQUITETURA DE SOFTWARE & STACK TECNOLÓGICA

- **Hospedagem & Controle de Versão:** GitHub.
- **Backend & Banco de Dados:** Supabase via API REST / Client SDK (PostgreSQL).
- **Linguagens e Padrões:** W3C HTML5, CSS3 Nativo, JavaScript ES6+ (Vanilla / No-Build).
- **Proibição Estrita de Bundlers e Package Managers:**
  - NÃO utilizar Node.js, NPM, Yarn, Vite, Webpack ou Babel.
  - Todo o código deve rodar diretamente no navegador via ES Modules nativos.

---

## 📦 BIBLIOTECAS PERMITIDAS (VIA CDN W3C / IMPORT MAPS)

Para evitar duplicidade de código e erros de implementação, utilize **exclusivamente** as bibliotecas abaixo importadas via CDN:

| Biblioteca | Origem CDN | Finalidade |
| :--- | :--- | :--- |
| **@supabase/supabase-js** | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | Cliente REST/Realtime do Supabase. |
| **Lucide Icons** | `https://unpkg.com/lucide@latest` | Ícones SVG limpos (Proibido uso de Emojis na UI). |
| **Print.js** | `https://printjs-4000.codingo.me/v1/print.min.js` | Formatação e impressão direta do ticket comprovante. |

---

## 🎨 DIRETRIZES DE INTERFACE DE USUÁRIO (UI/UX)

- **Público de Uso:** Exclusivo para telas médias/grandes (Tablets e Desktops em modo Kiosk/Totem).
- **Estilo:** Design limpo, fundo claro/branco (`#ffffff` / `#f8fafc`), tipografia legível e alto contraste.
- **Ícones:** Use exclusivamente a biblioteca **Lucide Icons**. NENHUM emoji deve ser utilizado nos componentes de interface.
- **APIs Nativas da Web:**
  - `navigator.mediaDevices.getUserMedia`: Exclusivamente para acesso à câmera fotográfica no momento da batida.

---

## ⚙️ ESPECIFICAÇÃO DE MÓDULOS E REGRAS DE NEGÓCIO

### Módulo 1: Totem de Registro de Ponto (`index.html`)
1. **Identificação:** Campo numérico para digitação da `matricula`.
2. **Validação:** Consulta na API do Supabase para verificar se o funcionário existe e está ativo.
3. **Captura Visual (Câmera):**
   - O sistema ativa o preview da câmera frontal/webcam.
   - Ao confirmar o registro, captura um snapshot em formato Blob/JPEG.
   - O arquivo é enviado para o Bucket do Storage do Supabase (`comprovantes-ponto`).
4. **Gravando a Batida:**
   - A data e hora da batida são geradas **exclusivamente pelo banco de dados** (`NOW()`) para prevenir fraudes no relógio do dispositivo cliente.
   - Gera um Hash de autenticidade no formato SHA-256 combinando `matricula + timestamp + tipo`.
5. **Emissão de Comprovante (Ticket):**
   - Exibe na tela e aciona a impressão de um ticket minimalista contendo: Nome, Matrícula, Tipo de Batida, Data/Hora Oficial e Hash de Autenticidade.

### Módulo 2: Tratamento de Exceções e Segurança Anti-Fraude
1. **Prevenção de Fraude de Imagem:** Caso a câmera esteja indisponível ou seja bloqueada, a batida é cancelada e o evento é registrado com a flag `alerta_fraude = TRUE`.
2. **Verificação de Jornada:** Compara a hora de registro com a tabela `jornadas_padrao`. Caso o horário esteja fora do limite estabelecido na coluna `tolerancia_minutos`, o sistema marca a batida como `ATRASO` ou `SAIDA_ANTECIPADA`.

---

## 📁 ESTRUTURA DE ARQUIVOS ESPERADA

```text
/
├── SPEC.md              # Este documento de especificação
├── backlog.md           # Registro histórico de alterações executadas pela IA
├── schema.sql           # DDL do banco de dados para o Supabase
├── index.html           # Tela principal do Totem de Registro de Ponto
├── css/
│   └── styles.css       # Design System em CSS3 (Variáveis & Layout Grid/Flex)
└── js/
    ├── supabaseClient.js # Configuração e inicialização do cliente Supabase
    ├── camera.js        # Módulo nativo de manipulação da WebCam
    └── app.js           # Fluxo de navegação, validação e chamadas de API
```
