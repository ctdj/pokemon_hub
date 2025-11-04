# PokeHub - Ejecutar en local

Aplicación Next.js (App Router) con TypeScript y tRPC para explorar y buscar Pokémon usando PokéAPI (`https://pokeapi.co/api/v2/pokemon/`).

## Requisitos
- Node.js 18+
- npm 9+ (incluido con Node)

Verifica:
```bash
node -v
npm -v
```

## Instalación
```bash
# En la carpeta del proyecto
npm install
```

## Desarrollo
```bash
npm run dev
```
Abre: `http://localhost:3000`

## Producción
```bash
npm run build
npm run start
```
Servidor en: `http://localhost:3000`

## Scripts útiles
```bash
npm run lint        # Linting (ESLint)
npm run lint:fix    # Arreglos automáticos
npm run typecheck   # Comprobación de tipos TS
npm run check       # Lint + types
npm run preview     # build + start
```

## Variables de entorno
No son necesarias para desarrollo. La app usa PokéAPI pública.
Si lo necesitas, crea `.env.local`:
```bash
NODE_ENV=development
```

## Estructura (resumen)
```
src/
  app/                 # Páginas y componentes (App Router)
  server/api/          # Routers tRPC (backend)
  trpc/                # Cliente tRPC/React Query
  data/                # Listas de tipos/generaciones
```

## Solución de problemas
- Puerto en uso (3000):
  - macOS/Linux: `lsof -ti:3000 | xargs kill -9`
  - Windows: `netstat -ano | findstr :3000` y `taskkill /PID <PID> /F`
- Dependencias corruptas:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Tipos o lint:
  ```bash
  npm run typecheck
  npm run lint
  npm run lint:fix
  ```

## Enlaces
- Pokemon Hub: https://pokemon-hub-two.vercel.app/
- PokéAPI: https://pokeapi.co/api/v2/pokemon/ 
