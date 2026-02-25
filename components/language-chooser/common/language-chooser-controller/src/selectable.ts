import { Field } from "@ethnolib/state-management-core";

export interface Selectable {
  isSelected: Field<boolean>;
}

export function selectItem(index: number, items: Selectable[]) {
  items.forEach((item, i) => {
    item.isSelected.value = i === index;
  });
}
