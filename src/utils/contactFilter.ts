// Utility to detect and filter contact information in messages

// Regex patterns for contact detection
const PHONE_PATTERNS = [
  /\b(\+?[0-9]{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g, // General phone numbers
  /\b\d{10,11}\b/g, // 10-11 digit numbers
  /\b3[0-9]{8,9}\b/g, // Italian mobile numbers starting with 3
  /\b0[0-9]{8,10}\b/g, // Italian landline numbers starting with 0
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;

const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /\b[a-z0-9-]+\.(com|it|org|net|eu|io|co|info|biz)\b/gi,
];

const WHATSAPP_PATTERNS = [
  /whatsapp/gi,
  /wa\.me/gi,
  /whats\s*app/gi,
];

const ADDRESS_PATTERNS = [
  /\bvia\s+[a-z\s]+,?\s*\d+/gi,
  /\bpiazza\s+[a-z\s]+,?\s*\d*/gi,
  /\bviale\s+[a-z\s]+,?\s*\d+/gi,
  /\bcorso\s+[a-z\s]+,?\s*\d+/gi,
  /\bvicolo\s+[a-z\s]+,?\s*\d+/gi,
  /\blargo\s+[a-z\s]+,?\s*\d*/gi,
  /\bstrada\s+[a-z\s]+,?\s*\d+/gi,
  /\b\d{5}\b/g, // CAP (Italian postal codes)
];

const SOCIAL_PATTERNS = [
  /instagram\.com/gi,
  /facebook\.com/gi,
  /fb\.com/gi,
  /telegram\.me/gi,
  /t\.me/gi,
  /@[a-z0-9_]+/gi, // Social handles
];

export interface ContactDetectionResult {
  containsContact: boolean;
  detectedTypes: string[];
  originalMessage: string;
}

export function detectContactInfo(message: string): ContactDetectionResult {
  const detectedTypes: string[] = [];
  
  // Check for phone numbers
  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(message)) {
      detectedTypes.push('telefono');
      break;
    }
    pattern.lastIndex = 0; // Reset regex
  }
  
  // Check for email
  if (EMAIL_PATTERN.test(message)) {
    detectedTypes.push('email');
  }
  EMAIL_PATTERN.lastIndex = 0;
  
  // Check for URLs
  for (const pattern of URL_PATTERNS) {
    if (pattern.test(message)) {
      detectedTypes.push('link');
      break;
    }
    pattern.lastIndex = 0;
  }
  
  // Check for WhatsApp
  for (const pattern of WHATSAPP_PATTERNS) {
    if (pattern.test(message)) {
      detectedTypes.push('whatsapp');
      break;
    }
    pattern.lastIndex = 0;
  }
  
  // Check for addresses
  for (const pattern of ADDRESS_PATTERNS) {
    if (pattern.test(message)) {
      detectedTypes.push('indirizzo');
      break;
    }
    pattern.lastIndex = 0;
  }
  
  // Check for social media
  for (const pattern of SOCIAL_PATTERNS) {
    if (pattern.test(message)) {
      detectedTypes.push('social');
      break;
    }
    pattern.lastIndex = 0;
  }
  
  return {
    containsContact: detectedTypes.length > 0,
    detectedTypes: [...new Set(detectedTypes)], // Remove duplicates
    originalMessage: message,
  };
}

export function getContactWarningMessage(): string {
  return "Per tutelare il lavoro e garantire il pagamento, i contatti diretti sono disponibili solo dopo la conferma dell'intervento.";
}

// Quick replies for pre-confirmation chat - TECHNICIAN
export const TECHNICIAN_QUICK_REPLIES = [
  "Posso venire la mattina",
  "Posso venire il pomeriggio",
  "Ho disponibilità oggi",
  "Puoi mandare una foto più chiara?",
  "Serve accesso al contatore?",
];

// Quick replies for pre-confirmation chat - CLIENT
export const CLIENT_QUICK_REPLIES = [
  "Preferisco la mattina",
  "Preferisco il pomeriggio",
  "Sono flessibile con gli orari",
  "Posso mandare altre foto",
];

// System messages for chat
export const TECHNICIAN_SYSTEM_MESSAGE = "Il cliente ha aperto una chat. L'appuntamento non è ancora confermato.";
export const CLIENT_SYSTEM_MESSAGE = "Il tecnico può rispondere per chiarimenti prima di confermare l'orario.";

// Banner messages
export const TECHNICIAN_BANNER_MESSAGE = "Contatti e indirizzo del cliente saranno visibili solo dopo la conferma dell'orario.";
export const CLIENT_BANNER_MESSAGE = "Contatti del tecnico e indirizzo saranno visibili solo dopo la conferma dell'orario.";
