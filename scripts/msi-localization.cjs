const fs = require('node:fs');
const strings = require('../installer/msi/locales.json');
const languages = {en:['English',1033,'Segoe UI'],'zh-CN':['简体中文',2052,'Microsoft YaHei'],'zh-TW':['繁體中文（香港）',1028,'Microsoft JhengHei'],de:['Deutsch',1031,'Segoe UI'],fr:['Français',1036,'Segoe UI'],it:['Italiano',1040,'Segoe UI'],es:['Español',3082,'Segoe UI'],'pt-PT':['Português (Portugal)',2070,'Segoe UI'],ja:['日本語',1041,'Meiryo'],ko:['한국어',1042,'Malgun Gothic']};
const xml = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function localizedUi(source) {
  for (const values of Object.values(strings)) if(values.length !== strings.en.length || values.some(v=>!v.trim())) throw Error('Incomplete MSI translations.');
  let ui = source.replace(/(?:Title|Text)="([^"\n]+)"/g,(attribute,value)=>{
    const title=value.startsWith('{\\Title}'), index=strings.en.indexOf(value.replace('{\\Title}',''));
    return index<0?attribute:attribute.slice(0,attribute.indexOf('=')+1)+'"'+(title?'[NA_TITLE]':'')+'[NA_TEXT_'+index+']"';
  });
  ui=ui.replace('<TextStyle Id="Normal" FaceName="Segoe UI" Size="9"/>',Object.entries(languages).map(([locale,entry])=>`<TextStyle Id="NAFont_${locale.replace('-','')}" FaceName="${entry[2]}" Size="9"/><TextStyle Id="NATitle_${locale.replace('-','')}" FaceName="${entry[2]}" Size="12" Bold="yes"/>`).join('\n')+'\n<TextStyle Id="Normal" FaceName="Segoe UI" Size="9"/>');
  const properties=strings.en.map((value,i)=>`<Property Id="NA_TEXT_${i}" Value="${xml(value)}"/>`).join('\n');
  const options=Object.entries(languages).map(([locale,[name]])=>`<ListItem Value="${locale}" Text="${xml(name)}"/>`).join('');
  const dialog=`<Property Id="NA_LANGUAGE" Secure="yes"/><Property Id="NA_TITLE" Value="{\\Title}"/>${properties}<Dialog Id="LanguageDlg" Width="400" Height="200" Title="[NA_TEXT_0]"><Control Id="Title" Type="Text" X="20" Y="25" Width="360" Height="25" Text="Language / 语言 / 日本語 / 한국어"/><Control Id="Language" Type="ComboBox" X="20" Y="70" Width="360" Height="100" Property="NA_LANGUAGE" ComboList="yes" Sorted="no"><ComboBox Property="NA_LANGUAGE">${options}</ComboBox></Control><Control Id="Next" Type="PushButton" X="240" Y="165" Width="65" Height="20" Default="yes" Text="[NA_TEXT_13]"><Publish Event="DoAction" Value="LocalizeUI" Order="1">1</Publish><Publish Event="NewDialog" Value="LicenseDlg" Order="2">NOT Installed</Publish><Publish Event="NewDialog" Value="MaintenanceDlg" Order="3">Installed</Publish></Control><Control Id="Cancel" Type="PushButton" X="315" Y="165" Width="65" Height="20" Cancel="yes" Text="[NA_TEXT_3]"><Publish Event="EndDialog" Value="Exit">1</Publish></Control></Dialog>`;
  ui=ui.replace('<Dialog Id="ErrorDlg"',dialog+'\n<Dialog Id="ErrorDlg"');
  ui=ui.replace('<Show Dialog="LicenseDlg" Before="ProgressDlg">NOT Installed</Show>','<Custom Action="InitializeLanguage" Before="LanguageDlg">1</Custom>\n  <Show Dialog="LanguageDlg" Before="ProgressDlg">1</Show>').replace('  <Show Dialog="MaintenanceDlg" Before="LicenseDlg">Installed</Show>','');
  return ui;
}
function nativeHeader() {
  const literal = value => 'L'+JSON.stringify(value);
  let header='// Generated at build time from installer/msi/locales.json.\nstatic const wchar_t* InstallerLocales[] = {'+Object.keys(languages).map(literal).join(',')+'};\n';
  header+='static UINT Localize(MSIHANDLE h) {\n try {\n auto locale=Get(h,L"NA_LANGUAGE");\n if(locale.empty()){\n switch(GetUserDefaultUILanguage()){\n'+Object.entries(languages).map(([l,[,id]])=>`case ${id}: locale=${literal(l)}; break;`).join('\n')+'\n default: switch(PRIMARYLANGID(GetUserDefaultUILanguage())) { case LANG_GERMAN: locale=L"de"; break; case LANG_FRENCH: locale=L"fr"; break; case LANG_ITALIAN: locale=L"it"; break; case LANG_SPANISH: locale=L"es"; break; case LANG_PORTUGUESE: locale=L"pt-PT"; break; case LANG_JAPANESE: locale=L"ja"; break; case LANG_KOREAN: locale=L"ko"; break; case LANG_CHINESE: locale=(SUBLANGID(GetUserDefaultUILanguage())==2 || SUBLANGID(GetUserDefaultUILanguage())==4)?L"zh-CN":L"zh-TW"; break; default: locale=L"en"; } } }\n';
  Object.entries(languages).forEach(([locale])=>{header+=`if(locale==${literal(locale)}) {\nSet(h,L"NA_LANGUAGE",locale);\nSet(h,L"DefaultUIFont",L"NAFont_${locale.replace('-','')}");\nSet(h,L"NA_TITLE",${literal('{\\NATitle_'+locale.replace('-','')+'}')});\n`+strings[locale].map((text,i)=>`Set(h,L"NA_TEXT_${i}",${literal(text)});`).join('\n')+'\nreturn ERROR_SUCCESS; }\n';});
  return header+'\nreturn ERROR_INSTALL_FAILURE;\n } catch(...) { return ERROR_INSTALL_FAILURE; }\n}\nextern "C" __declspec(dllexport) UINT __stdcall InitializeLanguage(MSIHANDLE h) { return Localize(h); }\nextern "C" __declspec(dllexport) UINT __stdcall LocalizeUI(MSIHANDLE h) { return Localize(h); }\n';
}
module.exports={localizedUi,nativeHeader,languages,strings};
