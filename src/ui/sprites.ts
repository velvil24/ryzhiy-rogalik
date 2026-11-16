// Пиксельные спрайты 8×8 (рисуются как 16×16 с удвоением). Цвета подставляются по символам.
export const SPRITES: Record<string, string[]> = {
  person: [
    '..HHH...',
    '.HSSSH..',
    '..SSS...',
    '.BBBBB..',
    'S.BBB.S.',
    '..BBB...',
    '..L.L...',
    '..L.L...',
  ],
  kid: [
    '........',
    '.HHHH...',
    '.HSSH...',
    '..SS....',
    '.BBBB...',
    'S.BB.S..',
    '..L.L...',
    '..L.L...',
  ],
  cat: [
    '........',
    'C.....C.',
    'CC...CC.',
    'CCCCCCC.',
    'CECCCEC.',
    'CCCPCCC.',
    '.CCCCC.C',
    '.C...C.C',
  ],
  dog: [
    '........',
    '......DD',
    'D....DED',
    'DDDDDDDD',
    '.DDDDDD.',
    '.DDDDDD.',
    '.D.D.D.D',
    '.D.D.D.D',
  ],
  bird: [
    '........',
    '...BB...',
    '..BBEB..',
    'BBBBBBY.',
    '.BBBBB..',
    '..BBB...',
    '...Y.Y..',
    '........',
  ],
  fish: [
    '........',
    '...FF...',
    '.FFFFF.F',
    'FEFFFFFF',
    'WFFFFFFF',
    'W.FFFF.F',
    '...FF...',
    '........',
  ],
  bug: [
    '........',
    '.W....W.',
    '..W..W..',
    '...BB...',
    '..BBBB..',
    '.B.BB.B.',
    '...BB...',
    '..B..B..',
  ],
  ghost: [
    '..GGGG..',
    '.GGGGGG.',
    '.GEGGEG.',
    '.GGGGGG.',
    '.GGGGGG.',
    '.GGGGGG.',
    '.G.GG.G.',
    '........',
  ],
  big: [
    '.KKKKKK.',
    'KKEKKEKK',
    'KKKKKKKK',
    'KKKMMKKK',
    'KKKKKKKK',
    'KKKKKKKK',
    'KK.KK.KK',
    'KK.KK.KK',
  ],
  jet: [
    '...WW...',
    '...WW...',
    '..WWWW..',
    'WWWWWWWW',
    'WWWWWWWW',
    '...WW...',
    '..WWWW..',
    '........',
  ],
};

export function spriteFor(kind: string, tags: Set<string>): string | null {
  if (kind === 'player') return 'kid';
  if (tags.has('cat')) return 'cat';
  if (['dog', 'jackal'].includes(kind)) return 'dog';
  if (kind === 'crow') return 'bird';
  if (kind === 'som') return 'fish';
  if (['mosquito', 'scorpion', 'wasp'].includes(kind)) return 'bug';
  if (['shadow', 'train_shadow', 'settler'].includes(kind)) return 'ghost';
  if (['mammoth_ice', 'train_boss', 'stub_boss'].includes(kind)) return 'big';
  if (kind === 'jet') return 'jet';
  if (['emily', 'enbar', 'ido', 'amir', 'gaya', 'yonatan', 'yakut', 'iit', 'mila', 'french1', 'french2', 'elder', 'fan'].includes(kind)) return 'kid';
  if (['nina', 'vova', 'neighbor', 'teacher', 'guard', 'soldier', 'stub_mini'].includes(kind)) return 'person';
  return null;
}

export const HAIR: Record<string, string> = {
  player: '#7a3a10', nina: '#5a2a10', vova: '#3a2a20', emily: '#c06020', enbar: '#101010', ido: '#4a3020', amir: '#2a1a10',
  gaya: '#6a4020', yonatan: '#f0d060', yakut: '#101018', iit: '#3a2010', mila: '#f0c040', neighbor: '#d0d0d0', teacher: '#802040',
  guard: '#202020', soldier: '#405030', french1: '#2a1a0a', french2: '#6a3010', elder: '#202020',
};
