import { Field } from '@ethnolib/state-management-core';

export interface Selectable {
  isSelected: Field<boolean>;
}

export function selectItem(index: number, items: Selectable[]) {
  for (let i = 0; i < items.length; i++) {
    items[i].isSelected.value = i === index;
  }
}
