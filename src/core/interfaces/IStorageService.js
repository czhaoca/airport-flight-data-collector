/**
 * Interface for storage services
 * Follows Single Responsibility Principle - one reason to change
 */
class IStorageService {
  /**
   * Saves data to storage
   * @param {Object} data - The data to save
   * @param {string} path - The storage path
   * @param {Object} options - Storage options
   * @returns {Promise<void>}
   */
  async save(data, path, options = {}) {
    throw new Error('Method save() must be implemented');
  }

  /**
   * Loads data from storage
   * @param {string} path - The storage path
   * @param {Object} options - Load options
   * @returns {Promise<Object>} The loaded data
   */
  async load(path, options = {}) {
    throw new Error('Method load() must be implemented');
  }

  /**
   * Checks if a path exists
   * @param {string} path - The storage path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(path) {
    throw new Error('Method exists() must be implemented');
  }

  /**
   * Deletes data from storage
   * @param {string} path - The storage path
   * @returns {Promise<void>}
   */
  async delete(path) {
    throw new Error('Method delete() must be implemented');
  }
}

module.exports = IStorageService;