// Picks the Hebrew variant of a core message field (message -> messageHe) when the UI is in Hebrew.
import { getLang } from './index';
export const localized = (o: any, f: string): string => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
