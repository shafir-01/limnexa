import {expect,it} from 'vitest';
import {hasEmbeddedMetadata} from './metadata';
it('rejects GPS-capable EXIF and text metadata across accepted formats',()=>{
  expect(hasEmbeddedMetadata(Uint8Array.from([255,216,255,225,0,2]),'image/jpeg')).toBe(true);
  const webp=new Uint8Array(20);webp.set(new TextEncoder().encode('EXIF'),12);expect(hasEmbeddedMetadata(webp,'image/webp')).toBe(true);
  const png=new Uint8Array(20);png.set(new TextEncoder().encode('eXIf'),12);expect(hasEmbeddedMetadata(png,'image/png')).toBe(true);
  expect(hasEmbeddedMetadata(Uint8Array.from([255,216,255,218,0,2]),'image/jpeg')).toBe(false);
});
