const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class SecretManager {
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    this.cache = new Map();
  }

  async getSecret(secretName) {
    // Check cache first
    if (this.cache.has(secretName)) {
      return this.cache.get(secretName);
    }

    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.client.accessSecretVersion({ name });
      const payload = version.payload.data.toString('utf8');
      
      // Cache for 1 hour
      this.cache.set(secretName, payload);
      setTimeout(() => this.cache.delete(secretName), 3600000);
      
      return payload;
    } catch (error) {
      throw new Error(`Failed to access secret ${secretName}: ${error.message}`);
    }
  }
}

module.exports = new SecretManager();