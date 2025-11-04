"use client";

import * as React from "react";

export type Option = { value: string; label: string };

type Props = {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: readonly Option[];
};

export function Select({ id, label, value, onChange, options }: Props) {
    const showClear = value !== "all";

    return (
        <div className="relative">
            <label htmlFor={id} className="sr-only">{label}</label>

            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`
          h-12 w-full rounded-xl
          border border-gray-200 bg-background
          pl-3 ${showClear ? "pr-20" : "pr-10"} text-sm placeholder:text-muted-foreground
          shadow-sm focus:outline-none focus:border-primary
          focus:ring-2 focus:ring-primary
        `}
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>

            {/* Botón X para limpiar */}
            {showClear && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange("all");
                    }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    aria-label="Limpiar filtro"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-muted-foreground"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}

        </div>
    );
}
