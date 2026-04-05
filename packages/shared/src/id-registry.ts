export interface RegistryEntry<TId extends PropertyKey = string> {
  readonly id: TId;
}

export type RegistryById<TEntries extends readonly RegistryEntry[]> = {
  readonly [Entry in TEntries[number] as Entry["id"]]: Entry;
};
