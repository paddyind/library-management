/**
 * Book availability helpers — Firestore/API use Title Case statuses
 * (Available, Borrowed, …) while some older UI checks used lowercase.
 */

const AVAILABLE_STATUSES = new Set(['available', 'new']);

export function normalizeBookStatus(status) {
  if (!status || typeof status !== 'string') return '';
  return status.trim().toLowerCase();
}

export function isBookAvailable(book) {
  if (!book) return false;
  if (book.isAvailable === true) return true;
  if (book.isAvailable === false) return false;
  const status = normalizeBookStatus(book.status);
  if (!status) return true; // missing status → treat as available
  return AVAILABLE_STATUSES.has(status);
}

export function bookAvailabilityLabel(book, { borrowedByMe = false } = {}) {
  if (borrowedByMe || book?.borrowedByMe || book?.status === 'with_me') {
    return 'With me';
  }
  return isBookAvailable(book) ? 'Available' : 'Out of Stock';
}

export function bookAvailabilityCountLabel(book, { borrowedByMe = false } = {}) {
  if (borrowedByMe || book?.borrowedByMe || book?.status === 'with_me') {
    return 'Borrowed by you';
  }
  if (!isBookAvailable(book)) return '0 available';
  const count = Number(book?.count);
  const n = Number.isFinite(count) && count > 0 ? count : 1;
  return `${n} available`;
}
