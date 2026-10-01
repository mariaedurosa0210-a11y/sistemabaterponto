# Backlog do Projeto - Sistema de Ponto Web

Este arquivo contém o histórico de todas as funcionalidades e estruturas criadas, ajustadas, refatoradas ou alteradas no projeto.

---

## [Inicialização] - Especificação e Documentação Base
- **SPEC.md**: Criado documento de especificação técnica oficial do sistema.
- **backlog.md**: Criado arquivo de acompanhamento contínuo do projeto.

## [Banco de Dados] - Schema DDL e Políticas RLS
- **schema.sql**: Criado arquivo DDL completo para Supabase PostgreSQL contendo:
  - Tabela `jornadas_padrao` com turnos e tolerância em minutos.
  - Tabela `funcionarios` com matrícula e status de cadastro.
  - Tabela `registros_ponto` com timestamp do servidor (`NOW()`), hash de autenticidade, foto URL, status de jornada e flags de anti-fraude (`alerta_fraude`).
  - Criação do bucket Supabase Storage `comprovantes-ponto`.
  - Configurações de RLS e seed data inicial de demonstração.

## [Frontend UI] - Design System e Estilos CSS
- **css/styles.css**: Criado sistema de estilos limpo, responsivo para modo Kiosk/Totem em tablets e desktops sem emojis (Lucide icons).

## [Módulo Backend JavaScript] - Cliente Supabase
- **js/supabaseClient.js**: Módulo de integração ES Module com Supabase JS SDK importado via CDN.
  - Inicialização do cliente com suporte a fallback offline.
  - Consulta e validação de matrícula de funcionários ativos.
  - Upload de fotos no Storage `comprovantes-ponto`.
  - Inserção de registros de ponto com tratamento de erros.

## [Módulo Câmera WebCam] - Captura Visual e Prevenção de Fraude
- **js/camera.js**: Módulo nativo com API WebRTC (`navigator.mediaDevices.getUserMedia`).
  - Gerenciamento do stream de vídeo da câmera.
  - Conversão do snapshot para arquivo Blob/JPEG.
  - Tratamento de erro quando a câmera estiver bloqueada ou ausente.

## [Regras de Negócio & Fluxos] - Lógica Principal da Aplicação
- **js/app.js**: Lógica central da aplicação Vanilla JS / ES Modules.
  - Validação de matrícula do funcionário.
  - Criptografia SHA-256 via Web Crypto API (`matricula + timestamp + tipo`).
  - Cálculo de tolerância e verificação de jornada (`ATRASO`, `SAIDA_ANTECIPADA`, `NORMAL`).
  - Tratamento de alerta anti-fraude com marcação `alerta_fraude = TRUE`.
  - Acionamento da modal e impressão de ticket via Print.js.

## [Totem HTML] - Interface Principal
- **index.html**: Interface Totem/Kiosk W3C HTML5.
  - Carregamento do Lucide Icons CDN e Print.js CDN.
  - Teclado numérico touch, preview da câmera, seletor de tipo de batida.
  - Modais de comprovante/ticket e configurações do Supabase.

## [Verificação & Testes]
- **Playwright Test**: Teste interativo executado com sucesso validando todo o fluxo do Totem, consulta de matrícula, disparo de alerta anti-fraude por câmera e geração de ticket comprovante com Hash SHA-256.
