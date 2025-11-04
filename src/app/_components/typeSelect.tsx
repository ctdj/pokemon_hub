"use client";

import { POKEMON_TYPES } from "~/data/pokemon-types";
import { Select } from "./Select";

export function TypeSelect({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      id="pokemon-type"
      label="Filtrar por tipo"
      value={value}
      onChange={onChange}
      options={POKEMON_TYPES}
    />
  );
}
