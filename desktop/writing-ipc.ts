import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { WritingJobs } from '../core/writing';
import { AiError } from '../core/ai';
import type { registerAi } from './ai-ipc';
import type { registerLibrary } from './library-ipc';
import { writingText as label } from '../src/app/writing-i18n';
export function registerWriting(storage: ReturnType<typeof registerLibrary>, ai: ReturnType<typeof registerAi>, authorize: (event: IpcMainInvokeEvent) => void) {
 const jobs=new WritingJobs(()=>storage.writingContext().library,ai.store,ai.generate);
 const timer=setInterval(()=>{if(!storage.writingEnabled())jobs.close();else jobs.expire();},1000);timer.unref();
 ipcMain.handle('writing:request',async(event,input:import('../shared/writing').WritingRequest):Promise<import('../shared/writing').WritingResult>=>{
   authorize(event);const owner=String(event.sender.id);
   try{
     if(input?.action==='cancel'){jobs.cancel(input.token,owner);return{ok:true,value:null};}
     if(!storage.writingEnabled()){jobs.close();throw new AiError('AI_DISABLED');}
     if(input?.action==='prepare')return{ok:true,value:await jobs.prepare(input.input,owner)};
     if(input?.action==='load')return{ok:true,value:await jobs.prepare(input.input,owner,true)};
     if(input?.action==='generate'){
       const preview=jobs.preview(input.token,owner);
       if(preview.encrypted&&!await storage.confirmWriting(label(storage.writingContext().locale,'outbound').replace('{provider}',preview.provider).replace('{count}',String(preview.sourceText.length)))){jobs.cancel(input.token,owner);return{ok:false,code:'REQUEST_CANCELLED'};}
       authorize(event);if(!storage.writingEnabled())throw new AiError('AI_DISABLED');jobs.preview(input.token,owner);const result=await jobs.generate(input.token,owner);authorize(event);if(!storage.writingEnabled()){jobs.close();throw new AiError('AI_DISABLED');}return{ok:true,value:result};
     }
     if(input?.action==='apply'||input?.action==='summary')return{ok:true,value:jobs.apply(input.token,owner,input.action==='summary')};
     if(input?.action==='translation')return{ok:true,value:jobs.saveTranslation(input.token,owner)};
     throw new AiError('INVALID_INPUT');
   }catch(e){return{ok:false,code:typeof(e as any)?.code==='string'?(e as any).code:'AI_WRITING_FAILED'};}
 });
 return{clear:()=>jobs.close(),close:()=>{clearInterval(timer);jobs.close();}};
}
