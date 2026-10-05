// Reject embedded metadata at the server boundary, including clients that
// bypass the browser's canvas re-encoding. No original EXIF/GPS is published.
export function hasEmbeddedMetadata(bytes:Uint8Array,mimeType:string):boolean{
  const text=(at:number,length:number)=>new TextDecoder().decode(bytes.slice(at,at+length));
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(mimeType==='image/webp'){
    for(let at=12;at+8<=bytes.length;){const type=text(at,4),length=view.getUint32(at+4,true);if(type==='EXIF'||type==='XMP ')return true;const next=at+8+length+(length%2);if(next>bytes.length)return true;at=next;}
  }else if(mimeType==='image/png'){
    for(let at=8;at+12<=bytes.length;){const length=view.getUint32(at),type=text(at+4,4);if(['eXIf','iTXt','tEXt','zTXt'].includes(type))return true;const next=at+12+length;if(next>bytes.length)return true;at=next;}
  }else if(mimeType==='image/jpeg'){
    for(let at=2;at+4<=bytes.length;){if(bytes[at]!==255)return true;const marker=bytes[at+1];if(marker===0xda||marker===0xd9)break;if(marker===0xe1||marker===0xed)return true;const length=view.getUint16(at+2);if(length<2||at+2+length>bytes.length)return true;at+=2+length;}
  }
  return false;
}
