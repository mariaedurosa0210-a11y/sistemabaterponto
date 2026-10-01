-- =============================================================================
-- SCHEMA DDL - SISTEMA DE PONTO WEB (SUPABASE POSTGRESQL)
-- =============================================================================

-- Habilitar extensão para geração de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- TABELA: jornadas_padrao
-- Define os horários padrão de trabalho e limite de tolerância em minutos.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jornadas_padrao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    entrada_1 TIME NOT NULL,
    saida_1 TIME NOT NULL,
    entrada_2 TIME,
    saida_2 TIME,
    tolerancia_minutos INTEGER NOT NULL DEFAULT 10,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- TABELA: funcionarios
-- Cadastro dos funcionários elegíveis ao ponto por matrícula.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    jornada_id UUID REFERENCES public.jornadas_padrao(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para buscas rápidas por matrícula
CREATE INDEX IF NOT EXISTS idx_funcionarios_matricula ON public.funcionarios(matricula);
CREATE INDEX IF NOT EXISTS idx_funcionarios_ativo ON public.funcionarios(ativo);

-- -----------------------------------------------------------------------------
-- TABELA: registros_ponto
-- Tabela de batidas de ponto registradas com timestamp do servidor (NOW()).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    matricula VARCHAR(50) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA')),
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_autenticidade VARCHAR(64) NOT NULL,
    foto_url TEXT,
    status_jornada VARCHAR(30) NOT NULL DEFAULT 'NORMAL' CHECK (status_jornada IN ('NORMAL', 'ATRASO', 'SAIDA_ANTECIPADA', 'HORA_EXTRA')),
    alerta_fraude BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_alerta TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para relatórios e consultas por data/matrícula
CREATE INDEX IF NOT EXISTS idx_registros_ponto_matricula ON public.registros_ponto(matricula);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON public.registros_ponto(data_hora);

-- -----------------------------------------------------------------------------
-- CONFIGURAÇÃO DO BUCKET DO SUPABASE STORAGE
-- Bucket: comprovantes-ponto
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-ponto', 'comprovantes-ponto', true)
ON CONFLICT (id) DO NOTHING;

-- Polítícas de Acesso para Storage (Public Read / Public Upload para Totem)
CREATE POLICY "Acesso público de leitura em comprovantes-ponto"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprovantes-ponto');

CREATE POLICY "Acesso público de inserção em comprovantes-ponto"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprovantes-ponto');

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Habilita RLS nas tabelas e define permissões para acesso anônimo/público (Totem Kiosk)
-- -----------------------------------------------------------------------------
ALTER TABLE public.jornadas_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

-- Leitura pública para validação de funcionários e jornadas no totem
CREATE POLICY "Permitir leitura de jornadas_padrao" ON public.jornadas_padrao FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de funcionarios" ON public.funcionarios FOR SELECT USING (true);

-- Leitura e Inserção de registros de ponto via Totem
CREATE POLICY "Permitir leitura de registros_ponto" ON public.registros_ponto FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de registros_ponto" ON public.registros_ponto FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- DADOS INICIAIS DE DEMONSTRAÇÃO (SEED DATA)
-- -----------------------------------------------------------------------------
INSERT INTO public.jornadas_padrao (id, nome, entrada_1, saida_1, entrada_2, saida_2, tolerancia_minutos)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Comercial Padrão 08h-17h', '08:00:00', '12:00:00', '13:00:00', '17:00:00', 10)
ON CONFLICT DO NOTHING;

INSERT INTO public.funcionarios (matricula, nome, cargo, jornada_id, ativo)
VALUES
  ('1001', 'Carlos Silva', 'Desenvolvedor Senior', '11111111-1111-1111-1111-111111111111', true),
  ('1002', 'Ana Souza', 'Analista de RH', '11111111-1111-1111-1111-111111111111', true),
  ('1003', 'Marcos Oliveira', 'Assistente Administrativo', '11111111-1111-1111-1111-111111111111', false)
ON CONFLICT DO NOTHING;
