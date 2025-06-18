import Fuse from "fuse.js";

export function fuzzilySearchForScripts(options:{id:string, label:string}[], state: {inputValue:string}) {
  const fuseSettings = {
    keys: ["id", "label"]
  }
  const fuse = new Fuse(options, fuseSettings)
  const results =  fuse.search(state.inputValue)
  //fuse.search returns an array of FuseResult objects, but we need to return an object with properties for label and id 
  return results.map((fuseResult) => fuseResult.item )
}