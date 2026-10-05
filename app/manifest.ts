import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'Limnexa field evidence',short_name:'Limnexa',description:'Traceable freshwater observations and accountable follow-up',start_url:'/report',display:'standalone',background_color:'#f4f7f1',theme_color:'#123234',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};}
