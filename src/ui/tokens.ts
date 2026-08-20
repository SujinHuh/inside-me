export const colors = {
  canvas: '#d7d2c4',
  window: '#f4f0e6',
  windowBorder: '#3f3d36',
  titleBar: '#244a86',
  titleText: '#ffffff',
  text: '#23221f',
  textMuted: '#46433c',
  panel: '#ffffff',
  panelBorder: '#8d887c',
  status: '#245c39',
} as const;

export const spacing = {
  xs: 4,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 20,
  xxl: 22,
} as const;

export const typeScale = {
  status: 15,
  body: 16,
  title: 18,
  heading: 22,
  bodyLineHeight: 24,
  headingLineHeight: 30,
} as const;

export const typography = {
  titleLetterSpacing: 0.4,
  titleWeight: '700',
  headingWeight: '700',
  statusWeight: '600',
} as const;

export const borders = {
  panel: 1,
  window: 2,
} as const;
