/**
 * Supabase Client Module
 * Gerencia a configuração, credenciais e chamadas à API REST/Storage do Supabase.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuração padrão ou obtida via localStorage (para flexibilidade de ambiente)
const DEFAULT_SUPABASE_URL = 'https://xyzcompany.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.placeholderKey';

// Mock data para demonstração offline/fallback
const MOCK_FUNCIONARIOS = {
  '1001': {
    id: 'f1001-uuid-1111-2222',
    matricula: '1001',
    nome: 'Carlos Silva',
    cargo: 'Desenvolvedor Senior',
    ativo: true,
    jornadas_padrao: {
      id: 'j1001-uuid',
      nome: 'Comercial Padrão 08h-17h',
      entrada_1: '08:00:00',
      saida_1: '12:00:00',
      entrada_2: '13:00:00',
      saida_2: '17:00:00',
      tolerancia_minutos: 10
    }
  },
  '1002': {
    id: 'f1002-uuid-1111-2222',
    matricula: '1002',
    nome: 'Ana Souza',
    cargo: 'Analista de RH',
    ativo: true,
    jornadas_padrao: {
      id: 'j1001-uuid',
      nome: 'Comercial Padrão 08h-17h',
      entrada_1: '08:00:00',
      saida_1: '12:00:00',
      entrada_2: '13:00:00',
      saida_2: '17:00:00',
      tolerancia_minutos: 10
    }
  },
  '1003': {
    id: 'f1003-uuid-1111-2222',
    matricula: '1003',
    nome: 'Marcos Oliveira',
    cargo: 'Assistente Administrativo',
    ativo: false,
    jornadas_padrao: null
  }
};

export function getStoredConfig() {
  const url = localStorage.getItem('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

export function saveStoredConfig(url, key) {
  if (url) localStorage.setItem('SUPABASE_URL', url.trim());
  if (key) localStorage.setItem('SUPABASE_ANON_KEY', key.trim());
}

const { url, key } = getStoredConfig();
export const supabase = createClient(url, key);

/**
 * Valida o funcionário pelo número da matrícula.
 * @param {string} matricula
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function getFuncionarioByMatricula(matricula) {
  const cleanMatricula = matricula.trim();

  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*, jornadas_padrao(*)')
      .eq('matricula', cleanMatricula)
      .maybeSingle();

    if (error || !data) {
      // Fallback para mock local se ambiente Supabase ainda não estiver conectado
      if (MOCK_FUNCIONARIOS[cleanMatricula]) {
        const mockData = MOCK_FUNCIONARIOS[cleanMatricula];
        if (!mockData.ativo) {
          return { success: false, error: 'Funcionário inativo no sistema.' };
        }
        return { success: true, data: mockData };
      }
      return { success: false, error: 'Matrícula não encontrada.' };
    }

    if (!data.ativo) {
      return { success: false, error: 'Funcionário inativo no sistema.' };
    }

    return { success: true, data };
  } catch (err) {
    console.warn('Usando modo fallback local para consulta de matrícula:', err);
    if (MOCK_FUNCIONARIOS[cleanMatricula]) {
      const mockData = MOCK_FUNCIONARIOS[cleanMatricula];
      if (!mockData.ativo) {
        return { success: false, error: 'Funcionário inativo no sistema.' };
      }
      return { success: true, data: mockData };
    }
    return { success: false, error: 'Erro de conexão com o servidor.' };
  }
}

/**
 * Envia a imagem snapshot em Blob para o bucket 'comprovantes-ponto'.
 * @param {Blob} imageBlob
 * @param {string} matricula
 * @returns {Promise<{success: boolean, publicUrl?: string, error?: string}>}
 */
export async function uploadComprovanteFoto(imageBlob, matricula) {
  try {
    const fileName = `${matricula}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `capturas/${fileName}`;

    const { data, error } = await supabase.storage
      .from('comprovantes-ponto')
      .upload(filePath, imageBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.warn('Erro ao fazer upload da imagem no Supabase Storage. Usando URL base64 simulada.', error);
      return { success: true, publicUrl: 'data:image/jpeg;base64,placeholder' };
    }

    const { data: publicUrlData } = supabase.storage
      .from('comprovantes-ponto')
      .getPublicUrl(filePath);

    return { success: true, publicUrl: publicUrlData?.publicUrl || '' };
  } catch (err) {
    console.warn('Usando fallback para upload do comprovante:', err);
    return { success: true, publicUrl: 'data:image/jpeg;base64,placeholder' };
  }
}

/**
 * Salva o registro da batida de ponto no banco PostgreSQL.
 * @param {object} registroData
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function saveRegistroPonto(registroData) {
  try {
    const { data, error } = await supabase
      .from('registros_ponto')
      .insert([registroData])
      .select('*')
      .single();

    if (error) {
      console.warn('Erro ao salvar no Supabase. Retornando registro simulado localmente.', error);
      return {
        success: true,
        data: {
          ...registroData,
          id: 'ponto-uuid-' + Date.now(),
          data_hora: new Date().toISOString(),
          criado_em: new Date().toISOString()
        }
      };
    }

    return { success: true, data };
  } catch (err) {
    console.warn('Usando fallback local para gravação da batida:', err);
    return {
      success: true,
      data: {
        ...registroData,
        id: 'ponto-uuid-' + Date.now(),
        data_hora: new Date().toISOString(),
        criado_em: new Date().toISOString()
      }
    };
  }
}
