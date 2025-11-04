// app/pokemon/[id]/page.tsx
import Link from "next/link";
import { api } from "~/trpc/server";
import Image from "next/image";

// helpers para species/evolutions (server component: puedes usar fetch directo)
type Species = {
  generation?: { name?: string } | null;
  evolution_chain?: { url?: string } | null;
};

async function getSpecies(id: string): Promise<Species | null> {
  const speciesResponse = await fetch(`${process.env.POKEAPI_URL}/pokemon-species/${id}`, { cache: "no-store" });
  if (!speciesResponse.ok) return null;
  const data = (await speciesResponse.json()) as unknown as Species;
  return data ?? null;
}

function generationLabel(gen?: string) {
  if (!gen) return "-";
  const roman = gen.split("-")[1]?.toUpperCase() ?? "";
  return `GEN ${roman}`;
}

function idFromUrl(url: string) {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

type EvolutionChain = { species: { name: string; url: string }, evolves_to: EvolutionChain[] };

function flattenEvolutionChain(node: EvolutionChain, output: { id: number; name: string }[] = []) {
  const sid = Number(idFromUrl(node.species.url));
  output.push({ id: sid, name: node.species.name });
  for (const nextNode of node.evolves_to ?? []) flattenEvolutionChain(nextNode, output);
  return output;
}

type Profile = {
  id: number;
  name: string;
  sprite?: string | null;
  types: string[];
  stats: { name: string; value: number }[];
};

export default async function PokemonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Perfil principal (tRPC)
  const pokemonProfile = (await api.profile.getProfile({ id })) as unknown as Profile;
  // Species (generación + cadena evolutiva)
  const species = await getSpecies(id);
  const genText = generationLabel(species?.generation?.name);

  // Evolution chain
  let evolutions: { id: number; name: string }[] = [];
  if (species?.evolution_chain?.url) {
    type EvolutionChainResponse = { chain: EvolutionChain };
    const evoRes = await fetch(species.evolution_chain.url, { cache: "no-store" });
    if (evoRes.ok) {
      const evoData = (await evoRes.json()) as unknown as EvolutionChainResponse;
      evolutions = flattenEvolutionChain(evoData.chain);
    }
  }

  return (
    <main>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-semibold">Pokémon #{pokemonProfile.id} - {pokemonProfile.name}</h1>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/" className="inline-block">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 py-2 mb-6 hover:bg-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="lucide lucide-arrow-left mr-2 h-4 w-4">
              <path d="m12 19-7-7 7-7"></path>
              <path d="M19 12H5"></path>
            </svg>
            Volver al listado
          </button>
        </Link>

        <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-card)] border border-border">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Columna izquierda */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold capitalize mb-2">{pokemonProfile.name}</h1>
                <p className="text-muted-foreground">#{String(pokemonProfile.id).padStart(4, "0")}</p>
              </div>

              {/* Tipos */}
              <div className="flex gap-2">
                {pokemonProfile.types.map((t: string) => (
                  <span
                    key={t}
                    className="px-4 py-1 rounded-full text-sm font-medium capitalize text-white"
                    style={{
                      // colorcito básico por tipo (simple)
                      backgroundColor: ({
                        fire: "#EF4444", water: "#3B82F6", grass: "#22C55E",
                        electric: "#F59E0B", fighting: "#DC2626", psychic: "#A855F7",
                        rock: "#9CA3AF", ground: "#CA8A04", ghost: "#6B7280",
                        ice: "#60A5FA", bug: "#84CC16", dragon: "#7C3AED",
                        dark: "#111827", steel: "#6B7280", fairy: "#EC4899",
                        flying: "#38BDF8", poison: "#A78BFA", normal: "#9CA3AF",
                      } as Record<string, string>)[t] ?? "#0EA5E9"
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Generación */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Generación</p>
                <p className="font-semibold">{genText}</p>
              </div>

              {/* Sprite */}
              {pokemonProfile.sprite ? (
                <Image
                  src={pokemonProfile.sprite}
                  alt={pokemonProfile.name}
                  width={512}
                  height={512}
                  className="w-full max-w-sm mx-auto drop-shadow-2xl"
                  priority
                />
              ) : null}
            </div>

            {/* Columna derecha */}
            <div className="space-y-6">
              {/* Stats */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="lucide lucide-zap h-6 w-6 text-secondary">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
                  </svg>
                  Estadísticas
                </h2>

                <div className="space-y-3">
                  {pokemonProfile.stats.map((s: { name: string; value: number }) => {
                    // ancho relativo (0–100) asumiendo 180 como "máximo" razonable
                    const pct = Math.max(0, Math.min(100, Math.round((s.value / 180) * 100)));
                    return (
                      <div key={s.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium uppercase">{s.name.replace("special-", "SP.")}</span>
                          <span className="text-sm font-bold text-primary">{s.value}</span>
                        </div>
                        <div className="relative w-full overflow-hidden rounded-full bg-secondary h-2">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evoluciones */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Evoluciones</h2>
                <div className="flex flex-wrap gap-4">
                  {evolutions.map((evo) => {
                    const isCurrent = evo.id === pokemonProfile.id;
                    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png`;
                    return (
                      <Link key={evo.id} href={`/profile/${evo.id}`}>
                        <div
                          className={`bg-muted/50 rounded-lg p-4 hover:bg-muted transition-all cursor-pointer ${isCurrent ? "ring-2 ring-primary" : ""}`}
                        >
                          <Image
                            src={spriteUrl}
                            alt={evo.name}
                            width={256}
                            height={256}
                            className="w-24 h-24 object-contain"
                          />
                          <p className="text-center text-sm font-medium capitalize mt-2">
                            {evo.name}
                          </p>
                          {isCurrent && (
                            <p className="text-center text-xs text-primary font-bold mt-1">
                              Actual
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {evolutions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin datos de evolución.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
