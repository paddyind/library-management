/**
 * Book availability helpers — supports multi-copy inventory via
 * `availableCount` / `onLoanCount` from the API (count − active loans).
 */

const AVAILABLE_STATUSES = new Set(['available', 'new']);
const BLOCKED_STATUSES = new Set(['damaged', 'reserved']);

export function normalizeBookStatus(status) {
  if (!status || typeof status !== 'string') return '';
  return status.trim().toLowerCase();
}

export function getTotalCopies(book) {
  const count = Number(book?.count);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

export function getAvailableCount(book) {
  if (!book) return 0;
  if (typeof book.availableCount === 'number') {
    return Math.max(0, book.availableCount);
  }
  const total = getTotalCopies(book);
  if (typeof book.onLoanCount === 'number') {
    return Math.max(0, total - book.onLoanCount);
  }
  // Fallback when API has not enriched loan counts yet
  if (book.isAvailable === false) return 0;
  if (book.isAvailable === true) return total;
  const status = normalizeBookStatus(book.status);
  if (BLOCKED_STATUSES.has(status)) return 0;
  if (status === 'borrowed' || status === 'lent' || status === 'with_me') return 0;
  if (!status || AVAILABLE_STATUSES.has(status)) return total;
  return 0;
}

export function isBookAvailable(book) {
  if (!book) return false;
  const status = normalizeBookStatus(book.status);
  if (BLOCKED_STATUSES.has(status)) return false;
  return getAvailableCount(book) > 0;
}

export function bookAvailabilityLabel(book, { borrowedByMe = false } = {}) {
  if (borrowedByMe || book?.borrowedByMe || book?.status === 'with_me') {
    return 'With me';
  }
  return isBookAvailable(book) ? 'Available' : 'Unavailable';
}

export function bookAvailabilityCountLabel(book, { borrowedByMe = false } = {}) {
  if (borrowedByMe || book?.borrowedByMe || book?.status === 'with_me') {
    return 'Borrowed by you';
  }
  const available = getAvailableCount(book);
  if (available <= 0) {
    const total = getTotalCopies(book);
    return total > 1 ? `All ${total} on loan` : 'On loan';
  }
  return `${available} available`;
}
