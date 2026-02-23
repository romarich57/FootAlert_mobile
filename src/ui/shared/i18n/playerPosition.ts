import type { TFunction } from 'i18next';

const POSITION_TRANSLATION_KEYS: Record<string, string> = {
  gk: 'goalkeeper',
  goalkeeper: 'goalkeeper',
  gardien: 'goalkeeper',
  keeper: 'goalkeeper',
  portier: 'goalkeeper',

  df: 'defender',
  defender: 'defender',
  defenders: 'defender',
  defense: 'defender',
  defence: 'defender',
  defenseur: 'defender',
  defenseurs: 'defender',
  defenseurcentral: 'centerBack',
  defenseurscentraux: 'centerBack',

  cb: 'centerBack',
  centerback: 'centerBack',
  centreback: 'centerBack',
  centraldefender: 'centerBack',

  lb: 'leftBack',
  leftback: 'leftBack',
  arrieregauche: 'leftBack',

  rb: 'rightBack',
  rightback: 'rightBack',
  arrieredroit: 'rightBack',

  lwb: 'wingBack',
  rwb: 'wingBack',
  wingback: 'wingBack',
  piston: 'wingBack',
  pistons: 'wingBack',

  mf: 'midfielder',
  midfielder: 'midfielder',
  midfielders: 'midfielder',
  milieu: 'midfielder',
  milieux: 'midfielder',

  dm: 'defensiveMidfielder',
  cdm: 'defensiveMidfielder',
  defensivemidfielder: 'defensiveMidfielder',
  milieudefensif: 'defensiveMidfielder',
  milieudefensifs: 'defensiveMidfielder',

  cm: 'centralMidfielder',
  centralmidfielder: 'centralMidfielder',
  milieucentral: 'centralMidfielder',
  milieuxcentraux: 'centralMidfielder',

  am: 'attackingMidfielder',
  cam: 'attackingMidfielder',
  attackingmidfielder: 'attackingMidfielder',
  milieuoffensif: 'attackingMidfielder',
  milieuxoffensifs: 'attackingMidfielder',

  lm: 'leftMidfielder',
  leftmidfielder: 'leftMidfielder',
  milieugauche: 'leftMidfielder',

  rm: 'rightMidfielder',
  rightmidfielder: 'rightMidfielder',
  milieudroit: 'rightMidfielder',

  fw: 'attacker',
  att: 'attacker',
  attacker: 'attacker',
  attackers: 'attacker',
  attaquant: 'attacker',
  attaquants: 'attacker',

  fwd: 'forward',
  forward: 'forward',
  forwards: 'forward',

  lw: 'leftWinger',
  leftwing: 'leftWinger',
  leftwinger: 'leftWinger',
  ailiergauche: 'leftWinger',

  rw: 'rightWinger',
  rightwing: 'rightWinger',
  rightwinger: 'rightWinger',
  ailierdroit: 'rightWinger',

  st: 'striker',
  striker: 'striker',
  buteur: 'striker',

  ss: 'secondStriker',
  secondstriker: 'secondStriker',
  secondattaquant: 'secondStriker',

  cf: 'centreForward',
  centerforward: 'centreForward',
  centreforward: 'centreForward',
  avantcentre: 'centreForward',
};

function normalizePosition(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

export function localizePlayerPosition(
  value: string | null | undefined,
  t: TFunction,
): string {
  if (!value) {
    return '';
  }

  const raw = value.trim();
  if (!raw) {
    return '';
  }

  const normalized = normalizePosition(raw);
  const key = POSITION_TRANSLATION_KEYS[normalized];
  if (!key) {
    return raw;
  }

  return t(`playerPositions.${key}`);
}
