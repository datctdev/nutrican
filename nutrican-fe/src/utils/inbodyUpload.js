const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;


export function validateInbodyFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn ảnh InBody' };
  }
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_TYPES.has(type) && !file.name?.match(/\.(jpe?g|png|webp)$/i)) {
    return { ok: false, message: 'Ảnh InBody chỉ chấp nhận JPG, PNG hoặc WEBP' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'Ảnh InBody tối đa 10MB' };
  }
  return { ok: true };
}
