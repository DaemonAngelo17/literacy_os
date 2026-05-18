import CryptoJS from 'crypto-js';

const SECRET_KEY = 'admin'; // Hardcoded as per prompt (admin passcode)

export const encryptData = (data) => {
  if (!data) return '';
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (ciphertext) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (e) {
    console.error("Decryption failed", e);
    return '';
  }
};
