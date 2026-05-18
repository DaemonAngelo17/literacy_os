import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../../src/utils/crypto';

describe('Crypto Utility', () => {
  it('should successfully encrypt and decrypt a dummy API key', () => {
    const dummyKey = 'AIzaSyA_FAKE_API_KEY_12345';
    const ciphertext = encryptData(dummyKey);
    
    expect(ciphertext).not.toBe(dummyKey);
    expect(ciphertext.length).toBeGreaterThan(0);
    
    const decrypted = decryptData(ciphertext);
    expect(decrypted).toBe(dummyKey);
  });

  it('should return empty string on invalid or empty inputs', () => {
    expect(encryptData(null)).toBe('');
    expect(decryptData(null)).toBe('');
  });
});
