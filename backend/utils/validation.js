/**
 * Input Validation Utilities
 * Reusable validators for strings, emails, and FAQ data.
 */

/**
 * Create an error with an HTTP status code.
 * @param {number} status
 * @param {string} message
 * @returns {Error}
 */
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Validate and trim a string field.
 * @param {*} value       Raw input value
 * @param {string} label  Human-readable field name for error messages
 * @param {number} maxLen Maximum allowed string length
 * @param {boolean} required Whether the field is required
 * @returns {string} Trimmed string value
 */
function stringField(value, label, maxLen, required = true) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null)) return '';
    throw fail(400, `${label} is required.`);
  }
  const result = value.trim();
  if (required && !result) throw fail(400, `${label} is required.`);
  if (result.length > maxLen) throw fail(400, `${label} must be no longer than ${maxLen} characters.`);
  return result;
}

/**
 * Validate an email address.
 * @param {*} value Raw input
 * @returns {string} Normalized lowercase email
 */
function validEmail(value) {
  const email = stringField(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw fail(400, 'Enter a valid email address.');
  }
  return email;
}

/**
 * Extract a safe public user object (no password hash).
 * @param {Object} user
 * @returns {Object}
 */
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Compute dashboard stats from a project list.
 * @param {Array} projects
 * @returns {Object}
 */
function projectStats(projects) {
  return {
    active: projects.filter(p => !['Completed', 'Cancelled'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'Completed').length,
    pending: projects.filter(p => ['Pending', 'In Review'].includes(p.status)).length
  };
}

const FAQ_CATEGORIES = new Set(['general', 'technical', 'security', 'pricing', 'support']);

/**
 * Validate FAQ input fields.
 * @param {Object} body
 * @returns {Object} Validated FAQ data
 */
function validateFaq(body) {
  const category = stringField(body.category, 'Category', 30);
  if (!FAQ_CATEGORIES.has(category)) throw fail(400, 'Choose a valid FAQ category.');
  return {
    category,
    question: stringField(body.q, 'Question', 500),
    answer: stringField(body.a, 'Answer', 5000),
    published: body.published === false ? 0 : 1
  };
}

module.exports = {
  fail,
  stringField,
  validEmail,
  publicUser,
  projectStats,
  validateFaq,
  FAQ_CATEGORIES
};
