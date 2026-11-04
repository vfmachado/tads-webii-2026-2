export interface StoredFile {
  bucket: string;
  key: string;
  sizeBytes: number;
}

/**
 * HEXAGONAL: porta de saída. Onde o arquivo pronto fica guardado (no
 * projeto: um S3, servido pelo RustFS no Docker).
 *
 * `upload` com a MESMA chave sobrescreve o arquivo. Isso torna o
 * reprocessamento seguro: se a mesma mensagem chegar duas vezes, o
 * segundo upload só regrava o mesmo relatório (idempotência).
 */
export interface ReportStorage {
  upload(key: string, content: string, contentType: string): Promise<StoredFile>;
}
