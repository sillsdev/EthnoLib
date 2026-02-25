import { IScript } from "@ethnolib/find-language";
import { Field } from "@ethnolib/state-management-core";

interface ViewModelArgs {
  onSelect?: (isSelected: boolean) => void;
}

export type ScriptCardViewModel = ReturnType<typeof useScriptCardViewModel>;

export function useScriptCardViewModel(
  script: IScript,
  { onSelect }: ViewModelArgs = {}
) {
  const isSelected = new Field(false, (isSelected) => {
    if (onSelect) {
      onSelect(isSelected);
    }
  });

  return { script, isSelected };
}
