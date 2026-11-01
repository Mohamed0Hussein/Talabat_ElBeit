// Node stand-in for expo-crypto in emulator tests. Same output: lowercase hex.
import { createHash } from 'crypto';

export enum CryptoDigestAlgorithm {
  SHA256 = 'SHA-256',
}

export async function digestStringAsync(_algorithm: CryptoDigestAlgorithm, data: string): Promise<string> {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
