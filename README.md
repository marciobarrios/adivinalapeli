# Adivina la peli 🎬

Juego de mímica de películas, en castellano y pensado para pasar un solo móvil entre amigos. La
partida funciona sin conexión después de la primera visita: el catálogo se genera durante el build y
el service worker guarda toda la aplicación.

## Cómo se juega

1. Cread de 2 a 4 equipos y poned los nombres. Si jugáis individualmente, cada persona cuenta como
   un equipo.
2. Configurad 1, 3 o 5 rondas y turnos de 30, 60 o 90 segundos.
3. Escoged una temática que se mantendrá durante toda la partida.
4. En cada turno, una persona mira la pantalla e interpreta la película solo con gestos.
5. Cada acierto suma un punto. Se puede pasar una tarjeta sin penalización.

Incluye las temáticas `Surtido de cine`, `En familia`, `Disney y Pixar`, décadas de los 80 a los
2020, `Animación` y `Comedias`.

## Qué incluye

- 80 películas curadas con portada local, título en `es-ES`, año, géneros y pista emoji de respaldo.
- De 2 a 4 equipos, también para personas que juegan individualmente.
- Marcador, cambio automático de ronda, resumen de turno y revancha.
- Recuperación de la partida desde `localStorage` si se recarga la página.
- PWA offline-first con exportación estática y precache de todos los recursos.
- Interfaz responsive y accesible, construida con shadcn/ui sobre Base UI.
- Pruebas Playwright en Chromium de escritorio y un viewport Pixel 7, incluido el modo offline.

## Stack

- pnpm 11
- Next.js 16 con App Router y exportación estática
- React 19 y TypeScript
- Tailwind CSS 4
- shadcn/ui con Base UI
- oxfmt y oxlint
- Playwright

## Desarrollo local

Requisitos: Node.js 22.13 o superior y Corepack habilitado.

```bash
corepack enable
pnpm install
pnpm dev
```

La app estará disponible en `http://localhost:3000`.

## Catálogo y TMDB

La clave de TMDB solo se utiliza en Node.js al generar el catálogo. Nunca se incluye en el bundle del
navegador y no debe llevar el prefijo `NEXT_PUBLIC_`.

```bash
cp .env.example .env.local
# Añade TMDB_API_KEY a .env.local
pnpm catalog:refresh
```

El flujo está optimizado para evitar peticiones innecesarias:

- `src/data/movie-seeds.ts` mantiene IDs, títulos de respaldo, categorías y emojis.
- `pnpm catalog:ensure` reutiliza `src/data/movies.generated.json` y las portadas locales mientras estén vigentes.
- `pnpm catalog:refresh` solicita los 80 registros con concurrencia limitada y guarda sus portadas `w342` en `public/posters`.
- Si una portada no existe o no puede cargarse, la tarjeta muestra automáticamente la pista emoji.
- Si TMDB no está disponible, se conserva la copia local; sin copia previa se usa el título y el emoji versionados.
- El catálogo propone renovarse cada 150 días, por debajo del máximo de caché indicado por TMDB.

El build normal es determinista y no necesita acceso a TMDB porque el catálogo generado está
versionado.

## Comandos

| Comando                | Uso                                             |
| ---------------------- | ----------------------------------------------- |
| `pnpm dev`             | Servidor de desarrollo                          |
| `pnpm build`           | Catálogo, exportación estática y service worker |
| `pnpm preview`         | Servir localmente el directorio `out/`          |
| `pnpm catalog:refresh` | Renovar metadatos desde TMDB                    |
| `pnpm format`          | Aplicar oxfmt                                   |
| `pnpm lint`            | Ejecutar oxlint                                 |
| `pnpm typecheck`       | Comprobar TypeScript                            |
| `pnpm test:e2e`        | Build y pruebas Playwright                      |
| `pnpm check`           | Todas las comprobaciones de CI                  |

## Offline-first

Next.js genera el sitio completo en `out/`. Después del build, `scripts/build-service-worker.ts`
encuentra los recursos exportados, calcula una versión de caché y los añade al precache. Así, después
de una primera carga correcta, se puede cerrar la conexión, recargar y empezar una partida completa.

## Atribución

Este producto utiliza la API de TMDB, pero TMDB no lo respalda ni certifica. Consulta los
[requisitos de atribución de TMDB](https://developer.themoviedb.org/docs/faq).

## Licencia

MIT
