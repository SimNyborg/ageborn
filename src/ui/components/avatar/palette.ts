/**
 * The avatar tints (AUDIT §6.3). Index order is part of the save format (`AvatarSpec.tints`): append
 * only, never reorder. Cloth tints avoid the reserved team hues (#2F7DF6 blue, #F28A1E orange).
 */

/** 8 skin tones, light to deep. */
export const SKIN = ['#f7d7b5', '#efc39a', '#e0a97c', '#c98b5e', '#a86f47', '#8a5638', '#6b3f28', '#4e2c1c'] as const;

/** 12 hair colours: 6 natural browns, black, blond, auburn, red, grey, white. */
export const HAIR = ['#2b1d14', '#3d2617', '#5a3820', '#7a4e2a', '#9a6a3c', '#b88a5a', '#1c1a1f', '#e0b85a', '#8e3b1e', '#c4522a', '#b0b0b0', '#e8e4dc'] as const;

/** 6 eye colours: brown, dark, hazel, green, blue-grey, grey. */
export const EYES = ['#6b4226', '#2e2018', '#8a6a2a', '#3f8a4a', '#3f7f9a', '#6a7480'] as const;

/** 8 cloth tints (no team colours): red, forest, purple, mustard, teal, brown, charcoal, cream. */
export const CLOTH = ['#b83a3a', '#3f7f46', '#7a4aa8', '#d0a23a', '#2f8f8a', '#8a5a3a', '#4a4e58', '#e6dcc4'] as const;

export const TINTS = { skin: SKIN, hair: HAIR, eyes: EYES, cloth: CLOTH } as const;
export type TintSlot = keyof typeof TINTS;
