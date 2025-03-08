import { iso31661 } from "iso-3166";
import { iso15924 } from "iso-15924";
import { ILanguage, IRegion, IScript } from "./findLanguageInterfaces";

// ISO-3166-1 is a region code to region name lookup
export function getAllRegions(): IRegion[] {
  return iso31661.map((region) => {
    return {
      name: region.name,
      code: region.alpha2,
    } as IRegion;
  });
}

export function getRegionBySubtag(code: string): IRegion | undefined {
  const regionInfo = iso31661.find(
    (r) => r.alpha2.toLowerCase() === code.toLowerCase()
  );
  if (regionInfo) {
    return {
      name: regionInfo.name,
      code: regionInfo.alpha2,
    } as IRegion;
  }
  return undefined;
}

// ISO-15924 is a script code to script name lookup
export function getAllScripts(): IScript[] {
  return iso15924.map((script) => {
    return {
      name: script.name,
      code: script.code,
    } as IScript;
  });
}

export function getScriptForLanguage(
  scriptCode: string,
  language: ILanguage
): IScript | undefined {
  // If possible, use the script object from language.scripts because this might have the script-specific autonym
  const script = language.scripts.find(
    (s) => s.code.toLowerCase() === scriptCode.toLowerCase()
  );
  if (script) {
    return script;
  }

  const scriptInfo = iso15924.find(
    (s) => s.code.toLowerCase() === scriptCode.toLowerCase()
  );
  if (scriptInfo) {
    return {
      name: scriptInfo.name,
      code: scriptInfo.code,
    } as IScript;
  }
  return undefined;
}
