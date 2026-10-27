// Assistant bubble on/off: read from settings (default on), toggled by the avatar, remembered in settings.
import { assistantOn } from '../wizard/hints.mjs';

export function useAssistant(settings: any, save: (s: any) => Promise<any>) {
  const on = assistantOn(settings);
  const toggle = () => { if (settings) save({ ...settings, assistant: !on }); };
  return { on, toggle };
}
