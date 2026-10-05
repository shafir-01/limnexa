import Dexie,{type EntityTable} from 'dexie';
import type {ReportInput} from '@/lib/domain/core';
export type FieldDraft={key:'active';payload:ReportInput;state:'editing'|'pending';updatedAt:string};
export const fieldDatabase=new Dexie('limnexa-field-v1') as Dexie&{drafts:EntityTable<FieldDraft,'key'>};
fieldDatabase.version(1).stores({drafts:'key,state,updatedAt'});
