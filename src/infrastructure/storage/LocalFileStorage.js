const fs = require('fs').promises;
const path = require('path');
const IStorageService = require('../../core/interfaces/IStorageService');
const { StorageError } = require('../../core/errors/CollectionError');

/**
 * Local file system implementation of IStorageService
 * Follows Single Responsibility Principle - only handles local file storage
 */
class LocalFileStorage extends IStorageService {
  constructor(basePath = 'data') {
    super();
    this.basePath = basePath;
  }

  /**
   * Saves data to local file system
   * @param {Object} data - The data to save
   * @param {string} filePath - The file path
   * @param {Object} options - Storage options
   * @returns {Promise<void>}
   */
  async save(data, filePath, options = {}) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      const directory = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Save data as JSON
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, jsonData, 'utf8');

      if (options.verbose) {
        console.log(`Data saved to: ${fullPath}`);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to save data: ${error.message}`,
        {
          path: filePath,
          originalError: error.message
        }
      );
    }
  }

  /**
   * Loads data from local file system
   * @param {string} filePath - The file path
   * @param {Object} options - Load options
   * @returns {Promise<Object>} The loaded data
   */
  async load(filePath, options = {}) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new StorageError(
          `File not found: ${filePath}`,
          {
            path: filePath,
            code: 'FILE_NOT_FOUND'
          }
        );
      }
      
      throw new StorageError(
        `Failed to load data: ${error.message}`,
        {
          path: filePath,
          originalError: error.message
        }
      );
    }
  }

  /**
   * Checks if a file exists
   * @param {string} filePath - The file path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filePath) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file
   * @param {string} filePath - The file path
   * @returns {Promise<void>}
   */
  async delete(filePath) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new StorageError(
          `Failed to delete file: ${error.message}`,
          {
            path: filePath,
            originalError: error.message
          }
        );
      }
    }
  }

  /**
   * Lists files in a directory
   * @param {string} dirPath - The directory path
   * @param {Object} options - List options
   * @returns {Promise<string[]>} List of file names
   */
  async list(dirPath, options = {}) {
    try {
      const fullPath = path.join(this.basePath, dirPath);
      const files = await fs.readdir(fullPath);
      
      if (options.pattern) {
        const regex = new RegExp(options.pattern);
        return files.filter(file => regex.test(file));
      }
      
      return files;
    } catch (error) {
      throw new StorageError(
        `Failed to list files: ${error.message}`,
        {
          path: dirPath,
          originalError: error.message
        }
      );
    }
  }
}

module.exports = LocalFileStorage;