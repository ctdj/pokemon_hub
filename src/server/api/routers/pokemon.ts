// src/server/api/routers/pokemon.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";


type evoPokemon = { species: { name: string; url: string }; evolves_to: evoPokemon[] };

//especies de los Pokemons
type SpeciesResponse = {
  results: Array<{ name: string; url: string }>;
};

//detalles de las especies de los Pokemons
type SpeciesDetail = {
  evolution_chain?: { url?: string } | null;
  generation?: { name?: string } | null;
};

//evolución de los Pokemons
type EvolutionChain = {
  chain: evoPokemon;
};

//cache de las especies de los Pokemons
let _speciesCache: Array<{ name: string; url: string }> | null = null;

//obtener todas las especies de los Pokemons
async function allSpecies(): Promise<Array<{ name: string; url: string }>> {
  if (_speciesCache) return _speciesCache;
  //obtener todas las especies de los Pokemons
  const response = await fetch(`${process.env.POKEAPI_URL}/pokemon-species?limit=2000`, { cache: "no-store" });
  if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY" });
  
  const data = (await response.json()) as unknown as SpeciesResponse;
  //guardar las especies en el cache
  _speciesCache = data.results;
  //devolver las especies del cache
  return _speciesCache;
}

async function getEvolutionNamesFromSpeciesUrl(speciesUrl: string): Promise<string[]> {
  //obtener las especies de los Pokemons desde la URL
  const response = await fetch(speciesUrl, { cache: "no-store" });
  if (!response.ok) return [];
  const species = (await response.json()) as unknown as SpeciesDetail;
  //obtener la URL de la evolución de los Pokemons
  const evolutionUrl = species?.evolution_chain?.url;
  if (!evolutionUrl) return [];

  //obtener la evolución de los Pokemons desde la URL
  const evolutionResponse = await fetch(evolutionUrl, { cache: "no-store" });
  if (!evolutionResponse.ok) return [];
  //obtener la cadena de evolución de los Pokemons
  const chain = (await evolutionResponse.json()) as unknown as EvolutionChain;

  //crear un array de nombres de los Pokemons de la cadena de evolución
  const output: string[] = [];
  const walkEvolution = (node: evoPokemon) => {
    output.push(node.species.name);
    for (const n of node.evolves_to ?? []) walkEvolution(n);
  };
  walkEvolution(chain.chain);
  return output;
}

//datos básicos de los Pokemons
type basicPokemonData = {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
  generation?: string;
};

//ordenar los Pokemons por ID ascendente
const sortByIdAsc = <T extends { id: number }>(arr: T[]) =>
  arr.sort((a, b) => a.id - b.id);


//datos de los Pokemons API
type PokemonApi = {
  id: number;
  name: string;
  sprites?: {
    front_default?: string | null;
    other?: Record<string, { front_default?: string | null } | undefined>;
  };
  types: Array<{ type: { name: string } }>;
};

//obtener los datos básicos de los Pokemons desde la API
async function fetchPokemonLite(nameOrId: string): Promise<basicPokemonData | null> {
  const res = await fetch(`${process.env.POKEAPI_URL}/pokemon/${encodeURIComponent(nameOrId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown as PokemonApi;
  return {
    id: data.id,
    name: data.name,
    sprite:
      data.sprites?.other?.["official-artwork"]?.front_default ??
      data.sprites?.front_default ??
      null,
    types: data.types.map((typeData) => typeData.type.name),
  };
}


async function enrichWithGeneration(pokes: basicPokemonData[]): Promise<basicPokemonData[]> {
  const enriched = await Promise.all(
    pokes.map(async (pokemon) => {
      try {
        const speciesResponse = await fetch(`${process.env.POKEAPI_URL}/pokemon-species/${pokemon.id}`, { cache: "no-store" });
        if (!speciesResponse.ok) return pokemon;
        const speciesData = (await speciesResponse.json()) as unknown as SpeciesDetail;
        return { ...pokemon, generation: speciesData.generation?.name };
      } catch {
        return pokemon;
      }
    })
  );
  return enriched;
}

export async function resolveList({
  query,
  type,
  generation,
  limit,
  offset,
}: {
  query?: string;
  type: string;
  generation: string;
  limit: number;
  offset: number;
}): Promise<basicPokemonData[]> {
  // 1) Búsqueda por texto → incluye evoluciones
  if (query?.trim()) {

    const q = query.trim().toLowerCase();

    // a) Buscar species cuyo nombre contenga el texto (búsqueda en tiempo real)
    const speciesList = await allSpecies();
    const matched = speciesList.filter((s) => s.name.includes(q));

    // b) Si no hay coincidencias por substring, intentar búsqueda exacta (útil para ID o nombre exacto)
    if (matched.length === 0) {
      const exact = await fetchPokemonLite(q);
      if (!exact) return [];
      const speciesUrl = `${process.env.POKEAPI_URL}/pokemon-species/${exact.id}/`;
      const evoNames = await getEvolutionNamesFromSpeciesUrl(speciesUrl);
      const names = Array.from(new Set([exact.name, ...evoNames])).slice(0, limit);
      const details = await Promise.all(names.map((n) => fetchPokemonLite(n)));
      const base = sortByIdAsc(details.filter(Boolean) as basicPokemonData[]);
      return await enrichWithGeneration(base);
    }

    // c) Expandir cadenas de evolución de las especies encontradas
    // Limitamos a 10 especies para rendimiento (puedes ajustar)
    const subset = matched.slice(0, 10);
    const evoSets = await Promise.all(
      subset.map((s) => getEvolutionNamesFromSpeciesUrl(s.url))
    );
    const unionNames = Array.from(new Set(evoSets.flat()));

    // Aplicar paginación y obtener detalles
    const limited = unionNames.slice(offset, offset + limit);
    const results = await Promise.all(limited.map((n) => fetchPokemonLite(n)));
    const base = sortByIdAsc(results.filter(Boolean) as basicPokemonData[]);
    return await enrichWithGeneration(base);
  }

  // 2) Solo tipo
  if (type !== "all" && generation === "all") {
    const r = await fetch(`${process.env.POKEAPI_URL}/type/${encodeURIComponent(type)}`, { cache: "no-store" });
    if (!r.ok) throw new TRPCError({ code: "BAD_GATEWAY" });
    type TypeResp = { pokemon: Array<{ pokemon: { name: string } }> };
    const d = (await r.json()) as unknown as TypeResp;
    const namesAll: string[] = d.pokemon.map((p) => p.pokemon.name);
    const names = namesAll.slice(offset, offset + limit);
    const results = await Promise.all(names.map(n => fetchPokemonLite(n)));
    const base = sortByIdAsc(results.filter(Boolean) as basicPokemonData[]);
    return await enrichWithGeneration(base);
  }

  // 3) Solo generación
  if (generation !== "all" && type === "all") {
    const r = await fetch(`${process.env.POKEAPI_URL}/generation/${encodeURIComponent(generation)}`, { cache: "no-store" });
    if (!r.ok) throw new TRPCError({ code: "BAD_GATEWAY" });
    type GenResp = { pokemon_species: Array<{ name: string }> };
    const d = (await r.json()) as unknown as GenResp;
    const namesAll: string[] = d.pokemon_species.map((s) => s.name);
    const names = namesAll.slice(offset, offset + limit);
    const results = await Promise.all(names.map(n => fetchPokemonLite(n)));
    const base = sortByIdAsc(results.filter(Boolean) as basicPokemonData[]);
    return await enrichWithGeneration(base);
  }

  // 4) Tipo + generación (intersección)
  if (type !== "all" && generation !== "all") {
    const genPath = generation.startsWith("gen")
      ? generation.replace("gen", "generation-")
      : generation;

    const [typeRes, genRes] = await Promise.all([
      fetch(`${process.env.POKEAPI_URL}/type/${encodeURIComponent(type)}`, { cache: "no-store" }),
      fetch(`${process.env.POKEAPI_URL}/generation/${encodeURIComponent(genPath)}`, { cache: "no-store" }),
    ]);
    if (!typeRes.ok || !genRes.ok) throw new TRPCError({ code: "BAD_GATEWAY" });

    const typeData = (await typeRes.json()) as unknown as { pokemon: Array<{ pokemon: { name: string } }> };
    const genData = (await genRes.json()) as unknown as { pokemon_species: Array<{ name: string }> };

    const namesByType = new Set<string>(typeData.pokemon.map((p) => p.pokemon.name));
    const namesByGen: string[] = genData.pokemon_species.map((s) => s.name);

    const inter = namesByGen.filter((name) => namesByType.has(name));
    //limitar los nombres a la cantidad de resultados por página
    const names = inter.slice(offset, offset + limit);
    const results = await Promise.all(names.map((name) => fetchPokemonLite(name)));
    const base = sortByIdAsc(results.filter(Boolean) as basicPokemonData[]);
    return await enrichWithGeneration(base);
  }

  // 5) Sin filtros → listar todos paginado
  const listResponse = await fetch(
    `${process.env.POKEAPI_URL}/pokemon?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!listResponse.ok) throw new TRPCError({ code: "BAD_GATEWAY" });
  const listData = (await listResponse.json()) as unknown as { results: Array<{ name: string }> };
  const names: string[] = listData.results.map((pokemonData) => pokemonData.name);
  const results = await Promise.all(names.map(n => fetchPokemonLite(n)));
  const base = sortByIdAsc(results.filter(Boolean) as basicPokemonData[]);
  return await enrichWithGeneration(base);
}


//router de los Pokemons
export const pokemonRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          type: z.string().default("all"),
          generation: z.string().default("all"),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const {
        query = "",
        type = "all",
        generation = "all",
        limit = 20,
        offset = 0,
      } = input ?? {};
      return resolveList({ query, type, generation, limit, offset });
    }),

  listAll: publicProcedure
    .input(
      z
        .object({
          type: z.string().default("all"),
          generation: z.string().default("all"),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { type = "all", generation = "all", limit = 20, offset = 0 } = input ?? {};
      return resolveList({ type, generation, limit, offset });
    }),
});
