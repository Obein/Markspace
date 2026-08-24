/**
 * Third-Party Storage Types and Configuration Interfaces for Markspace.
 */

export type StorageProviderType = 'r2' | 's3' | 'cloud_drive' | 'webdav';

export type S3Preset =
  | 'custom'
  | 'aws'
  | 'r2_custom'
  | 'minio'
  | 'backblaze_b2'
  | 'aliyun_oss'
  | 'tencent_cos';

export type CloudDriveProvider =
  | 'google_drive'
  | 'onedrive'
  | 'dropbox'
  | 'aliyun_drive'
  | 'quark_drive';

export type WebDAVPreset =
  | 'custom'
  | 'nextcloud'
  | 'owncloud'
  | 'jianguoyun'
  | 'synology_nas'
  | 'alist'
  | 'infinicloud';

/**
 * S3-Compatible Object Storage Configuration
 */
export interface S3Config {
  preset: S3Preset;
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix?: string;
  forcePathStyle: boolean;
}

/**
 * Mainstream Commercial Cloud Drive Configuration
 */
export interface CloudDriveConfig {
  provider: CloudDriveProvider;
  authType: 'token' | 'api_key' | 'oauth_code';
  authToken: string;
  appKey?: string;
  appSecret?: string;
  refreshToken?: string;
  targetFolder: string;
  customEndpoint?: string;
}

/**
 * WebDAV Protocol Configuration
 */
export interface WebDAVConfig {
  preset: WebDAVPreset;
  serverUrl: string;
  username: string;
  password: string;
  basePath: string;
  trustSelfSigned?: boolean;
}

/**
 * Persisted Vault Storage Configuration
 */
export interface VaultStorageConfig {
  vaultId: string;
  provider: StorageProviderType;
  s3?: S3Config;
  cloudDrive?: CloudDriveConfig;
  webdav?: WebDAVConfig;
  updatedAt: number;
}

/**
 * Connection Test Result
 */
export interface StorageTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: string;
}
