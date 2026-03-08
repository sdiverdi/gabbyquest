export const WALL_TL = 0
export const WALL_T = 1
export const WALL_TR = 2
export const WALL_L = 8
export const WALL_C = 9
export const WALL_R = 10
export const WALL_BL = 16
export const WALL_B = 17
export const WALL_BR = 18

export const SAND = 5
export const ROUGH = 13

export const CACTUS = 30
export const ROCKS = 31
export const PLANT_A = 37
export const PLANT_B = 38
export const PLANT_C = 39
export const SIGN = 45
export const SHRUB_A = 46
export const SHRUB_B = 47

export const GROUND_TILES = [
  { index: SAND, label: 'Sand' },
  { index: ROUGH, label: 'Rough sand' },
]

export const WALL_TILES = [
  { index: WALL_C, label: 'Brick block' },
  { index: WALL_TL, label: 'Wall corner TL' },
  { index: WALL_T, label: 'Wall edge top' },
  { index: WALL_TR, label: 'Wall corner TR' },
  { index: WALL_L, label: 'Wall edge left' },
  { index: WALL_R, label: 'Wall edge right' },
  { index: WALL_BL, label: 'Wall corner BL' },
  { index: WALL_B, label: 'Wall edge bottom' },
  { index: WALL_BR, label: 'Wall corner BR' },
]

export const DECOR_TILES = [
  { index: CACTUS, label: 'Cactus' },
  { index: ROCKS, label: 'Rocks' },
  { index: PLANT_A, label: 'Plant A' },
  { index: PLANT_B, label: 'Plant B' },
  { index: PLANT_C, label: 'Plant C' },
  { index: SIGN, label: 'Sign' },
  { index: SHRUB_A, label: 'Shrub A' },
  { index: SHRUB_B, label: 'Shrub B' },
]

export const COLLISION_TILE = WALL_C