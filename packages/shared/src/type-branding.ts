export type TypeBrand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};
