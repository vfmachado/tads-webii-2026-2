import type { ReportFile } from '../../domain/Report.js';

/**
 * HEXAGONAL: porta de saída. A API não lê nem grava o arquivo: quem grava
 * é o worker. A API só gera um link TEMPORÁRIO para o usuário baixar o
 * arquivo direto do storage (no S3: uma *presigned URL*).
 */
export interface ReportFileStorage {
  createDownloadUrl(file: ReportFile, expiresInSeconds: number): Promise<string>;
}
