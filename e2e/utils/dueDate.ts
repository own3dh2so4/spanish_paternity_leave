/** First day of a month a few months ahead, formatted dd/MM/yyyy for the datepicker. */
export function upcomingDueDate(monthsAhead = 3): string {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthsAhead);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
}
