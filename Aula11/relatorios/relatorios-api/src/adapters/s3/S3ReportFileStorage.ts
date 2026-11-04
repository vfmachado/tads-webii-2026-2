import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ReportFileStorage } from '../../application/ports/ReportFileStorage.js';
import type { ReportFile } from '../../domain/Report.js';

export interface S3Config {
  /** Endereço que o NAVEGADOR do usuário enxerga (ex.: http://localhost:9000). */
  publicEndpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * HEXAGONAL: adaptador secundário. Gera uma *presigned URL*: um link para
 * o objeto no S3 com uma assinatura e uma validade embutidas. Quem tem o
 * link baixa o arquivo direto do storage, sem passar pela API e sem
 * conhecer as credenciais.
 *
 * Gerar a URL é só uma conta criptográfica, local: não há chamada de rede.
 * Por isso o cliente usa o endereço PÚBLICO do storage, que é o que vai
 * aparecer no link (dentro do Docker o worker usa `http://rustfs:9000`,
 * que o navegador não conhece).
 *
 * Em produção, o mesmo código fala com o S3 da AWS: basta tirar o
 * `endpoint` e o `forcePathStyle`.
 */
export class S3ReportFileStorage implements ReportFileStorage {
  private readonly client: S3Client;

  constructor(config: S3Config) {
    this.client = new S3Client({
      endpoint: config.publicEndpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  createDownloadUrl(file: ReportFile, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
      ResponseContentDisposition: `attachment; filename="${file.key.split('/').pop()}"`,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
