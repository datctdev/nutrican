export function formatVnd(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '0đ';
    return `${value.toLocaleString('vi-VN')}đ`;
}
