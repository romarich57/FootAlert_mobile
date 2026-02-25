const NATIONALITY_TO_ISO2: Record<string, string> = {
  algeria: 'DZ',
  angola: 'AO',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  belgium: 'BE',
  benin: 'BJ',
  bolivia: 'BO',
  bosniaandherzegovina: 'BA',
  brazil: 'BR',
  bulgaria: 'BG',
  cameroon: 'CM',
  canada: 'CA',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  croatia: 'HR',
  czechrepublic: 'CZ',
  denmark: 'DK',
  ecuador: 'EC',
  egypt: 'EG',
  england: 'GB',
  france: 'FR',
  gabon: 'GA',
  germany: 'DE',
  ghana: 'GH',
  greece: 'GR',
  guinea: 'GN',
  holland: 'NL',
  hungary: 'HU',
  iceland: 'IS',
  iran: 'IR',
  iraq: 'IQ',
  ireland: 'IE',
  israel: 'IL',
  italy: 'IT',
  ivorycoast: 'CI',
  japan: 'JP',
  mali: 'ML',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  nigeria: 'NG',
  norway: 'NO',
  paraguay: 'PY',
  peru: 'PE',
  poland: 'PL',
  portugal: 'PT',
  qatar: 'QA',
  romania: 'RO',
  russia: 'RU',
  saudiarabia: 'SA',
  scotland: 'GB',
  senegal: 'SN',
  serbia: 'RS',
  slovakia: 'SK',
  slovenia: 'SI',
  southafrica: 'ZA',
  southkorea: 'KR',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  tunisia: 'TN',
  turkey: 'TR',
  ukraine: 'UA',
  unitedstates: 'US',
  uruguay: 'UY',
  venezuela: 'VE',
  wales: 'GB',
};

function normalizeCountryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function resolveIso2FromNationality(nationality: string): string | null {
  const trimmed = nationality.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const normalized = normalizeCountryName(trimmed);
  return NATIONALITY_TO_ISO2[normalized] ?? null;
}

export function getCountryFlagUrl(nationality: string | null | undefined): string | null {
  if (!nationality) {
    return null;
  }

  const iso2 = resolveIso2FromNationality(nationality);
  if (!iso2) {
    return null;
  }

  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`;
}
