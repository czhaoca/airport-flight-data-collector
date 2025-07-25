const { Octokit } = require('@octokit/rest');
const IStorageService = require('../../core/interfaces/IStorageService');
const { StorageError } = require('../../core/errors/CollectionError');

/**
 * GitHub repository implementation of IStorageService
 * Follows Liskov Substitution Principle - can replace any IStorageService
 */
class GitHubStorage extends IStorageService {
  constructor(token, repository, basePath = 'data') {
    super();
    this.octokit = new Octokit({ auth: token });
    this.repository = repository;
    this.basePath = basePath;
    
    const [owner, repo] = repository.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Saves data to GitHub repository
   * @param {Object} data - The data to save
   * @param {string} filePath - The file path
   * @param {Object} options - Storage options
   * @returns {Promise<void>}
   */
  async save(data, filePath, options = {}) {
    try {
      const fullPath = `${this.basePath}/${filePath}`;
      const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      
      // Check if file exists to get SHA
      let sha;
      try {
        const existingFile = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: fullPath
        });
        sha = existingFile.data.sha;
      } catch (error) {
        // File doesn't exist, which is fine
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create or update file
      const params = {
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
        message: options.message || `Update ${filePath}`,
        content: content,
        committer: {
          name: options.committerName || 'Airport Data Collector',
          email: options.committerEmail || 'bot@example.com'
        }
      };

      if (sha) {
        params.sha = sha;
      }

      await this.octokit.repos.createOrUpdateFileContents(params);

      if (options.verbose) {
        console.log(`Data saved to GitHub: ${fullPath}`);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to save to GitHub: ${error.message}`,
        {
          path: filePath,
          status: error.status,
          originalError: error.message
        }
      );
    }
  }

  /**
   * Loads data from GitHub repository
   * @param {string} filePath - The file path
   * @param {Object} options - Load options
   * @returns {Promise<Object>} The loaded data
   */
  async load(filePath, options = {}) {
    try {
      const fullPath = `${this.basePath}/${filePath}`;
      
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath
      });

      if (response.data.type !== 'file') {
        throw new StorageError('Path is not a file', { path: filePath });
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.status === 404) {
        throw new StorageError(
          `File not found: ${filePath}`,
          {
            path: filePath,
            code: 'FILE_NOT_FOUND'
          }
        );
      }
      
      throw new StorageError(
        `Failed to load from GitHub: ${error.message}`,
        {
          path: filePath,
          status: error.status,
          originalError: error.message
        }
      );
    }
  }

  /**
   * Checks if a file exists in GitHub
   * @param {string} filePath - The file path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filePath) {
    try {
      const fullPath = `${this.basePath}/${filePath}`;
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Deletes a file from GitHub
   * @param {string} filePath - The file path
   * @returns {Promise<void>}
   */
  async delete(filePath) {
    try {
      const fullPath = `${this.basePath}/${filePath}`;
      
      // Get file SHA
      const file = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath
      });

      // Delete file
      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
        message: `Delete ${filePath}`,
        sha: file.data.sha
      });
    } catch (error) {
      if (error.status !== 404) {
        throw new StorageError(
          `Failed to delete from GitHub: ${error.message}`,
          {
            path: filePath,
            status: error.status,
            originalError: error.message
          }
        );
      }
    }
  }
}

module.exports = GitHubStorage;