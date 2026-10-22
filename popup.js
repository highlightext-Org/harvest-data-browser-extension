const $=id=>document.getElementById(id);
const status=s=>$('status').textContent=s;
const isGoogleResults=url=>/^https:\/\/www\.google\.(com|co\.uk|ca|com\.au)\/search(?:\?|$)/.test(url||'');
const splitQueries=s=>[...new Set(s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const download=(filename,content,type)=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
async function refresh(){const s=await chrome.storage.local.get(['urls','queries','autoEnabled','autoStatus']);$('count').textContent=(s.urls||[]).length;if(s.queries)$('queries').value=s.queries.join('\n');$('auto').checked=!!s.autoEnabled;if(s.autoStatus)status(s.autoStatus);}
async function refreshKeyStatus(){const {openaiApiKey,autoPrivacyEnabled,privacyStatus: savedPrivacyStatus}=await chrome.storage.local.get(['openaiApiKey','autoPrivacyEnabled','privacyStatus']);$('keyStatus').textContent=openaiApiKey?'API key saved locally.':'No API key saved.';$('autoPrivacy').checked=!!autoPrivacyEnabled;if(savedPrivacyStatus)privacyStatus(savedPrivacyStatus);}
function privacyStatus(message){$('privacyStatus').textContent=message;}
const isFirefox=typeof browser!=='undefined'&&typeof browser.runtime?.getBrowserInfo==='function';
function requestWebsiteContentPermission(){
  // Firefox requires this call to start synchronously inside the user event handler.
  if(isFirefox){
    try{return chrome.permissions.request({data_collection:['websiteContent']});}
    catch(error){return Promise.reject(error);}
  }
  return Promise.resolve(true);
}
async function hasWebsiteContentPermission(){
  if(!isFirefox)return true;
  const permissions=await chrome.permissions.getAll();
  return !!permissions.data_collection?.includes('websiteContent');
}
async function activeWebTab(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id||!/^https?:\/\//.test(tab.url||''))throw new Error('Open a regular website first.');return tab;}
$('saveKey').onclick=async()=>{const key=$('apiKey').value.trim();if(!key)return privacyStatus('Paste an API key first.');await chrome.storage.local.set({openaiApiKey:key});$('apiKey').value='';await refreshKeyStatus();privacyStatus('API key saved in this browser profile.');};
$('removeKey').onclick=async()=>{await chrome.storage.local.remove('openaiApiKey');$('apiKey').value='';await refreshKeyStatus();privacyStatus('API key removed.');};
$('grantPrivacyPermission').hidden=!isFirefox;
$('grantPrivacyPermission').onclick=async()=>{const consent=requestWebsiteContentPermission();try{privacyStatus(await consent?'Firefox permission granted. You can now run the review.':'Firefox permission was not granted.');}catch(error){privacyStatus(error.message)}};
$('autoPrivacy').onchange=async()=>{const enabled=$('autoPrivacy').checked;try{if(enabled){if(!await hasWebsiteContentPermission())throw new Error('Click Grant Firefox permission first.');const {openaiApiKey}=await chrome.storage.local.get('openaiApiKey');if(!openaiApiKey)throw new Error('Save an API key before enabling automatic review.');}await chrome.storage.local.set({autoPrivacyEnabled:enabled});privacyStatus(enabled?'Privacy guard is on. New listeners are checked every 10 seconds.':'Privacy guard is off.');}catch(error){$('autoPrivacy').checked=false;privacyStatus(error.message);}};
$('analyzePrivacy').onclick=async()=>{const button=$('analyzePrivacy');button.disabled=true;privacyStatus('Reviewing page listeners…');$('privacyFindings').replaceChildren();try{if(!await hasWebsiteContentPermission())throw new Error('Click Grant Firefox permission first.');const tab=await activeWebTab();const result=await chrome.runtime.sendMessage({type:'ANALYZE_PRIVACY',tabId:tab.id});if(result.error)throw new Error(result.error);privacyStatus(`Reviewed ${result.scanned} listeners; blocked ${result.blocked}.`);for(const finding of result.findings){const li=document.createElement('li');li.textContent=`Listener ${finding.id}: ${finding.reason}`;$('privacyFindings').append(li);}}catch(error){privacyStatus(error.message)}finally{button.disabled=false;}};
$('restorePrivacy').onclick=async()=>{try{await chrome.storage.local.set({autoPrivacyEnabled:false});$('autoPrivacy').checked=false;const tab=await activeWebTab();const result=await chrome.runtime.sendMessage({type:'RESTORE_PRIVACY',tabId:tab.id});if(result.error)throw new Error(result.error);privacyStatus('Tracked listeners restored on this page. Privacy guard is off.');$('privacyFindings').replaceChildren();}catch(error){privacyStatus(error.message)}};
async function saveQueries(reset=false){const queries=splitQueries($('queries').value);await chrome.storage.local.set({queries,...(reset?{queryIndex:-1}:{})});return queries;}
async function nextQuery(){await saveQueries();const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const r=await chrome.runtime.sendMessage({type:'NEXT_QUERY',tabId:tab?.id,auto:$('auto').checked});status(r.error|| (r.done?'All queries searched.':'Entering: '+r.query+( $('auto').checked?' (auto-collecting)':'')));}
$('auto').onchange=()=>chrome.storage.local.set({autoEnabled:$('auto').checked});
$('start').onclick=async()=>{await saveQueries(true);await nextQuery()};
$('next').onclick=nextQuery;
$('scan').onclick=async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!isGoogleResults(tab?.url))return status('Open a Google search results page first.');try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});status('Collected visible organic result links.');setTimeout(refresh,450)}catch(e){status(e.message)}};
$('nextPage').onclick=async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!isGoogleResults(tab?.url))return status('Open a Google results page first.');try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});const r=await chrome.tabs.sendMessage(tab.id,{type:'NEXT_PAGE'});status(r?.error||'Clicking Google’s Next link.')}catch(e){status(e.message)}};
$('autoPage').onclick=async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!isGoogleResults(tab?.url))return status('Open a supported Google results page first.');try{await saveQueries();await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});const r=await chrome.runtime.sendMessage({type:'SET_AUTO',tabId:tab.id,active:true});status(r.error||'Auto-collecting this query, then the remaining queries.')}catch(e){status(e.message)}};
$('stopAuto').onclick=async()=>{await chrome.runtime.sendMessage({type:'SET_AUTO',active:false});status('Auto-collect stopped.');refresh()};
$('export').onclick=async()=>{const {urls=[]}=await chrome.storage.local.get('urls');download('highlightext-research-urls.csv','url,query,firstSeen\n'+urls.map(x=>[x.url,x.query,x.firstSeen].map(quote).join(',')).join('\n'),'text/csv')};
$('exportJson').onclick=async()=>{const {urls=[]}=await chrome.storage.local.get('urls');download('highlightext-research-urls.json',JSON.stringify(urls,null,2),'application/json')};
function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}const head=rows[0]?.map(x=>x.toLowerCase().trim())||[];const urlCol=head.indexOf('url');const queryCol=head.indexOf('query');const dateCol=head.indexOf('firstseen');return rows.slice(urlCol>=0?1:0).map(r=>({url:r[urlCol>=0?urlCol:0],query:queryCol>=0?r[queryCol]:'',firstSeen:dateCol>=0?r[dateCol]:undefined}))}
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();let items;if(file.name.toLowerCase().endsWith('.json')){const obj=JSON.parse(text);items=(Array.isArray(obj)?obj:obj.urls||[]).map(x=>typeof x==='string'?{url:x}:x)}else if(file.name.toLowerCase().endsWith('.csv'))items=parseCsv(text);else items=text.split(/\r?\n/).map(url=>({url:url.trim()}));const r=await chrome.runtime.sendMessage({type:'COLLECT',urls:items});status(r.error||`Import complete. ${r.count} unique URLs total.`);refresh()}catch(err){status('Import error: '+err.message)}e.target.value=''};
$('clear').onclick=async()=>{if(confirm('Delete all saved URLs?')){await chrome.storage.local.set({urls:[]});refresh();status('Saved URLs cleared.')}};
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.urls)$('count').textContent=(changes.urls.newValue||[]).length;if(changes.autoStatus?.newValue)status(changes.autoStatus.newValue);});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.privacyStatus?.newValue)privacyStatus(changes.privacyStatus.newValue);});
refresh();
refreshKeyStatus();
