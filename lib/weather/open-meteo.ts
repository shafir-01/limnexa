import {z} from 'zod';
import {contentHash,type Weather} from '../domain/core';
const responseSchema=z.object({hourly_units:z.object({rain:z.literal('mm')}),hourly:z.object({time:z.array(z.string()),rain:z.array(z.number().nonnegative().nullable())})});
export function parseRain(data:unknown,siteId:string,periodMinutes:number,now:Date,sourceUrl:string):Weather{
  if(periodMinutes<60||periodMinutes%60!==0||periodMinutes>10080)throw new Error('WEATHER_WINDOW_REQUIRES_WHOLE_HOURS');
  const parsed=responseSchema.parse(data),end=Math.floor(now.getTime()/3600000)*3600000,start=end-periodMinutes*60000;
  const hours=parsed.hourly.time.map((time,i)=>({end:Date.parse(`${time}Z`),rain:parsed.hourly.rain[i]})).filter(h=>h.end>start&&h.end<=end);
  if(hours.length!==periodMinutes/60||new Set(hours.map(h=>h.end)).size!==hours.length||hours.some(h=>h.rain===null||h.rain===undefined||!Number.isFinite(h.end)))throw new Error('WEATHER_INCOMPLETE_INTERVAL');
  const body={siteId,observedAt:new Date(end).toISOString(),precipitationMm:hours.reduce((sum,h)=>sum+h.rain!,0),synthetic:false,source:'Open-Meteo modelled rainfall; not a rain-gauge measurement',methodVersion:'open-meteo-hourly-rain-v1',periodMinutes,intervalStart:new Date(start).toISOString(),sourceUrl,unit:'mm' as const,contextKind:'modelled-rainfall' as const};
  return {id:contentHash(body),...body,fetchedAt:now.toISOString()};
}
export async function fetchRain(site:{id:string;latitude:number;longitude:number},periodMinutes:number,now=new Date()):Promise<Weather>{
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:String(site.latitude),longitude:String(site.longitude),hourly:'rain',past_days:String(Math.min(7,Math.ceil(periodMinutes/1440)+1)),forecast_days:'1',timezone:'GMT'}).toString();
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!response.ok)throw new Error('WEATHER_UNAVAILABLE');
  return parseRain(await response.json(),site.id,periodMinutes,now,url.toString());
}
