import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ReportStorage, StoredFile } from '../../application/ports/ReportStorage.js';

export interface S3Config {
  /** Endereço do storage visto pelo worker (no Docker: http://rustfs:9000). */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * HEXAGONAL: adaptador secundário. Grava o relatório num bucket S3.
 *
 * No Docker, o "S3" é o RustFS, um servidor compatível com a API do S3.
 * O SDK é o oficial da AWS (`@aws-sdk/client-s3`): em produção, o mesmo
 * código fala com o S3 de verdade; basta tirar `endpoint` e
 * `forcePathStyle` e trocar as credenciais.
 */
export class S3ReportStorage implements ReportStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true, // http://host/bucket/chave em vez de http://bucket.host/chave
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  /** Cria o bucket se ainda não existir (chamado uma vez, na inicialização). */
  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
        console.log(`[s3] bucket "${this.config.bucket}" criado`);
      } catch (err) {
        // Várias réplicas sobem juntas: outra pode ter criado no meio do caminho.
        const name = (err as Error).name;
        if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') throw err;
      }
    }
  }

  async upload(key: string, content: string, contentType: string): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: content, ContentType: contentType }),
    );
    return { bucket: this.config.bucket, key, sizeBytes: Buffer.byteLength(content) };
  }
}
