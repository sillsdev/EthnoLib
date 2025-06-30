import Fuse from "fuse.js";
import { IScript } from "./findLanguageInterfaces";

export function fuzzilySearchForScripts(options:IScript[], searchQuery:string) {
    const fuseSettings = {
    keys: ["code", "name"]
  }
  const fuse = new Fuse(options, fuseSettings)
  const results =  fuse.search(searchQuery)
  //fuse.search returns an array of FuseResult objects, but we need to return an object with properties for label and id 
  return results.map((fuseResult) => fuseResult.item )
}