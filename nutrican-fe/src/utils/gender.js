/** Canonical HV gender: lowercase male | female (accepts MALE/FEMALE/m/f). */
export function normalizeGender(value) {
  if (value == null || value === '') return '';
  const g = String(value).trim().toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return '';
}

export function genderLabel(value) {
  const g = normalizeGender(value);
  if (g === 'male') return 'Nam';
  if (g === 'female') return 'Nữ';
  return '—';
}
