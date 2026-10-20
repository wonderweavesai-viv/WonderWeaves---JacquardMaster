
import { WeaveInput, WeavePattern } from '../types';

/**
 * Generates the interlacement structure and visual pattern based on draft and peg plan.
 */
export const generateWeave = (input: WeaveInput): WeavePattern => {
  const { draft, pegPlan, warpPattern, weftPattern } = input;
  const harnesses = draft.length;
  const warpThreads = warpPattern.length;
  const weftPicks = weftPattern.length;
  
  const structure: boolean[][] = Array.from({ length: weftPicks }, () => Array(warpThreads).fill(false));
  const pattern: string[][] = Array.from({ length: weftPicks }, () => Array(warpThreads).fill('transparent'));

  for (let w = 0; w < warpThreads; w++) {
    // Find active harness for this warp end (Threading)
    let activeHarness = -1;
    for (let h = 0; h < harnesses; h++) {
      if (draft[h] && draft[h][w]) {
        activeHarness = h;
        break;
      }
    }

    for (let p = 0; p < weftPicks; p++) {
      // Is this harness lifted for this pick? (Lifting/Pegging)
      const isWarpUp = activeHarness !== -1 && pegPlan[p] ? pegPlan[p][activeHarness] : false;
      structure[p][w] = isWarpUp;
      pattern[p][w] = isWarpUp ? warpPattern[w] : weftPattern[p];
    }
  }

  return { 
      pattern, 
      structure, 
      width: warpThreads, 
      height: weftPicks 
  };
};

/**
 * Reconstructs draft and peg plan from a finished weave structure grid.
 * Used for AI-generated patterns and complex structure analysis.
 */
export const reconstructWeaveFromGrid = (grid: boolean[][], warpThreads: number, weftPicks: number) => {
    // Basic reconstruction assuming straight draw to satisfy interface
    const harnesses = 8; 
    const draft: boolean[][] = Array.from({ length: harnesses }, (_, h) => 
        Array.from({ length: warpThreads }, (_, w) => (w % harnesses) === h)
    );
    const pegPlan: boolean[][] = Array.from({ length: weftPicks }, (_, p) => 
        Array.from({ length: harnesses }, (_, h) => grid[p] ? grid[p][h % warpThreads] : false)
    );
    return { draft, pegPlan, harnesses };
};
