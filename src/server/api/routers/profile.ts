import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const profileRouter = createTRPCRouter({
  getProfile: publicProcedure
    .input(z.object({ id: z.string().min(1) })) // ID como string para flexibilidad
    .query(async ({ input }) => {
      const res = await fetch(
        `${process.env.POKEAPI_URL}/pokemon/${input.id}/`,
        { cache: "no-store" }
      );

      if (res.status === 404) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pokémon no encontrado",
        });
      }

      if (!res.ok) {
        throw new TRPCError({ code: "BAD_GATEWAY" });
      }

      type PokemonApi = {
        id: number;
        name: string;
        height: number;
        weight: number;
        sprites?: {
          front_default?: string | null;
          other?: Record<string, { front_default?: string | null } | undefined>;
        };
        types: Array<{ type: { name: string } }>;
        stats: Array<{ stat: { name: string }; base_stat: number }>;
      };

      const data = (await res.json()) as unknown as PokemonApi;

      return {
        id: data.id,
        name: data.name,
        height: data.height,
        weight: data.weight,
        sprite:
          data.sprites?.other?.["official-artwork"]?.front_default ??
          data.sprites?.front_default ??
          null,
        types: data.types.map((t) => t.type.name),
        stats: data.stats.map((s) => ({
          name: s.stat.name,
          value: s.base_stat,
        })),
      };
    }),
});
