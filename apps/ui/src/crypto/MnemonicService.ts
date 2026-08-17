import { BIP39_WORDLIST } from './Bip39Wordlist';

/**
 * MnemonicService: Generates and validates cryptographic 6-8 word recovery keys
 * connected by dashes, using CSPRNG (crypto.getRandomValues).
 */
export class MnemonicService {
  /**
   * Generates a secure mnemonic recovery key of N words (default: 8 words).
   * Format: word1-word2-word3-word4-word5-word6-word7-word8
   */
  public static generateRecoveryKey(wordCount: number = 8): string {
    if (wordCount < 6 || wordCount > 12) {
      wordCount = 8;
    }

    const randomIndices = new Uint32Array(wordCount);
    crypto.getRandomValues(randomIndices);

    const words: string[] = [];
    const listLength = BIP39_WORDLIST.length; // 2048

    for (let i = 0; i < wordCount; i++) {
      const idx = randomIndices[i] % listLength;
      words.push(BIP39_WORDLIST[idx]);
    }

    return words.join('-');
  }

  /**
   * Normalizes a user-input mnemonic string (trims whitespace, converts to lowercase, handles spaces or dashes).
   */
  public static normalizeMnemonic(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .toLowerCase()
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .join('-');
  }

  /**
   * Validates if a mnemonic key has between 6 and 8 valid BIP-39 words.
   */
  public static validateRecoveryKey(mnemonic: string): boolean {
    const normalized = this.normalizeMnemonic(mnemonic);
    const words = normalized.split('-');

    if (words.length < 6 || words.length > 8) {
      return false;
    }

    const wordSet = new Set(BIP39_WORDLIST);
    return words.every((w) => wordSet.has(w));
  }
}
