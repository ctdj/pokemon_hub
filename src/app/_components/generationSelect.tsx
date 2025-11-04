"use client";

import { GENERATIONS } from "~/data/generations";
import { Select } from "./Select";

export function GenerationSelect({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      id="pokemon-generation"
      label="Filtrar por generación"
      value={value}
      onChange={onChange}
      options={GENERATIONS}
    />
  );
}
