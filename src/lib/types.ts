
import { type BadgeStyleConfig } from "./badge-styles";

export interface Student {
  id: string;
  nome: string;
  matricula: string;
  numeroChamada?: string; // NOVO: Número de diário
  segmento: string;
  turma: string;
  fotoUrl: string; // Base64 data URL ou link externo
  customData?: { [key: string]: string };
  modeloId?: string; // ID do modelo de crachá vinculado
  enabled?: boolean; // Selecionado para impressão (Check azul)
  visivelFila?: boolean; // Visível no Gerenciador de Crachás
  ativo?: boolean; // Matriculado/Ativo na escola
}

export interface FieldStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  x?: number; // Posição X em mm
  y?: number; // Posição Y em mm
  width?: number; // Largura em mm
  height?: number; // Altura em mm
}

export interface HeaderField {
  id: string; // 'nome', 'turma', 'matricula', 'numeroChamada', 'segmento', 'professor'
  label: string;
  enabled: boolean;
  colSpan: number; // Mantido para compatibilidade, mas x/y/width agora priorizados
  style: FieldStyle;
}

export interface BadgeModel {
  id: string;
  nomeModelo: string;
  fundoCrachaUrl: string;
  badgeStyle: BadgeStyleConfig;
  userId?: string;
}

export interface FichaLayout {
  id: string;
  nome: string;
  tipo: 'TRIMESTRAL' | 'DISCIPLINAR' | 'INFANTIL';
  colunas: Array<{ id: string; nome: string }>; 
  categorias: Array<{ titulo: string; itens: string[] }>;
  sugestoes: string[];
  infantilConceitos?: string[]; 
  infantilLegenda?: string; 
  frontZoom?: number;
  backZoom?: number;
  backTitle?: string;
  backLinesCount?: number;
  backLineHeight?: number;
  backPeriodsCount?: number;
  backMaxChars?: number;
  hasVerso?: boolean;
  
  // Designer Pro - Granular
  headerFields?: HeaderField[];
  headerStyle?: FieldStyle; // Título "Ficha Individual"
  tabelaStyle?: FieldStyle;
  tabelaHeaderStyle?: FieldStyle;
  legendStyle?: FieldStyle;
  suggestionsStyle?: FieldStyle;
  assinaturasStyle?: FieldStyle; // Estilo base se não houver individual
  signatureStyles?: Record<string, FieldStyle>; // Estilos individuais por index "0", "1", "2"
  versoStyle?: FieldStyle; // Conteúdo geral verso
  versoTitleStyle?: FieldStyle; // Título verso
  versoPeriodStyle?: FieldStyle; // Títulos de trimestres no verso
  logoStyle?: FieldStyle;

  // Posicionamento legado/auxiliar (compatibilidade)
  headerMargemTop?: number;
  logoHeight?: number;
  logoWidth?: number;
  cabecalhoFontSize?: number;
  
  tabelaMargemTop?: number;
  tabelaFontSize?: number;
  tabelaRowHeight?: number;
  
  showSugestoesFrente?: boolean;
  sugestoesMargemTop?: number;
  sugestoesFontSize?: number;
  
  versoMargemTop?: number;
  backFontSize?: number;
  backTitleSize?: number;
  backSignatureSize?: number;
  backItemSpacing?: number;
  
  assinaturas?: string[];
  assinaturasMargemTop?: number;
  
  criadoEm?: any;
}

export interface SchoolSegment {
  id: string;
  nome: string;
  ordem: number;
  fichaLayoutId?: string; // ID do modelo de ficha vinculado
}

export interface SchoolClass {
  id: string;
  nome: string;
  segmentoId: string;
  ordem: number;
  professores?: string[];
  fichaLayoutId?: string; // ID do modelo de ficha vinculado (sobrescreve o do segmento)
}

export interface SystemConfig {
  id: string;
  logoUrl?: string;
  logoHeight?: number;
  logoFichaUrl?: string;
  logoFichaHeight?: number;
  apiSecret?: string;
  sigaUrl?: string;
  sigaToken?: string;
  sigaUsername?: string;
  sigaPassword?: string;
  defaultFichaLayoutId?: string;
  carometroCardsPerRow?: number;
  carometroBorderRadius?: number;
  carometroCardScale?: number;
  carometroGap?: number;
  carometroShadowIntensity?: number;
  carometroFontSize?: number;
  carometroBadgeBorderRadius?: number;
  carometroButtonBorderRadius?: number;
  activeTrimesterId?: string;
}

export type EvaluationScore = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface EvaluationReport {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  teacherName: string;
  year: string;
  // Estrutura flexível: { "Categoria": { "Item": { "ColunaID": "HIGH" } } }
  scores: Record<string, Record<string, Record<string, EvaluationScore>>>;
  // Estrutura flexível: { "Sugestão": { "ColunaID": true } }
  suggestions: Record<string, Record<string, boolean>>;
  considerations?: Record<string, string>; // { "t1": "...", "t2": "..." }
  createdAt?: any;
  updatedAt?: any;
}
