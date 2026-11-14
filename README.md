# Copiloto de Movilidad CDMX — Agente de Micro-Flujo y Asistencia Vial

## Descripción

_Pendiente (Tarea 13)._

## Arquitectura híbrida

_Pendiente (Tarea 13)._

## Requisitos previos

- Node.js ≥ 20.9 (lo exige Next.js 16).
- npm ≥ 9.
- Google Chrome ≥ 120 (Web Speech API y PWA).
- Cuenta de AWS con acceso a Amazon Bedrock en `us-east-1`.

## Clonación

```bash
git clone <URL-del-repositorio>
cd <carpeta-del-repositorio>
npm install
```

## Configuración de `.env.local`

1. Copia la plantilla:

   ```bash
   # macOS / Linux
   cp .env.example .env.local
   # Windows (PowerShell)
   Copy-Item .env.example .env.local
   ```

2. Llena las tres variables:

   | Variable | Propósito | Obligatoria | Ejemplo (ficticio) |
   |---|---|---|---|
   | `AWS_ACCESS_KEY_ID` | ID de la llave de acceso IAM con permiso para Bedrock | Sí | `AKIAXXXXEXAMPLE` |
   | `AWS_SECRET_ACCESS_KEY` | Llave secreta asociada al ID anterior | Sí | `xxxxxxxxxxxxxxxxxxxxEXAMPLE` |
   | `AWS_REGION` | Región de Bedrock | Sí | `us-east-1` |

3. Reinicia `npm run dev` para que Next.js lea los valores nuevos.

Notas:

- Las credenciales solo se leen en el servidor (`lib/server/config.ts`). Nunca uses el prefijo `NEXT_PUBLIC_` en estas variables.
- `.env.local` está en `.gitignore`; no lo subas al repositorio.
- Cada integrante puede usar sus propias llaves: basta con cambiar `.env.local` y reiniciar el servidor, sin tocar código.
- En la consola de Bedrock (`us-east-1`) habilita el acceso a los modelos **Claude 3.5 Haiku** (principal) y **Amazon Nova Micro** (respaldo). Los IDs de modelo están en `lib/server/models.ts`.
- Si faltan variables, la app sigue funcionando en "Modo sin IA".

## Ejecución local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000> en Chrome.

## Despliegue en Vercel

_Pendiente (Tarea 13)._

## Modo sin IA

_Pendiente (Tarea 13)._

## Roles del equipo

| Integrante | Rol | Módulos |
|---|---|---|
| I1 | AWS / Arquitectura | `app/api/agent/route.ts`, `lib/server/*`, `lib/shared/*`, `lib/agent/*`, `.env.example`, `.gitignore` |
| I2 | Física | `lib/physics/*`, `store/trafficStore.ts`, `hooks/useSimulationLoop.ts` |
| I3 | UI | `app/layout.tsx`, `app/page.tsx`, `app/manifest.ts`, `app/globals.css`, `components/road/`, `components/speedometer/`, `components/controls/`, `components/messages/`, `components/pwa/`, `public/sw.js`, `public/icons/` |
| I4 | Voz / Pitch y demo | `lib/voice/*`, `components/voice/MicButton.tsx`, `README.md` (guion y checklist) |

## Guion de demostración

_Pendiente (Tarea 13)._

## Checklist de pruebas manuales

_Pendiente (Tarea 13)._
