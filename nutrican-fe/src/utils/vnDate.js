/** Calendar date in Asia/Ho_Chi_Minh as yyyy-MM-dd (matches BE DietDates.todayVn). */
export function todayVnIso(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}
