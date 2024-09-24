import { iso31661 } from "iso-3166";
import { iso15924 } from "iso-15924";
import { IRegion, IScript } from "./findLanguageInterfaces";

// ISO-3166-1 is a region code to region name lookup
export function getAllRegions(): IRegion[] {
  return iso31661.map((region) => {
    return {
      name: region.name,
      code: region.alpha2,
    } as IRegion;
  });
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
