import { FRAME_DEFINITIONS } from './roles.ts';

export async function resolveProfileFrame(base44: any, key: string): Promise<any> {
  if (!key) return FRAME_DEFINITIONS[''];
  if (FRAME_DEFINITIONS[key]) return FRAME_DEFINITIONS[key];
  if (!key.startsWith('special:')) return null;
  const id = key.slice(8);
  if (!id) return null;
  const frame = await base44.asServiceRole.entities.SpecialFrame.get(id).catch(() => null);
  if (!frame || !frame.active) return null;
  return { label: frame.name, image_url: frame.image_url, opening: frame.opening };
}