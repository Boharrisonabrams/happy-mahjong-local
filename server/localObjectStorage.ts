import { promises as fs } from "fs";
import path from "path";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// Local file storage to replace Google Cloud Storage
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const PUBLIC_DIR = path.join(UPLOADS_DIR, "public");
const PRIVATE_DIR = path.join(UPLOADS_DIR, "private");

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Local file storage service
export class LocalObjectStorageService {
  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      await fs.mkdir(PUBLIC_DIR, { recursive: true });
      await fs.mkdir(PRIVATE_DIR, { recursive: true });
    } catch (error) {
      console.warn("Could not create upload directories:", error);
    }
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "/uploads/public";
    return Array.from(new Set(pathsStr.split(",").map(p => p.trim()).filter(Boolean)));
  }

  private getObjectPath(objectName: string, isPrivate: boolean = false): string {
    const baseDir = isPrivate ? PRIVATE_DIR : PUBLIC_DIR;
    // Sanitize filename to prevent path traversal
    const sanitized = objectName.replace(/[^a-zA-Z0-9.-_]/g, '_');
    return path.join(baseDir, sanitized);
  }

  async uploadObject(
    objectName: string,
    buffer: Buffer,
    metadata: Record<string, string> = {},
    isPrivate: boolean = false
  ): Promise<void> {
    const filePath = this.getObjectPath(objectName, isPrivate);
    
    try {
      await fs.writeFile(filePath, buffer);
      
      // Store metadata in a separate JSON file
      const metadataPath = filePath + '.metadata.json';
      await fs.writeFile(metadataPath, JSON.stringify({
        ...metadata,
        uploadedAt: new Date().toISOString(),
        originalName: objectName,
        size: buffer.length,
        isPrivate
      }, null, 2));
      
      console.log(`File uploaded: ${objectName} -> ${filePath}`);
    } catch (error) {
      console.error(`Failed to upload ${objectName}:`, error);
      throw new Error(`Upload failed: ${error}`);
    }
  }

  async downloadObject(objectName: string, isPrivate: boolean = false): Promise<Buffer> {
    const filePath = this.getObjectPath(objectName, isPrivate);
    
    try {
      await fs.access(filePath);
      return await fs.readFile(filePath);
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  async downloadObjectToResponse(
    objectName: string,
    res: Response,
    isPrivate: boolean = false
  ): Promise<void> {
    try {
      const buffer = await this.downloadObject(objectName, isPrivate);
      const metadataPath = this.getObjectPath(objectName, isPrivate) + '.metadata.json';
      
      let metadata: any = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch {
        // Metadata file doesn't exist, continue without it
      }

      // Set appropriate headers
      if (metadata.contentType) {
        res.setHeader('Content-Type', metadata.contentType);
      }
      
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      res.send(buffer);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
      } else {
        res.status(500).json({ error: "Download failed" });
      }
    }
  }

  async deleteObject(objectName: string, isPrivate: boolean = false): Promise<void> {
    const filePath = this.getObjectPath(objectName, isPrivate);
    const metadataPath = filePath + '.metadata.json';
    
    try {
      await fs.unlink(filePath);
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist
      }
      console.log(`File deleted: ${objectName}`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new ObjectNotFoundError();
      }
      throw new Error(`Delete failed: ${error}`);
    }
  }

  async listObjects(prefix: string = "", isPrivate: boolean = false): Promise<string[]> {
    const baseDir = isPrivate ? PRIVATE_DIR : PUBLIC_DIR;
    
    try {
      const files = await fs.readdir(baseDir);
      return files
        .filter(file => !file.endsWith('.metadata.json'))
        .filter(file => file.startsWith(prefix))
        .sort();
    } catch (error) {
      console.warn(`Failed to list objects in ${baseDir}:`, error);
      return [];
    }
  }

  async getObjectMetadata(objectName: string, isPrivate: boolean = false): Promise<Record<string, any>> {
    const metadataPath = this.getObjectPath(objectName, isPrivate) + '.metadata.json';
    
    try {
      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  async objectExists(objectName: string, isPrivate: boolean = false): Promise<boolean> {
    const filePath = this.getObjectPath(objectName, isPrivate);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ACL methods (simplified for local development)
  async setObjectAcl(objectName: string, policy: ObjectAclPolicy): Promise<void> {
    // Store ACL in metadata
    const metadataPath = this.getObjectPath(objectName) + '.metadata.json';
    try {
      let metadata: any = {};
      try {
        const content = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(content);
      } catch {
        // File doesn't exist, create new metadata
      }
      
      metadata.acl = policy;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn(`Failed to set ACL for ${objectName}:`, error);
    }
  }

  async getObjectAcl(objectName: string): Promise<ObjectAclPolicy> {
    try {
      const metadata = await this.getObjectMetadata(objectName);
      return metadata.acl || { permissions: [] };
    } catch {
      return { permissions: [] };
    }
  }

  // Generate a unique filename
  generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const uuid = randomUUID();
    return `${name}_${uuid}${ext}`;
  }
}

// Export instance for use in other modules
export const localObjectStorageService = new LocalObjectStorageService();

// Helper functions for compatibility with existing code
export async function canUserAccessObject(
  objectName: string,
  userId: string,
  permission: ObjectPermission
): Promise<boolean> {
  try {
    const policy = await localObjectStorageService.getObjectAcl(objectName);
    return canAccessObject(policy, userId, permission);
  } catch {
    return false;
  }
}