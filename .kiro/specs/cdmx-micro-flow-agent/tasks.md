# Implementation Plan: Agente Inteligente de Micro-Flujo y Asistencia Vial (CDMX)

## Overview

Plan secuencial para un hackathon de 150 minutos con 4 integrantes. La Tarea 1 (infraestructura y contratos compartidos) la hace todo el equipo junto. Al terminarla, cada integrante clona el repositorio y trabaja en paralelo en su módulo, porque los contratos (`lib/shared/contracts.ts`, `lib/physics/types.ts`) y los archivos stub ya existen. Al final se integra todo, se compila y se despliega en Vercel.

Lenguaje: TypeScript (Next.js 16 App Router + Tailwind 4), como en `design.md`.

**Next.js 16 tiene cambios incompatibles con versiones anteriores.** Antes de escribir código, cada integrante debe leer la guía correspondiente en `node_modules/next/dist/docs/` (ver `AGENTS.md`) y atender los avisos de deprecación. En particular, con `cacheComponents: true` el archivo `app/api/agent/route.ts` no puede exportar `runtime` ni `dynamic`; solo exporta `maxDuration = 15`. Tailwind 4 no usa `tailwind.config.*`: los tokens de color van en el bloque `@theme` de `app/globals.css`. Node.js mínimo: 20.9.

**Semáforo de Eje Central (Req. 16, 17, 18).** Todos los autos se detienen en rojo. Solo el Auto_Usuario genera eventos Semaforo_Perdido y Onda Verde. La sub-tarea 3.6 (`lib/physics/signal.ts`) se numera al final de la Tarea 3 para no renumerar, pero **se ejecuta antes que 3.2**, porque el motor la usa. Igual, 5.9 (`useSignalMissAgent`) se ejecuta después de 5.7 y 3.3.

**Sin pruebas basadas en propiedades ni fast-check** (decisión del equipo, Req. 14.5). Las propiedades del diseño se comprueban a mano con `window.__sim` en la consola, `curl` contra `/api/agent`, `npm run build` y DevTools, según la sección "Testing Strategy" de `design.md`.

**Regla de pausa:** al llegar a cada tarea de checkpoint hay que detenerse, resumir lo hecho y preguntar al usuario: **"¿Avanzamos al siguiente módulo o hacemos ajustes?"**. No se continúa sin respuesta.

### Línea de tiempo sugerida (150 min)

| Minutos | Integrante 1 (AWS) | Integrante 2 (Física) | Integrante 3 (UI) | Integrante 4 (Voz/Demo) |
|---|---|---|---|---|
| 0–20 | Tarea 1 (lidera) | Tarea 1 (apoya) | Tarea 1 (apoya) | Tarea 1 (apoya) |
| 20–75 | Tarea 5 (servidor + Bedrock + `useSignalMissAgent`, 50 min) | Tarea 3 (física + semáforo + store + bucle, 55 min; 3.6 antes de 3.2) | Tarea 7 (UI, desde min 35 con el store) | Tarea 9 (voz), luego Tarea 13 |
| 75–95 | Apoya integración | Apoya integración | Tarea 11 (PWA) | Tarea 13 (README, guion con escena del semáforo, checklist de 8 ítems) |
| 95–130 | Tarea 15 (integración, build, Vercel) | Tarea 15 | Tarea 15 | Tarea 15 |
| 130–150 | Colchón: ajustes y ensayo de la demo | | | |

## Tasks

- [x] 1. Fase 1: infraestructura y contratos compartidos — ⏱ 20 min — Responsable: Integrante 1 AWS (con todo el equipo)
  - [x] 1.1 Crear el proyecto Next.js con App Router, TypeScript y Tailwind
    - Ejecutar `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"` en la raíz del repositorio
    - Instalar dependencias: `npm install zustand @aws-sdk/client-bedrock-runtime server-only`
    - Confirmar que `package.json` no declara ninguna librería de pruebas (ni fast-check ni otra de PBT)
    - _Requisitos: 12.4, 12.7, 14.5_
  - [x] 1.2 Crear `.gitignore`, `.env.example` y el esqueleto del `README.md`
    - `.env.example` con exactamente tres líneas: `AWS_ACCESS_KEY_ID=`, `AWS_SECRET_ACCESS_KEY=`, `AWS_REGION=`
    - `.gitignore` con `node_modules/`, `.next/`, `out/`, `build/`, `.vercel`, `.env.local`, `.env*.local`, `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`, sin ningún patrón que excluya `.env.example`
    - `README.md` en español solo con los encabezados en orden: Descripción, Arquitectura híbrida, Requisitos previos, Clonación, Configuración de `.env.local`, Ejecución local, Despliegue en Vercel, Modo sin IA, Roles del equipo, Guion de demostración, Checklist de pruebas manuales
    - _Requisitos: 1.1, 1.3, 1.4, 13.1, 13.8_
  - [x] 1.3 Crear la estructura de carpetas por rol con archivos stub
    - Crear `app/api/agent/route.ts`, `lib/server/*`, `lib/agent/*`, `lib/physics/*`, `lib/voice/*`, `store/trafficStore.ts`, `hooks/useSimulationLoop.ts`, `components/{road,speedometer,controls,messages,pwa,voice}/*` según "Estructura de carpetas por rol" del diseño
    - Cada stub exporta la firma del diseño (por ejemplo `speak(text)` vacío, `stepWorld` que devuelve el mundo sin cambios, componentes que devuelven `null`) para que nadie se bloquee
    - Todos los archivos de `lib/server/` empiezan con `import 'server-only'`
    - _Requisitos: 1.2, 13.7_
  - [x] 1.4 Escribir los contratos compartidos: `lib/shared/contracts.ts`, `lib/shared/fallbackMessages.ts`, `lib/physics/types.ts` y `lib/physics/constants.ts`
    - `contracts.ts`: `SnapshotCar`, `SnapshotBrakeEvent`, `TrafficSnapshot`, `AgentRequest`, `AgentAction`, `ErrorCode`, `AgentResponse` tal como en "Data Models"
    - `fallbackMessages.ts`: objeto `FALLBACK_MESSAGES` con todos los mensajes en español del diseño y `buildLocalFallback(lastEvent, carsById)` (con evento: descripción y carril `lane + 1`; sin evento o con auto inexistente: mensaje genérico)
    - `types.ts`: `Lane`, `Automovil`, `CarControl`, `BrakeEvent`, `World`, `TrafficState`
    - `constants.ts`: todas las constantes (200 m, 27.8 m/s, -5.88, 2.0 s, 8 m, 30 m, 0.5, 2.94, 3.0, 0.1 s, 0.05 s, 1.0, 500)
    - `lib/shared/roadContext.ts`: `ROAD_CONTEXT` (Viaducto Miguel Alemán, sentido, tramo, 3 incorporaciones) y `nearestRamp(y)`, según "Localización CDMX" del diseño
    - Extender los 5 archivos de contrato existentes según la tabla "Cambios a los archivos de contrato" del diseño:
      - Quitar: `MissedLightEvent`, `GreenWaveState`, `World.greenWave`, `TrafficState.missedLights`, `trafficLight` y `greenWave` de `TrafficSnapshot`, el valor `'missed_light'`, `buildGreenWaveFallback`, `ROAD_CONTEXT.trafficLight` y las constantes `LIGHT_GREEN_S`, `LIGHT_RED_S`, `LIGHT_CYCLE_S`, `GREEN_WAVE_DECEL_MS2`, `TTA_MIN_SPEED_MS`, `MAX_MISSED_LIGHTS`
      - `types.ts`: `SignalState`, `SignalMissEvent`; `CarControl.cruiseSpeed`, `signalStopping`, `amberExempt`, `greenWaveTargetMs`; `World.userCarId`, `World.lastSignalMissCycle`; `TrafficState.signalMissEvents`, `TrafficState.signal`; comentario de `targetSpeed`: "velocidad objetivo actual"
      - `constants.ts`: `SIGNAL_STOP_MIN_DECEL_MS2 = 1.5`, `SIGNAL_HOLD_Y_M = 199.9`, `QUEUE_STOPPED_SPEED_MS = 0.5`, `GREEN_WAVE_MAX_KMH = 60`, `GREEN_WAVE_GAIN_S = 1.0`, `MAX_SIGNAL_MISS_EVENTS = 50`; se conservan `USER_CAR_ID = 'c02'` y `GREEN_WAVE_MIN_KMH`
      - `contracts.ts`: `SnapshotSignal`, `SnapshotSignalMiss`, `TrafficSnapshot.signal`, `TrafficSnapshot.lastSignalMiss`, `AgentTrigger = 'manual' | 'voice' | 'signal_miss'`, `AGENT_TRIGGERS`, campo opcional `trigger` en `AgentRequest`
      - `fallbackMessages.ts`: `FALLBACK_MESSAGES.SIGNAL_MISS` y `buildSignalMissFallback(kmh)` (importa `ROAD_CONTEXT`)
      - `roadContext.ts`: `signal: { name: 'Eje Central', y: 200, greenS: 15, redS: 15 }`
    - Tokens de color Semovi en el bloque `@theme` de `app/globals.css` (Tailwind 4, sin `tailwind.config.*`): `semovi-green`, `semovi-green-dark`, `semovi-green-light`, `asphalt`, `asphalt-dark`, `asphalt-line`, `signal-white`
    - Actualizar los stubs que usan tipos cambiados (`scenario.ts`, `engine.ts`, `trafficStore.ts`, `snapshot.ts`, `agentClient.ts`, `askAgent.ts`, `validateRequest.ts`, `prompt.ts`, `route.ts`) para que `npm run build` siga en verde
    - `lib/shared` no lee `process.env`
    - _Requisitos: 3.1, 8.1, 11.3, 11.6, 11.8, 15.1, 15.2, 15.7, 16.1, 17.3, 18.1, 18.2_
  - [ ]* 1.5 Verificación manual de la Fase 1
    - `npm run build` termina con código 0 usando los stubs
    - `npm run dev` abre `http://localhost:3000` en menos de 60 s
    - Hacer commit y push para que los 4 integrantes clonen
    - _Requisitos: 12.4, 12.7_

- [x] 2. Checkpoint: Fase 1 (infraestructura)
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 3. Módulo de física, semáforo, store y bucle de simulación — ⏱ 55 min — Responsable: Integrante 2 Física
  - [x] 3.1 Implementar `lib/physics/scenario.ts`
    - `createInitialWorld()` con los 10 autos fijos de la tabla del diseño (4/3/3), `simTime = 0`, `damperEnabled = false`, autos ordenados por `id`
    - `createGhostCars(simTime)` con g01 y g02 de la tabla, `scheduledBrakeAt = simTime + 1.0` y `simTime + 2.0`
    - Inicializar los campos nuevos de `CarControl` en autos normales y fantasmas: `cruiseSpeed = targetSpeed = v inicial`, `signalStopping = false`, `amberExempt = false`, `greenWaveTargetMs = null`; en el mundo, `userCarId = null` y `lastSignalMissCycle = {}`
    - Sin `Math.random` ni reloj del sistema
    - _Requisitos: 5.1, 5.2, 5.4, 5.6, 16.2_
  - [ ] 3.2 Implementar `lib/physics/engine.ts` (requiere 3.6)
    - `stepWorld(world, dt)` puro con fase A (decidir aceleraciones leyendo el cuadro anterior) y fase B (integrar), según el algoritmo del diseño
    - Prioridad de reglas por auto según el diseño: (a) dt, (b) semáforo, (c) fantasma programado, (d) proximidad, (e) frenado brusco, (f) rojo, (g) fila, (h) amortiguador, (i) Onda Verde, (j) restaurar/recuperación
    - Manejo de `dt`: no finito o ≤ 0 devuelve el mismo mundo; > 0.1 se limita a 0.1
    - Regla de proximidad < 8 m con `savedAccel` y restauración, Frenado_Brusco de 2.0 s o hasta `v = 0`, amortiguador con desaceleración en [0.5, 2.94] sin evento, recuperación de crucero +1.0 m/s² hacia `targetSpeed`
    - Semáforo con `signalStateAt(simTime)`: en el cuadro del cambio a rojo, marcar `amberExempt` a los autos que necesitan más de 5.88 m/s²; en rojo, desaceleración v² / (2·(200 − y)) acotada a 5.88 si es ≥ 1.5 (`signalStopping`), sin evento; fila: desaceleración para quedar a 8 m del líder que se detiene o está detenido, sin evento; al pasar a verde, la fila arranca con la recuperación de crucero
    - Regla de la línea de alto: en rojo, un auto no exento que llegue a y ≥ 200 queda en `y = 199.9` con `v = 0`; wraparound en 200 m solo en verde o con `amberExempt`, y el wraparound quita `amberExempt`
    - Onda Verde y Semaforo_Perdido solo para `world.userCarId` con `speed > 0`: `computeTta`; si el semáforo está en verde, `remainingS < tta` y `lastSignalMissCycle[userCarId] !== cycleIndex`, emitir un `SignalMissEvent`, fijar `greenWaveTargetMs` y `targetSpeed`; bajar con desaceleración en [0.5, 2.94] sin evento; al cruzar la línea, `greenWaveTargetMs = null` y `targetSpeed = cruiseSpeed`
    - Registrar `BrakeEvent` solo al entrar al estado de frenado; `StepResult` devuelve `world`, `newEvents`, `signalMissEvents` y `signal`
    - `findLeader` y `triggerHardBrake`; sin imports de React, store ni red
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2, 4.4, 4.5, 4.6, 16.3, 16.4, 16.5, 16.6, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_
  - [ ] 3.3 Implementar `store/trafficStore.ts` (Zustand)
    - Estado: `world`, `brakeEvents`, `status`, `selectedCarId`, `lastMessage`, `noAiMode`, `awaitingAgent`, `simulationError`, `signal`, `signalMissEvents`, `pendingSignalMiss`
    - `tick(dt)` con `try/catch`: ante error pasa a `paused`, conserva el último mundo válido y pone `FALLBACK_MESSAGES.SIMULATION_ERROR`; antes de llamar al motor asigna `world.userCarId = resolveUserCarId(world, selectedCarId)`; agrega eventos con `.slice(-500)`; guarda `signal = r.signal` y `signalMissEvents = [...prev, ...r.signalMissEvents].slice(-50)`; si hay eventos nuevos, `pendingSignalMiss = r.signalMissEvents.at(-1)`; limpia `selectedCarId` si el auto ya no existe
    - `clearPendingSignalMiss()`
    - `toggleRunning`, `setDamper` idempotente, `injectChaos` (no hace nada si ya hay fantasmas)
    - `selectCar(id)`: si el Auto_Usuario anterior tenía `greenWaveTargetMs != null`, lo limpia (`greenWaveTargetMs = null`, `targetSpeed = cruiseSpeed`) y luego asigna la selección
    - `reset()`: mundo inicial con `simTime = 0`, sin eventos de frenado, `signalMissEvents = []`, `pendingSignalMiss = null`, sin fantasmas ni selección, `signal = signalStateAt(0)` (verde, 15 s)
    - `applyAgentResponse`: guarda `lastMessage`, `noAiMode = source !== 'bedrock'`, aplica solo `enable_damper`/`disable_damper` e ignora otro valor; `setLocalMessage(text, isFallback)`
    - `tick` no hace llamadas de red
    - _Requisitos: 4.3, 4.7, 5.2, 5.3, 5.5, 6.7, 7.7, 10.5, 10.11, 11.4, 11.9, 16.2, 16.7, 17.3, 17.6_
  - [ ] 3.4 Implementar `hooks/useSimulationLoop.ts` y las utilidades de consola `window.__sim`
    - Una sola llamada a `tick(dt)` por callback de `requestAnimationFrame`, `dt = min((ts - last)/1000, 0.05)`
    - En pausa no llama al motor y pone `last = null`, así el primer cuadro tras reanudar tiene `dt = 0` y no se llama al motor
    - `cancelAnimationFrame` al desmontar; sin `fetch` ni imports de red
    - Solo en desarrollo (`process.env.NODE_ENV !== 'production'`): `window.__sim = { checkInvariants(), bench(n = 600), stats(), step(dt), signal() }`; `signal()` devuelve `{ signal, userCarId, tta, greenWaveKmh, lastSignalMiss }`; `snapshot()` se conecta en la tarea 15.1
    - `checkInvariants()` también revisa la Propiedad 18 (ningún auto no exento hace wraparound en rojo) y la Propiedad 19 (sin `(carId, cycleIndex)` repetidos, máximo 50 eventos)
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8, 16.7_
  - [ ]* 3.5 Verificación manual de la física (Propiedades 1 a 9 y 17 a 22 del diseño)
    - `__sim.bench(600)` < 4 ms y `__sim.checkInvariants()` sin violaciones, con y sin caos
    - `__sim.step(0.05)` con la simulación pausada y comparar un auto contra el cálculo a mano
    - Correr dos veces Reiniciar → Inyectar caos y comparar `JSON.stringify` del mundo
    - `__sim.stats()` ≥ 55 fps en 10 s; pestaña Network sin solicitudes durante 60 s
    - Propiedad 17: `__sim.signal()` antes y después de "Reiniciar" (verde, 15 s, `simTime = 0`); observar el contador durante un ciclo completo
    - Propiedad 18: durante un rojo, la fila se detiene en la línea y `checkInvariants()` no reporta cruces
    - Propiedades 19 y 20: un solo Semaforo_Perdido por ciclo; comparar `lastSignalMiss.suggestedKmh` con el cálculo a mano
    - Propiedad 21: con amortiguador activo y sin caos, 2 ciclos del semáforo no suben el contador de frenados bruscos
    - Propiedad 22: con Onda Verde activa, cruzar la línea, "Reiniciar" o cambiar la selección deja `greenWaveTargetMs = null`
    - _Requisitos: 3.4, 3.6, 3.9, 3.10, 4.1, 4.3, 4.5, 5.3, 5.5, 6.5, 6.6, 6.8, 16.1, 16.2, 16.3, 16.4, 16.5, 17.2, 17.3, 17.4, 17.5, 17.6_
  - [x] 3.6 Implementar `lib/physics/signal.ts` (`signalStateAt`, `computeTta`, `greenWaveSpeedKmh`, `resolveUserCarId`) — ejecutar antes de 3.2
    - `signalStateAt(simTime)`: ciclo 30 s, verde si `simTime mod 30 < 15`, `remainingS` de la fase y `cycleIndex = floor(simTime / 30)`; usa `ROAD_CONTEXT.signal`
    - `computeTta(y, speed)`: `(200 − y) / speed`, `Infinity` si `speed = 0`
    - `greenWaveSpeedKmh(y, greenRemainingS)`: `clamp(floor(((200 − y) / (greenRemainingS + 15)) · 3.6 / 5) · 5, 10, 60)`
    - `resolveUserCarId(world, selectedId)`: la selección si existe; si no, `USER_CAR_ID` si existe; si no, `null`
    - Funciones puras, sin reloj del sistema, React, store ni red
    - _Requisitos: 16.1, 17.1, 17.4_

- [ ] 4. Checkpoint: módulo de física
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 5. Módulo de servidor y AWS Bedrock — ⏱ 50 min — Responsable: Integrante 1 AWS
  - [x] 5.1 Implementar `lib/server/config.ts` y `lib/server/models.ts`
    - `getAwsConfig()` lee las variables en cada llamada, considera vacío `undefined`, `''` o solo espacios, acumula todas las faltantes en el orden `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, sin región por defecto y sin devolver valores
    - Es el único archivo con `process.env.AWS_`
    - `models.ts`: `PRIMARY_MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0'`, `FALLBACK_MODEL_ID = 'us.amazon.nova-micro-v1:0'`, `INFERENCE_CONFIG`, `BEDROCK_DEADLINE_MS = 10_000`
    - _Requisitos: 1.2, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.6, 9.1_
  - [ ] 5.2 Implementar `lib/server/errors.ts` y `lib/server/bedrock.ts`
    - `errors.ts`: `isRetryableForFallback(e)` y `mapError(e)` según la tabla del diseño (AccessDenied, Throttling, ServiceQuotaExceeded y ValidationException de modelo reintentan; firma o token inválidos no reintentan)
    - `converseWithFallback`: `BedrockRuntimeClient` con credenciales explícitas y `maxAttempts: 1`, `ConverseCommand` sin streaming, exactamente un reintento con Nova Micro, `TIMEOUT` si `signal.aborted`, `EMPTY_RESPONSE` si el texto está vacío
    - Logs solo con `console.error('[agent]', code, err?.name, modelId)`
    - _Requisitos: 1.8, 9.1, 9.2, 9.6, 9.7, 9.8, 11.2, 11.7_
  - [x] 5.3 Implementar `lib/server/prompt.ts`
    - `SYSTEM_PROMPT` en español de México como copiloto del Centro de Movilidad CDMX: detectado + incorporación, acción del sistema, velocidad sugerida en km/h; fantasma = "vehículo sin conexión"; máximo 3 oraciones y 300 caracteres; autos por `description`; responder JSON `{message, action}`
    - Regla del prompt para `trigger === 'signal_miss'`: nombrar el semáforo, decir que no alcanza a pasar, soltar el acelerador, dar la velocidad sugerida exacta del evento y mencionar el ahorro de gasolina; el modelo no calcula números
    - `buildUserText(snapshot, command?, trigger?)` con contexto determinista: `ROAD_CONTEXT.name`, `nearestRamp` del último frenado y `suggestedSpeedKmh` (mínima del carril afectado, múltiplo de 5, en [20, 60]; 60 sin eventos); con `signal_miss` y `lastSignalMiss` no nulo agrega un bloque TRIGGER con nombre del semáforo, `suggestedKmh`, TTA y segundos de verde restantes; con `lastSignalMiss = null` se trata como `manual`
    - `parseModelOutput(raw, command?)`: primer bloque `{...}` con `JSON.parse`; si falla, texto crudo; `action` válida del JSON o, sin JSON válido, regex de desactivar primero y luego de activar; recorte a 2 oraciones y 300 caracteres
    - `enforceSignalMissMessage(message, kmh)`: si el mensaje no contiene `"{kmh} km/h"`, lo reemplaza según el diseño para que la cifra sea exacta
    - _Requisitos: 9.4, 10.4, 15.4, 15.5, 15.6, 18.3, 18.4_
  - [x] 5.4 Implementar `lib/server/validateRequest.ts`
    - `validateAgentRequest(rawBody)` con `NOT_JSON`, `MISSING_FIELD`, `WRONG_TYPE`, `TOO_LARGE` (cuerpo > 8192 + 2048 bytes o snapshot > 8192 bytes)
    - Type guards escritos a mano, sin zod; `detail` nombra el campo (por ejemplo `snapshot.cars[3].lane`)
    - `command` debe ser string y se recorta a 500 caracteres
    - `trigger` opcional: ausente o uno de `AGENT_TRIGGERS`; cualquier otro valor (otro string, número, `null`, objeto) es inválido → 400
    - Validar `snapshot.signal` (`name`, `color`, `remainingS`) y `snapshot.lastSignalMiss` (objeto con sus campos o `null`)
    - _Requisitos: 9.5, 10.3, 18.2, 18.5_
  - [ ] 5.5 Implementar `app/api/agent/route.ts`
    - Sin exports `runtime` ni `dynamic` (incompatibles con `cacheComponents: true` en Next.js 16); solo `export const maxDuration = 15`
    - `AbortController` de 10 s desde la recepción; 400 con `INVALID_REQUEST` y `detail`; 503 con `CONFIG_MISSING` y `missing`; 200 con `source: 'bedrock'` y `action`; 503 con `source: 'fallback'` y el `errorCode` correspondiente
    - Con `trigger === 'signal_miss'` y `lastSignalMiss` no nulo: en 200 aplica `enforceSignalMissMessage` y quita `action`; en fallback el `message` es `buildSignalMissFallback(suggestedKmh)`
    - Ninguna respuesta incluye credenciales, encabezados ni trazas del SDK
    - _Requisitos: 1.6, 1.7, 1.8, 2.5, 9.1, 9.3, 9.5, 9.6, 9.7, 9.8, 11.1, 11.2, 11.7, 12.6, 17.9, 18.4, 18.5_
  - [x] 5.6 Implementar `lib/agent/snapshot.ts`
    - `buildSnapshot(state, nowIso)` con `round1` (normaliza `-0`), autos ordenados por `id`, `speedKmh = v * 3.6`, últimos 5 eventos del más reciente al más antiguo, listas vacías cuando no hay elementos
    - Incluir `signal` (`name`, `color`, `remainingS` con 1 decimal) y `lastSignalMiss` (último de `signalMissEvents`, redondeado, o `null`)
    - `serializeSnapshot(s)` que recorta autos de flujo normal (nunca fantasmas) hasta ≤ 8192 bytes, con `totalCars` y `truncated`; lanza `SnapshotTooLargeError` si no puede
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 18.1_
  - [ ] 5.7 Implementar `lib/agent/agentClient.ts` y `lib/agent/askAgent.ts`
    - `requestAgent(snapshotJson, command?, trigger?)`: cuerpo armado como texto sin volver a serializar el snapshot, incluye `trigger`, `AbortController` de 15 s, fallback local con `buildLocalFallback` y `NETWORK_ERROR` ante error de red, abort o respuesta no JSON; 400 y 503 se devuelven tal cual
    - Con `trigger === 'signal_miss'`, todo fallback (local o `source: 'fallback'`) usa `buildSignalMissFallback(lastSignalMiss.suggestedKmh)`
    - `askAgent(command?, trigger?)`: `try/catch` sobre snapshot (si falla, `SNAPSHOT_ERROR`, sin fetch y sin tocar la simulación), `awaitingAgent`, `applyAgentResponse`, `speak(r.message)`; la simulación nunca espera la solicitud; "Pedir asistencia" usa `'manual'` y el micrófono `'voice'`
    - _Requisitos: 8.7, 10.1, 10.3, 10.10, 11.3, 11.4, 11.5, 11.8, 17.9, 18.2_
  - [ ]* 5.8 Verificación manual del servidor (Propiedades 11, 12, 23 y 24 del diseño)
    - `curl -X POST http://localhost:3000/api/agent -d "no-json"` → 400 `NOT_JSON`; snapshot sin `cars` → 400 `MISSING_FIELD`; `lane` como string → 400 `WRONG_TYPE`; cuerpo > 8 KB → 400 `TOO_LARGE`
    - Propiedad 24: snapshot válido con `"trigger": "otro"` (y con `"trigger": 5`) → 400 `INVALID_REQUEST` sin llamar a Bedrock; sin `trigger` o con `manual`/`voice`/`signal_miss` pasa la validación
    - Con `.env.local` vacío y servidor reiniciado: snapshot válido → 503 `CONFIG_MISSING` con `missing` en orden y sin valores
    - Propiedad 23: con `.env.local` vacío y `trigger: 'signal_miss'`, el mensaje es exactamente "No alcanzas el semáforo de Eje Central. Suelta el acelerador y mantén N km/h para llegar en verde."; con credenciales, el mensaje contiene "N km/h" del evento
    - Con credenciales reales: 200 con `source: 'bedrock'` y un auto mencionado por descripción
    - Buscar con grep `AWS_ACCESS_KEY_ID` en `app/` y `lib/`: solo aparece en `lib/server/config.ts`; buscar los valores de las credenciales en respuestas (DevTools) y en la terminal: cero coincidencias
    - _Requisitos: 1.7, 1.8, 2.1, 2.3, 9.3, 9.5, 9.7, 11.1, 11.6, 17.9, 18.3, 18.4, 18.5_
  - [ ] 5.9 Implementar `hooks/useSignalMissAgent.ts` y montarlo en `app/page.tsx` (después de 5.7 y 3.3)
    - Se suscribe a `pendingSignalMiss`; en el efecto llama siempre a `clearPendingSignalMiss()`; si `awaitingAgent` es verdadero no envía nada; si no, `void askAgent(undefined, 'signal_miss')`
    - La red sale de un efecto de React, fuera de `requestAnimationFrame`, del store y del motor
    - Montar `useSignalMissAgent()` una sola vez en `app/page.tsx`; coordinar con el Integrante 3 (tarea 7.5) para conservar la llamada
    - _Requisitos: 6.8, 17.8_

- [ ] 6. Checkpoint: módulo de servidor y Bedrock
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 7. Módulo de UI — ⏱ 45 min — Responsable: Integrante 3 UI
  - [ ] 7.1 Implementar `components/road/LaneCanvas.tsx`
    - SVG `viewBox="0 0 300 600"`, 3 carriles de 100 unidades con 2 líneas divisorias discontinuas, sin mapas ni imágenes
    - `cx = lane * 100 + 50`, `cy = 600 - (y / 200) * 600`; `<rect>` de 40×24 con esquinas redondeadas
    - Fondo `asphalt`, divisorias `asphalt-line`; rojo `#ef4444` si `accel <= -3`; si no, `signal-white` (normal) o `#a78bfa` (fantasma); fantasmas con contorno blanco discontinuo y `opacity=0.85`
    - Marcas horizontales con nombre para cada incorporación de `ROAD_CONTEXT.ramps`
    - Línea de alto en Y = 200 m (parte superior del SVG) y semáforo pequeño verde o rojo según `store.signal.color`, con los segundos restantes (`remainingS`) y la etiqueta "Semáforo Eje Central"
    - Auto_Usuario (`resolveUserCarId(world, selectedCarId)`) con contorno `semovi-green-light` y etiqueta "TÚ"
    - `onPointerDown` llama a `selectCar(id)`; contorno amarillo para el seleccionado
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.10, 15.3, 15.7_
  - [ ] 7.2 Implementar `components/speedometer/Speedometer.tsx`
    - Tarjeta fija arriba: "Vía: {ROAD_CONTEXT.name}", sentido y tramo
    - Muestra el auto `resolveUserCarId(world, selectedCarId)`: con selección, su descripción; sin selección (o si el seleccionado ya no existe), "Tu auto: Honda Fit azul" (descripción de `c02`); ya no existe el estado "Sin selección"; si devuelve `null`, muestra "—"
    - `Math.round(speed * 3.6)` km/h con arco SVG de 0 a 100 km/h
    - Onda Verde activa (`greenWaveTargetMs != null`): badge verde "Onda Verde: N km/h" con `N = Math.round(greenWaveTargetMs * 3.6)` y marca en el arco en N
    - Debajo, una línea con el estado del semáforo (color y segundos restantes)
    - _Requisitos: 7.5, 7.6, 7.7, 15.1, 16.7, 17.7_
  - [ ] 7.3 Implementar `components/controls/ControlsPanel.tsx`
    - Botones siempre visibles: "Iniciar"/"Pausar" según `status`, "Inyectar caos", "Reiniciar", "Amortiguador: activado"/"Amortiguador: desactivado", "Pedir asistencia" (deshabilitado con `awaitingAgent`, llama a `askAgent(undefined, 'manual')`)
    - Mostrar el contador de frenados bruscos (`brakeEvents.length`) para comparar con y sin amortiguador
    - _Requisitos: 4.7, 5.2, 5.3, 5.5, 7.8, 8.1, 18.2_
  - [ ] 7.4 Implementar `components/messages/MessagePanel.tsx`
    - Muestra `lastMessage.text` o `FALLBACK_MESSAGES.NO_MESSAGES`
    - Badge ámbar "Modo sin IA" cuando `noAiMode` es verdadero
    - Muestra `simulationError` si existe
    - _Requisitos: 6.7, 7.9, 11.4, 11.9_
  - [ ] 7.5 Componer `app/page.tsx`, `app/layout.tsx` y `app/globals.css`
    - `page.tsx` (componente cliente) monta `useSimulationLoop()` y `useSignalMissAgent()` (este último lo agrega 5.9; no quitarlo) y compone LaneCanvas, Speedometer, ControlsPanel y MessagePanel con Tailwind, controles siempre visibles en escritorio y móvil
    - Encabezado "Copiloto de Movilidad CDMX" en `semovi-green-dark`, fondo `asphalt-dark`, botones `semovi-green` (tokens del bloque `@theme` de `globals.css`)
    - `layout.tsx` con metadata en español y `themeColor` `#0b4d3c` (revisar en `node_modules/next/dist/docs/` dónde va `themeColor` en Next.js 16)
    - _Requisitos: 6.4, 7.8, 12.6, 15.7, 17.8_
  - [ ]* 7.6 Verificación manual de la UI (Propiedades 13, 14 y 16 del diseño)
    - Con caos, los autos con `accel <= -3` se ven rojos y los fantasmas se distinguen sin interacción
    - Sin selección, el velocímetro muestra "Tu auto: Honda Fit azul" y el lienzo marca ese auto con "TÚ"; seleccionar otro auto y comprobar km/h; presionar "Reiniciar" con un fantasma seleccionado y ver de nuevo "Tu auto: Honda Fit azul"
    - El semáforo del lienzo cambia de verde a rojo cada 15 s con su contador y la fila se detiene en la línea
    - Cuando el Auto_Usuario no alcanza el verde aparece "Onda Verde: N km/h" con la marca en el arco y se lee el mensaje del semáforo
    - Con `.env.local` vacío, "Pedir asistencia" muestra el badge; con credenciales, el badge desaparece
    - _Requisitos: 7.3, 7.4, 7.5, 7.6, 7.7, 7.10, 11.4, 11.9, 17.7, 17.8_

- [ ] 8. Checkpoint: módulo de UI
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 9. Módulo de voz — ⏱ 25 min — Responsable: Integrante 4 Voz/Demo
  - [x] 9.1 Implementar `lib/voice/speech.ts`
    - `isSpeechSynthesisSupported()`; `speak(text)` no hace nada si no hay soporte (sin error)
    - `speechSynthesis.cancel()` antes de cada lectura, `lang = 'es-MX'`, voz `es-MX` o la primera `es*`
    - _Requisitos: 10.1, 10.7, 10.8_
  - [x] 9.2 Implementar `lib/voice/recognition.ts`
    - Tipo mínimo `SpeechRecognitionLike`; `getRecognitionCtor()` con `SpeechRecognition ?? webkitSpeechRecognition`
    - `startListening({ onFinal, onFail, onEnd })` con `lang = 'es-MX'`, `continuous = false`, `interimResults = false`, `maxAlternatives = 1`
    - Transcripción final con texto: `stop()` y `onFinal(transcript.slice(0, 500))`; errores `not-allowed` → `denied`, `no-speech` → `no-speech`, otro → `error`; fin sin transcripción → `onFail('empty')`; siempre `onEnd()`
    - _Requisitos: 10.2, 10.3, 10.9_
  - [ ] 9.3 Implementar `components/voice/MicButton.tsx` y agregarlo a `app/page.tsx`
    - Estados `idle`, `listening`, `unsupported`; sin soporte: botón deshabilitado y texto "Reconocimiento de voz no disponible en este navegador"
    - En `listening`: punto rojo pulsante y "Escuchando…"; un segundo clic no abre otra sesión
    - `onFinal` → `askAgent(text, 'voice')`; `onFail` → `setLocalMessage(VOICE_CAPTURE_ERROR, false)` sin solicitud; `onEnd` → `idle`
    - _Requisitos: 10.2, 10.3, 10.6, 10.9, 10.10, 18.2_
  - [ ]* 9.4 Verificación manual de la voz (Propiedad 15 del diseño)
    - Decir "desactivar amortiguador" y "activar amortiguador": la etiqueta cambia y se lee la respuesta en es-MX
    - Denegar el permiso del micrófono: aparece el mensaje de captura fallida y el botón queda habilitado
    - Pedir asistencia dos veces seguidas: nunca se leen dos mensajes a la vez
    - Con DevTools en "Offline": el fallback local menciona descripción y carril del último frenado y el amortiguador no cambia
    - _Requisitos: 10.1, 10.4, 10.5, 10.8, 10.9, 10.10, 10.11, 11.3_

- [ ] 10. Checkpoint: módulo de voz
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 11. Módulo PWA — ⏱ 15 min — Responsable: Integrante 3 UI
  - [x] 11.1 Implementar `app/manifest.ts` y los íconos
    - `name: 'Agente de Micro-Flujo CDMX'`, `short_name: 'MicroFlujo'`, `start_url: '/'`, `display: 'standalone'`, `theme_color` `#0b4d3c` y `background_color` `#1c1f22`
    - Íconos PNG `public/icons/icon-192.png` (192×192) y `public/icons/icon-512.png` (512×512)
    - _Requisitos: 12.1, 12.3_
  - [ ] 11.2 Implementar `public/sw.js` y `components/pwa/ServiceWorkerRegister.tsx`, y montarlo en `app/layout.tsx`
    - `sw.js` con `install` → `skipWaiting`, `activate` → `clients.claim`, `fetch` → `respondWith(fetch(e.request))`, sin Cache API
    - Registrar `/sw.js` en `useEffect` solo si `'serviceWorker' in navigator` y `window.isSecureContext`
    - _Requisitos: 12.2, 12.3_
  - [ ]* 11.3 Verificación manual de la PWA
    - DevTools → Application → Manifest sin errores; Service Workers activo; Cache Storage vacío
    - Lighthouse marca la app como instalable en `localhost`
    - _Requisitos: 12.1, 12.2, 12.3_

- [ ] 12. Checkpoint: módulo PWA
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 13. Módulo de documentación: README, guion de demo y checklist manual — ⏱ 25 min — Responsable: Integrante 4 Voz/Demo
  - [ ] 13.1 Completar las secciones técnicas del `README.md`
    - Descripción; Arquitectura híbrida con diagrama simplificado; Requisitos previos (Node.js ≥ 20.9, mínimo de Next.js 16; npm ≥ 10; Chrome ≥ 120; cuenta de AWS con Bedrock)
    - Clonación, Ejecución local y Despliegue en Vercel con cada comando en un bloque copiable y en orden
    - Configuración de `.env.local`: tabla con variable, propósito, obligatoria y valor ficticio (`AKIAXXXXEXAMPLE`); nota sobre habilitar Claude 3.5 Haiku y Amazon Nova Micro en us-east-1 y sobre `lib/server/models.ts`
    - Modo sin IA: qué lo activa, qué sigue funcionando (incluido el mensaje determinista del semáforo), qué se desactiva y cómo se ve (badge)
    - Roles del equipo con la ruta del módulo de cada integrante
    - _Requisitos: 12.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9_
  - [ ] 13.2 Escribir el guion de demostración y el checklist de pruebas manuales en el `README.md`
    - Guion paso a paso: iniciar, inyectar caos sin amortiguador, pedir asistencia, comando de voz "activar amortiguador", repetir caos y comparar el contador; escena del semáforo: la fila se detiene en rojo en Eje Central, el Honda Fit azul ("TÚ") no alcanza el verde, aparece "Onda Verde: N km/h" y se escucha la instrucción del copiloto
    - Encabezado del checklist: Chrome de escritorio (última estable) en laptop, instalación de PWA en Chrome de escritorio (y Chrome para Android si hay tiempo), tiempo estimado ~10 min
    - 8 ítems (inicio, caos, amortiguador, asistencia, voz, Modo sin IA, instalación PWA, Onda Verde / semáforo), cada uno con precondición, 1 a 5 pasos numerados, resultado visible y casilla `- [ ]`, según la tabla del diseño
    - _Requisitos: 14.1, 14.2, 14.3, 14.4_

- [ ] 14. Checkpoint: módulo de documentación
  - Detenerse, resumir lo hecho y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

- [ ] 15. Integración final, build y despliegue en Vercel — ⏱ 35 min — Responsable: todo el equipo (lidera Integrante 1 AWS)
  - [ ] 15.1 Conectar `window.__sim.snapshot()` y revisar las reglas de dependencias
    - `snapshot()` devuelve el JSON de `serializeSnapshot(buildSnapshot(...))` y su tamaño en bytes; confirmar que incluye `signal` y `lastSignalMiss`
    - Confirmar que `lib/physics` no importa React, store ni red; que `lib/server` solo lo importa `app/api`; que ningún componente cliente importa `lib/server`; que la única red del semáforo sale de `useSignalMissAgent`
    - _Requisitos: 1.2, 6.8, 8.4, 8.5, 17.8, 18.1_
  - [ ] 15.2 Ejecutar `npm run build` y corregir errores
    - El build termina con código 0 y sin errores de TypeScript (también confirma que `server-only` no se filtró al cliente)
    - grep final: sin claves, secretos ni tokens en archivos versionados; `AWS_ACCESS_KEY_ID` solo en `lib/server/config.ts`, `.env.example` y `README.md`; sin restos de `missed_light`, `MissedLightEvent` ni `buildGreenWaveFallback`
    - _Requisitos: 1.2, 2.1, 12.7, 13.8_
  - [ ] 15.3 Desplegar en Vercel
    - Configurar `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION=us-east-1` en el proyecto de Vercel (sin `NEXT_PUBLIC_`)
    - Confirmar que `app/api/agent/route.ts` no exporta `runtime` ni `dynamic` (solo `maxDuration = 15`)
    - Desplegar con `npx vercel --prod` (o conectando el repo de GitHub) sin cambios de código
    - Comprobar que la página principal carga por HTTPS y que `POST /api/agent` responde
    - _Requisitos: 1.3, 12.3, 12.5, 12.6_
  - [ ]* 15.4 Ejecutar el checklist completo del README sobre la URL de producción
    - Los 8 ítems en Chrome de escritorio, incluidas la instalación de la PWA en ventana `standalone` y la Onda Verde / semáforo
    - Ensayar el guion de demo una vez, incluida la escena del semáforo
    - _Requisitos: 12.3, 13.9, 14.1, 14.4_

- [ ] 16. Checkpoint final
  - Detenerse, resumir lo hecho, confirmar que `npm run build` pasa y que la URL de Vercel funciona, y preguntar al usuario: "¿Avanzamos al siguiente módulo o hacemos ajustes?"

## Notes

- Las sub-tareas marcadas con `*` son verificaciones manuales opcionales; se pueden saltar si el tiempo aprieta, pero se recomienda hacer al menos 5.8 y 15.4 antes de la demo.
- No hay pruebas automatizadas ni librerías de PBT (Req. 14.5). Las propiedades del diseño se comprueban con `window.__sim`, `curl`, `npm run build` y DevTools.
- Next.js 16 tiene cambios incompatibles: leer `node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`). `route.ts` no exporta `runtime` ni `dynamic`. Tailwind 4 declara los tokens en `@theme` de `app/globals.css`. Node.js ≥ 20.9.
- Orden fuera de numeración: 3.6 (`lib/physics/signal.ts`) se ejecuta antes de 3.2; 5.9 (`useSignalMissAgent`) después de 5.7 y 3.3. El grafo de abajo ya refleja ese orden.
- Los stubs de la tarea 1.3 permiten que cada integrante trabaje en paralelo; cada uno reemplaza solo los archivos de su carpeta. La tarea 1.4 actualiza los stubs afectados por los contratos nuevos para que el build no se rompa.
- Archivos compartidos con más de un dueño: `app/page.tsx` (I1 monta `useSignalMissAgent` en 5.9, I3 compone en 7.5, I4 agrega MicButton en 9.3), `app/layout.tsx` (I3 en 7.5 y 11.2), `app/globals.css` (tokens en 1.4, estilos en 7.5), `README.md` (I1 en 1.2, I4 en 13.1 y 13.2). Coordinar el orden de commits para evitar conflictos.
- Cada tarea referencia criterios de aceptación concretos de `requirements.md` para trazabilidad.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["1.5", "3.1", "3.6", "5.1", "5.3", "5.4", "5.6", "9.1", "9.2", "11.1"] },
    { "id": 4, "tasks": ["3.2", "5.2", "13.1"] },
    { "id": 5, "tasks": ["3.3", "5.5"] },
    { "id": 6, "tasks": ["3.4", "5.7", "7.1", "7.2", "7.4"] },
    { "id": 7, "tasks": ["3.5", "5.9", "7.3"] },
    { "id": 8, "tasks": ["5.8", "7.5"] },
    { "id": 9, "tasks": ["7.6", "9.3", "11.2"] },
    { "id": 10, "tasks": ["9.4", "11.3", "13.2", "15.1"] },
    { "id": 11, "tasks": ["15.2"] },
    { "id": 12, "tasks": ["15.3"] },
    { "id": 13, "tasks": ["15.4"] }
  ]
}
```
