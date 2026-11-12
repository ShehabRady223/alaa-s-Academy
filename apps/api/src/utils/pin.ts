import { createHmac, randomInt } from 'crypto';
import { env } from '../config/env';

// 32 symbols: no 0, O, 1 or I, so a PIN read aloud or from paper is never ambiguous. 32^8 is about 1.1 trillion combinations.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PIN_RE = /^[2-9A-HJ-NP-Z]{8}$/;
const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');

export const generatePin = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
export const formatPin = (pin: string) => `${pin.slice(0, 4)}-${pin.slice(4)}`;
/** Accepts what a student might type ("abcd-efgh", "ABCD EFGH"). Returns '' when it can't be a valid PIN. */
export const normalizePin = (input: string) => { const s = input.toUpperCase().replace(/[\s-]/g, ''); return PIN_RE.test(s) ? s : ''; };
/**
 * Keyed hash (HMAC). A plain hash of a short PIN could be brute-forced offline from a leaked database in minutes;
 * with a server-side key the stored value is useless without it.
 */
export const hashPin = (input: string) => createHmac('sha256', key).update(`exam-pin:${normalizePin(input)}`).digest('hex');
