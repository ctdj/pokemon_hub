// src/app/page.tsx (Server)
import { HydrateClient } from "~/trpc/server";
import { SearchPokemon } from "./_components/SearchPokemon";

export default async function Page() {
  return (
    <HydrateClient>
      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold">Pokehub</h1>
          <p className="text-muted-foreground">
            Listado de todos los Pokémon
          </p>
        </header>
        <SearchPokemon />
      </main>
    </HydrateClient>
  );
}
