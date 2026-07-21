// Định dạng số tiền VND, ví dụ: 1200000 -> "1.200.000đ"
export function formatVnd(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '0đ';
    return `${value.toLocaleString('vi-VN')}đ`;
}
