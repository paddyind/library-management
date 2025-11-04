/**
 * Role utility functions for consistent RBAC checking
 * Normalizes role comparisons to handle case-insensitive checks
 */

/**
 * Normalizes a role string to lowercase for consistent comparison
 * @param {string} role - Role string (e.g., 'Admin', 'admin', 'ADMIN')
 * @returns {string} Normalized lowercase role ('admin', 'librarian', 'member')
 */
export function normalizeRole(role) {
  if (!role) return null;
  return role.toLowerCase().trim();
}

/**
 * Checks if user has admin role
 * @param {object} user - User object with role property
 * @returns {boolean}
 */
export function isAdmin(user) {
  return normalizeRole(user?.role) === 'admin';
}

/**
 * Checks if user has librarian role
 * @param {object} user - User object with role property
 * @returns {boolean}
 */
export function isLibrarian(user) {
  return normalizeRole(user?.role) === 'librarian';
}

/**
 * Checks if user has member role
 * @param {object} user - User object with role property
 * @returns {boolean}
 */
export function isMember(user) {
  return normalizeRole(user?.role) === 'member';
}

/**
 * Checks if user has admin or librarian role
 * @param {object} user - User object with role property
 * @returns {boolean}
 */
export function isAdminOrLibrarian(user) {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'librarian';
}

/**
 * Checks if user has any of the specified roles
 * @param {object} user - User object with role property
 * @param {string[]} roles - Array of role strings to check against
 * @returns {boolean}
 */
export function hasAnyRole(user, roles) {
  const userRole = normalizeRole(user?.role);
  return roles.some(role => normalizeRole(role) === userRole);
}

/**
 * Gets the display name for a user (name or formatted email)
 * @param {object} user - User object with name and email properties
 * @returns {string}
 */
export function getUserDisplayName(user) {
  if (user?.name) return user.name;
  if (user?.email) {
    // Remove 'demo_' prefix and replace underscores with spaces, then capitalize
    const emailName = user.email.split('@')[0]
      .replace(/^demo_/, '')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return emailName;
  }
  return 'User';
}
