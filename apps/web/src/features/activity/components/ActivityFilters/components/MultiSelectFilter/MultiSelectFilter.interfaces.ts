export interface IFilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface IMultiSelectFilterProps<TValue extends string> {
  label: string;
  options: IFilterOption<TValue>[];
  selected: TValue[];
  onToggle: (value: TValue) => void;
}
