
export type YarnModel = 'simple' | 'mouline' | 'melange' | 'space-dyed' | 'grindle';
export type YarnConstruction = 'standard' | 'slub' | 'chenille' | 'boucle' | 'chain' | 'tweed';
export type FiberType = 'Cotton' | 'Wool' | 'Silk' | 'Linen' | 'Synthetic' | 'Lurex' | 'Poly-Cotton' | 'Acrylic';
export type YarnCountSystem = 'Nm' | 'Ne' | 'Denier' | 'Tex' | 'Lea';

export interface WeaveSettings {
  warpThreads: number;
  weftPicks: number;
  epi: number; 
  ppi: number; 
  gridDivision: number; 
  gridX: number; 
  gridY: number; 
  harnesses: number; 
  warpFloatThreshold: number;
  weftFloatThreshold: number;
}

export interface YarnDefinition {
  color: string;
  colorB?: string;
  colorC?: string;
  model: YarnModel;
  construction: YarnConstruction;
  fiberType: FiberType;
  countSystem: YarnCountSystem;
  count: number;
  ply: number;
  code?: string;
  price?: number;
  thickness: number;
  spacing?: number;
  twist: 'S' | 'Z';
  tpi: number;
  sheen: number;
  roughness: number;
  unevenness?: number;
  shadowStrength?: number;
  hairiness?: number;
  hairLength?: number;
  hairCurl?: number;
  hairThickness?: number;
  pileLength?: number;
  coreColor?: string;
  spaceDyeLength?: number;
  slubMode?: 'random' | 'periodic';
  slubLength?: number;
  slubDistance?: number;
  slubAmplitude?: number;
  slubColor?: string;
  loopInterval?: number;
  loopSize?: number;
  preferredPPI?: number;
  isExtraWeft?: boolean;
  isExtraWarp?: boolean;
  extraFloatOpacity?: number;
  extraOverlap?: number;
  floatWaviness?: number;
  bindingDepth?: number;
  floatTaper?: number;
  shadowAngle?: number;
  shadowThrow?: number;
  strength?: number; 
  elongation?: number; 
  ipi?: number;
  coreThickness?: number;
  pileDensity?: number;
  pileThickness?: number;
  directionalUniformity?: number;
  slackTension?: number;
}

export type ToolType = 'pencil' | 'line' | 'fill' | 'pan' | 'rect' | 'brush';
export type ViewMode = 'interlace' | 'structure' | 'graph';
export type FaceMode = 'face' | 'reverse';
export type RulerUnit = 'thread' | 'inch' | 'cm';

export interface JacquardData {
    structure: Uint8Array; 
    width: number;
    height: number;
}

export type AppMode = 'specs' | 'art' | 'yarn' | 'pattern' | 'colorways' | 'sim' | 'tech' | 'weave' | 'weave-studio' | 'presentation' | 'loom-tech' | 'loom-editor';

export interface LibraryWeave {
  id: string;
  name: string;
  category: string;
  description: string;
  harnesses: number;
  draft: number[][]; 
  pegPlan: number[][]; 
}

export interface LoomTechColumn {
    id: string;
    hookNumber: number;
    label: string;
    type: 'weft-selector' | 'cramming' | 'pile' | 'regulator' | 'custom';
    color: string;
}

export interface LoomTechState {
    columns: LoomTechColumn[];
    grid: boolean[][]; // [pickIdx][columnIdx]
}

export interface LoomHookZone {
    id: string;
    label: string;
    startHook: number;
    endHook: number;
    color: string;
    type: 'selvedge' | 'design' | 'selector' | 'empty';
    weaveId?: string; // NEW: Assigned structure for selvedge zones
}

export interface LoomConfiguration {
    totalHooks: number;
    selectorHooks: number;
    gridWidth: number; // e.g. 16
    zones: LoomHookZone[];
    castOut?: {
        active: boolean;
        on: number;
        off: number;
        onlyDesignHooks?: boolean;
    };
}

export interface WarpBeam {
  id: string;
  name: string;
  color: string;
  harnesses: number[];
  yarns: { [key: string]: YarnDefinition };
  pattern: string;
}

export interface ProductionSettings {
  clientName: string;
  orderNumber: string;
  loomId: string;
  weaverName: string;
  finishedWidth: number;
  finishedLength: number;
  warpTakeUp: number;
  weftContraction: number;
  warpWaste: number;
  weftWaste: number;
  priceCurrency: string;
}

export interface MillTicketConfig {
  showDraft: boolean;
  showPegPlan: boolean;
  showYarns: boolean;
  showCosting: boolean;
  showSwatch: boolean;
  showWarpPattern: boolean;
  showWeftPattern: boolean;
  paperSize: 'A4' | 'Letter';
}

export interface WeaveStudioCell {
    weave: LibraryWeave | null;
    faceMode: 'face' | 'back';
    offsetX: number;
    offsetY: number;
    forceState: 'none' | 'up' | 'down';
    color: string; 
}

export interface WeaveStudioState {
    warpSystems: number;
    weftSystems: number;
    cells: WeaveStudioCell[][]; 
    warpArrangement: number[]; 
    weftArrangement: number[]; 
}

export interface Colorway {
    id: string;
    name: string;
    warpYarns: { [key: string]: YarnDefinition };
    weftYarns: { [key: string]: YarnDefinition };
    thumbnail?: string;
}

export interface DensityZone {
  id: string;
  startPick: number; 
  endPick: number;   
  ppi: number;
  color: string;
}

export interface WeavePattern {
  pattern: string[][];      
  structure: boolean[][];    
  width: number;
  height: number;
}

export interface WeaveInput {
  draft: boolean[][];
  pegPlan: boolean[][];
  warpPattern: string[];
  weftPattern: string[];
}