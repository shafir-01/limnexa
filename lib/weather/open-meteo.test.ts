import {describe,it,expect} from 'vitest';
import {parseRain} from './open-meteo';
describe('modelled rainfall context',()=>{
  const data={hourly_units:{rain:'mm'},hourly:{time:['2026-10-05T10:00','2026-10-05T11:00','2026-10-05T12:00'],rain:[2,3,100]}};
  it('sums completed intervals and excludes the future',()=>{const w=parseRain(data,'real-site',120,new Date('2026-10-05T11:30:00Z'),'https://api.open-meteo.com/v1/forecast?test');expect(w.precipitationMm).toBe(5);expect(w.intervalStart).toBe('2026-10-05T09:00:00.000Z');expect(w.synthetic).toBe(false)});
  it('refuses missing data, mismatched units and fractional windows',()=>{expect(()=>parseRain({...data,hourly:{...data.hourly,rain:[2,null,100]}},'site',120,new Date('2026-10-05T11:30:00Z'),'https://example.com')).toThrow();expect(()=>parseRain(data,'site',90,new Date(),'https://example.com')).toThrow();expect(()=>parseRain({...data,hourly_units:{rain:'inch'}},'site',120,new Date(),'https://example.com')).toThrow()});
});
