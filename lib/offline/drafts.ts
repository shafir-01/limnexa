import Dexie,{type EntityTable} from 'dexie';
import type {ReportInput} from '@/lib/domain/core';
import type {SiteInput} from '@/lib/domain/core';
export type FieldDraft={key:'active';payload:ReportInput;state:'editing'|'pending';updatedAt:string};
export const fieldDatabase=new Dexie('limnexa-field-v1') as Dexie&{drafts:EntityTable<FieldDraft,'key'>;sites:EntityTable<SiteInput,'id'>};
fieldDatabase.version(1).stores({drafts:'key,state,updatedAt'});
fieldDatabase.version(2).stores({drafts:'key,state,updatedAt',sites:'id'});
