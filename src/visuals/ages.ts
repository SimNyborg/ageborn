/** Age order (DESIGN A17.8, replaces A2.2). Ages are data: a new age needs only content, visuals and audio entries. */
import type { AgeId } from '@/contracts/ids';

export const AGES: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
