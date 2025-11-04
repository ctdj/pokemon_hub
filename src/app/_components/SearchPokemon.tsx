"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { TypeSelect } from "./typeSelect";
import { GenerationSelect } from "./generationSelect";
import Link from "next/link"; 
import Image from "next/image";


function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function SearchPokemon() {


  // --- filtros Pokemons ---
  const STORAGE_KEY = "pokehub:list_state";
  const [text, setText] = React.useState("");
  const [type, setType] = React.useState("all");
  const [generation, setGeneration] = React.useState("all");
  const [offset, setOffset] = React.useState(0);
  const debounced = useDebounce(text, 300);
  const limit = 50; // Mostrar 50 Pokémon por página

  // Restaurar estado desde sessionStorage al montar
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { text?: string; type?: string; generation?: string; offset?: number };
      if (typeof saved.text === "string") setText(saved.text);
      if (typeof saved.type === "string") setType(saved.type);
      if (typeof saved.generation === "string") setGeneration(saved.generation);
      if (typeof saved.offset === "number" && Number.isFinite(saved.offset) && saved.offset >= 0) setOffset(saved.offset);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  

  // Resetear cuando cambian los filtros
  React.useEffect(() => {
    setOffset(0);
  }, [debounced, type, generation]);

  // Guardar estado en sessionStorage cuando es distinto a all
  React.useEffect(() => {
    console.log("text", type);
    if( type !== "all" || generation !== "all") {
      console.log("Saving state to sessionStorage", text, type, generation, offset);
        const payload = JSON.stringify({ text, type, generation, offset });
        sessionStorage.setItem(STORAGE_KEY, payload);
    }
  }, [text, type, generation, offset]);

  // --- búsquedas Pokemons ---
  const listAll = api.pokemon.listAll.useQuery(
    { limit, offset },
    { staleTime: 1000 * 60 * 5 }
  );
  const search = api.pokemon.search.useQuery(
    { query: debounced, type, generation, limit, offset: 0 },
    { staleTime: 1000 * 60 * 5 }
  );

  const isSearching =
    debounced.trim().length > 0 || type !== "all" || generation !== "all";

  // --- estados/datos Pokemons ---
  const isLoading = isSearching ? search.isLoading : listAll.isLoading;
  const isError   = isSearching ? search.isError   : listAll.isError;
  const errorMsg  = (isSearching ? search.error : listAll.error)?.message;

  //formato de los datos Pokemons
  // { id: number; name: string; sprite?: string|null; types?: string[] }
  const items =
    (isSearching ? search.data : listAll.data) ?? [];

  return (
    <section className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <label htmlFor="search" className="sr-only">Buscar Pokémon</label>
          <input
            id="search"
            type="search"
            placeholder="Nombre o ID (p.ej. pikachu o 25)…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setType("all");
              setGeneration("all");
              //funcion para guardar el estado en sessionStorage
            }}
            className={`
              h-12 w-full rounded-xl
              border border-gray-200 bg-background
              pl-3 ${text.trim().length > 0 ? "pr-10" : "pr-3"}
              text-sm md:text-base
              placeholder:text-muted-foreground
              shadow-sm
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary
            `}
          />
          {text.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              aria-label="Limpiar búsqueda"
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

        <TypeSelect value={type} onChange={(v) => {setType(v); setText("")}} />
        <GenerationSelect value={generation} onChange={(v) => {setGeneration(v); setText("")}} />
      </div>

      {/* Estados */}
      {isLoading && (
        //crear un loading spinner
        <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Cargando resultados…</p>
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      {/* Filtros activos */}
      {(type !== "all" || generation !== "all" || debounced.trim().length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Filtros activos:</span>
          
          {debounced.trim().length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium text-primary">Búsqueda: &quot;{debounced}&quot;</span>
              <button
                type="button"
                onClick={() => {setText(""); sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text: "", type: type, generation: generation, offset: offset }));}}
                className="h-4 w-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-primary"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {type !== "all" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-secondary">
              <span className="text-sm font-medium capitalize text-secondary-foreground">Tipo: {type}</span>
              <button
                type="button"
                onClick={() => {setType("all"); sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text: text, type: "all", generation: generation, offset: offset }));}}
                className="h-4 w-4 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                aria-label="Limpiar filtro de tipo"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-secondary-foreground"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {generation !== "all" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-secondary">
              <span className="text-sm font-medium text-secondary-foreground">Generación: {generation.replace("gen-", "GEN ").toUpperCase()}</span>
              <button
                type="button"
                onClick={() => {setGeneration("all"); sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text: text, type: type, generation: "all", offset: offset }));}}
                className="h-4 w-4 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                aria-label="Limpiar filtro de generación"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-secondary-foreground"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}


      {/* Resultados Pokemons */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p: { id: number; name: string; sprite: string | null; types: string[]; generation?: string }) => (
          <Link key={p.id} href={`/profile/${p.id}`}>
            <article className="rounded-xl border border-gray-200 bg-card p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
              <div className="flex flex-col items-center text-center gap-3">
                {/* Sprite */}
                {p.sprite ? (
                  <Image
                    src={p.sprite}
                    alt={p.name}
                    className="h-32 w-32 object-contain"
                    width={128}
                    height={128}
                    loading="lazy"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">No image</span>
                  </div>
                )}
                
                {/* Información */}
                <div className="w-full space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">#{String(p.id).padStart(4, "0")}</p>
                    <h3 className="text-lg font-bold capitalize">{p.name}</h3>
                  </div>
                  
                  {/* Generación */}
                  {p.generation && (
                    <div className="inline-block bg-muted/50 rounded-md px-2 py-1">
                      <p className="text-xs font-semibold text-muted-foreground">{p.generation}</p>
                    </div>
                  )}
                  
                  {/* Tipos */}
                  {p.types && p.types.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {p.types.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-1 rounded-full font-medium capitalize text-white"
                          style={{
                            backgroundColor: ({
                              fire: "#EF4444",
                              water: "#3B82F6",
                              grass: "#22C55E",
                              electric: "#F59E0B",
                              fighting: "#DC2626",
                              psychic: "#A855F7",
                              rock: "#9CA3AF",
                              ground: "#CA8A04",
                              ghost: "#6B7280",
                              ice: "#60A5FA",
                              bug: "#84CC16",
                              dragon: "#7C3AED",
                              dark: "#111827",
                              steel: "#6B7280",
                              fairy: "#EC4899",
                              flying: "#38BDF8",
                              poison: "#A78BFA",
                              normal: "#9CA3AF",
                            } as Record<string, string>)[t] ?? "#0EA5E9",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Paginación */}
      {!isSearching && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || isLoading}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {Math.floor(offset / limit) + 1}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={isLoading || (items.length < limit)}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Resultados vacíos */}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay resultados. Ajusta el texto, tipo o generación.
        </p>
      )}
    </section>
  );
}
