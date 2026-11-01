import * as Crypto from 'expo-crypto';

/** Lowercase hex SHA-256. */
export function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}
