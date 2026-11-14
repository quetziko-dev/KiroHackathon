# Requirements Document

## Introduction

"Agente Inteligente de Micro-Flujo y Asistencia Vial" es un MVP para el hackathon de AWS Community Day (límite total de 150 minutos, equipo de 4 personas). La aplicación simula el tráfico de una vía rápida de la Ciudad de México (estilo Periférico) con 3 carriles. Su objetivo es amortiguar el "efecto acordeón" (embotellamientos fantasma), que se origina cuando un automóvil frena de golpe y la onda de choque se propaga hacia atrás.

El sistema usa un modelo híbrido:
- **Física determinista en el cliente**: TypeScript ejecutado en el navegador a 60 fps mediante `requestAnimationFrame`, con estado en un store de Zustand.
- **Orquestación con AWS Bedrock**: una sola llamada sin streaming (Converse/InvokeModel) desde un Route Handler de Next.js. La llamada recibe un snapshot JSON del estado del tráfico y devuelve texto para comunicación humana (por ejemplo: "El Honda Fit azul pide paso...") o la interpretación de un comando de voz.

La interfaz es una visualización abstracta en Canvas/SVG (sin mapas) con un velocímetro. Se usa la Web Speech API del navegador para síntesis de voz y reconocimiento de comandos. La aplicación es una PWA instalable (sin soporte offline), se ejecuta en local y se despliega en Vercel. El repositorio debe quedar listo para GitHub.

Fuera de alcance: clima, pendientes, mapas reales, modo offline, streaming de respuestas, pruebas basadas en propiedades (solo pruebas manuales de UI) y vehículos distintos de automóviles.

## Glossary

- **Aplicación**: la aplicación web Next.js (App Router + TypeScript + Tailwind) completa, incluyendo cliente y servidor.
- **Motor_Fisico**: módulo TypeScript del cliente que calcula la cinemática de los automóviles en cada cuadro de animación.
- **Store_Trafico**: store de Zustand que contiene el estado de la simulación (automóviles, carriles, estado de reproducción y mensajes).
- **Bucle_Simulacion**: hook del cliente que invoca al Motor_Fisico mediante `requestAnimationFrame` y actualiza el Store_Trafico.
- **Automovil**: entidad simulada con identificador, descripción legible (marca, modelo y color), posición Y (metros a lo largo de la vía), carril X ∈ {0, 1, 2}, velocidad (m/s) y aceleración (m/s²).
- **Auto_Fantasma**: Automovil sintético inyectado para provocar frenados bruscos y caos durante la demostración.
- **Frenado_Brusco**: evento de acelerómetro simulado con desaceleración de -0.6 G (≈ -5.88 m/s²).
- **Onda_Choque**: propagación hacia atrás de desaceleraciones entre automóviles consecutivos del mismo carril, causada por un Frenado_Brusco.
- **Amortiguador**: lógica determinista del Motor_Fisico que suaviza la desaceleración de los automóviles que siguen a uno que frena, para reducir la Onda_Choque.
- **Snapshot_Trafico**: objeto JSON serializado con el estado actual relevante del Store_Trafico que se envía al Endpoint_Agente.
- **Endpoint_Agente**: Route Handler de Next.js (servidor) que recibe un Snapshot_Trafico y, opcionalmente, un comando de voz transcrito, y realiza una única llamada a Bedrock.
- **Cliente_Bedrock**: módulo del servidor que invoca AWS Bedrock (región us-east-1) con el modelo principal Claude 3.5 Haiku y el modelo de respaldo Amazon Nova Micro.
- **Validador_Config**: módulo centralizado del servidor que valida las variables de entorno requeridas.
- **Lienzo_Carriles**: componente de UI en Canvas/SVG que dibuja los 3 carriles y los automóviles.
- **Velocimetro**: componente de UI que muestra la velocidad del Automovil seleccionado.
- **Modulo_Voz**: módulo del cliente que usa la Web Speech API (`speechSynthesis` para lectura y `SpeechRecognition` para comandos de voz).
- **Mensaje_Asistencia**: texto en español devuelto por el Endpoint_Agente para leerse al usuario.
- **Mensaje_Respaldo**: texto en español predefinido que la Aplicación usa cuando Bedrock no está disponible.
- **Semaforo**: nodo fijo al final del tramo (Y = 200 m), llamado "Semáforo de Eje Central", con un ciclo determinista de 15 s en verde y 15 s en rojo calculado a partir del tiempo de simulación (verde si simTime mod 30 < 15). El nombre, la posición y las duraciones se definen en el módulo de datos de la vía (Requisito 15).
- **Auto_Usuario**: el Automovil seleccionado; si no hay selección, el Automovil de flujo normal "Honda Fit azul" (`c02`).
- **TTA** (tiempo de llegada): (200 m − posición Y) / velocidad, en segundos; infinito si la velocidad es 0.
- **Semaforo_Perdido**: evento que se registra cuando el Semaforo está en verde y el tiempo restante de verde es menor que el TTA del Auto_Usuario.
- **Onda_Verde**: velocidad sugerida para que el Auto_Usuario llegue a la línea de alto justo cuando el Semaforo vuelva a verde.

## Requirements

### Requirement 1: Configuración segura de credenciales

**User Story:** Como integrante del equipo, quiero clonar el repositorio e inyectar mis propias credenciales de AWS sin modificar código, para poder ejecutar la Aplicación en mi máquina de forma segura.

#### Acceptance Criteria

1. THE Aplicación SHALL incluir en el repositorio un archivo `.env.example` que contenga exclusivamente las variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION`, una por línea, todas con valor vacío.
2. THE Aplicación SHALL leer las credenciales de AWS únicamente desde código del servidor (Route Handlers y módulos importados por estos), sin que ningún componente ejecutado en el navegador importe dichos módulos ni acceda a dichas variables.
3. THE Aplicación SHALL nombrar las variables de credenciales de AWS sin el prefijo `NEXT_PUBLIC_`.
4. THE Aplicación SHALL incluir un archivo `.gitignore` que excluya como mínimo `.env.local`, `.env*.local`, `node_modules`, `.next`, `.vercel`, los directorios de build `out` y `build`, los archivos de sistema operativo `.DS_Store` y `Thumbs.db`, y los directorios de editor `.vscode` e `.idea`, sin excluir `.env.example`.
5. WHEN un integrante copia `.env.example` a `.env.local`, asigna valores a las tres variables e inicia o reinicia el servidor de la Aplicación, THE Aplicación SHALL usar esas credenciales en las llamadas a AWS sin requerir cambios en el código fuente.
6. WHEN un Route Handler que requiere AWS recibe una solicitud, THE Validador_Config SHALL verificar que `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION` estén definidas y no vacías antes de realizar cualquier llamada a AWS.
7. IF una o más de las variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` o `AWS_REGION` no están definidas o están vacías, THEN THE Validador_Config SHALL detener la solicitud sin llamar a AWS y devolver una respuesta de error que indique los nombres de las variables faltantes, sin incluir el valor de ninguna variable.
8. THE Aplicación SHALL excluir los valores de `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` de toda respuesta enviada al navegador, de todo mensaje de error y de toda salida de registro (logs).

### Requirement 2: Validación centralizada de configuración

**User Story:** Como Arquitecto/AWS, quiero que la configuración se valide en un único lugar, para detectar credenciales faltantes antes de llamar a Bedrock.

#### Acceptance Criteria

1. THE Validador_Config SHALL ser el único módulo del servidor que lea `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION` desde las variables de entorno, de modo que una búsqueda de esos tres nombres en el código del servidor solo devuelva coincidencias dentro del Validador_Config.
2. WHEN el Endpoint_Agente recibe una solicitud, THE Validador_Config SHALL verificar, antes de cualquier llamada a Bedrock, que `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION` tengan valores no vacíos, considerando vacío un valor ausente, de longitud 0 o compuesto solo por espacios en blanco.
3. IF una o más variables requeridas están vacías o ausentes, THEN THE Validador_Config SHALL devolver un resultado de error que liste los nombres de todas las variables faltantes (no solo la primera), en el orden `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, sin incluir ningún valor ni fragmento de credencial.
4. IF `AWS_REGION` está vacía o ausente, THEN THE Validador_Config SHALL incluirla en la lista de variables faltantes y no SHALL sustituirla por ninguna región por defecto.
5. IF el Validador_Config devuelve un resultado de error, THEN THE Endpoint_Agente SHALL omitir la llamada a Bedrock y responder a la solicitud con un mensaje de error que indique configuración incompleta e incluya los nombres de las variables faltantes, sin valores de credenciales.
6. WHEN las tres variables requeridas tienen valores no vacíos, THE Validador_Config SHALL devolver un resultado exitoso con los tres valores al Endpoint_Agente, y THE Endpoint_Agente SHALL continuar con la llamada a Bedrock usando exclusivamente esos valores.

### Requirement 3: Simulación cinemática de automóviles

**User Story:** Como responsable de Física, quiero un motor cinemático simple y determinista, para que la simulación corra en el navegador en milisegundos por cuadro.

#### Acceptance Criteria

1. THE Motor_Fisico SHALL representar cada Automovil únicamente con los siguientes atributos: identificador único, descripción legible de 1 a 50 caracteres, posición Y en metros dentro del rango de 0 m a 200 m (longitud del tramo visible de la vía), carril X ∈ {0, 1, 2}, velocidad en m/s y aceleración en m/s² dentro del rango de -5.88 m/s² (-0.6 G) a +3.0 m/s².
2. WHEN el Bucle_Simulacion ejecuta un cuadro con un intervalo de tiempo Δt expresado en segundos, THE Motor_Fisico SHALL actualizar primero la velocidad de cada Automovil como velocidad + aceleración × Δt y después la posición Y como Y + velocidad × Δt, usando la velocidad ya actualizada y limitada según el criterio 3.
3. WHEN el Motor_Fisico calcula una velocidad nueva para un Automovil, THE Motor_Fisico SHALL limitar esa velocidad al rango de 0 m/s a 27.8 m/s (100 km/h). Las velocidades menores que 0 m/s se fijan en 0 m/s y las mayores que 27.8 m/s se fijan en 27.8 m/s.
4. WHEN el Motor_Fisico recibe el mismo estado inicial de todos los Automovil y la misma secuencia de valores Δt, THE Motor_Fisico SHALL producir valores idénticos de posición Y, carril X, velocidad y aceleración para cada Automovil en cada cuadro, sin usar fuentes de aleatoriedad ni el reloj del sistema.
5. WHEN la posición Y de un Automovil alcanza o supera 200 m (final del tramo visible de la vía) y el Semaforo está en verde o el Automovil está exento por el dilema de la luz ámbar (Requisito 16, criterio 4), THE Motor_Fisico SHALL reposicionar ese Automovil en Y = posición Y − 200 m en el mismo carril X, conservando su velocidad y su aceleración.
6. IF el intervalo Δt de un cuadro excede 0.1 s (100 ms), THEN THE Motor_Fisico SHALL usar Δt = 0.1 s para ese cuadro.
7. WHILE la distancia entre un Automovil y el Automovil que lo precede en el mismo carril X sea menor que 8 m, THE Motor_Fisico SHALL aplicar a ese Automovil una aceleración de -5.88 m/s² (-0.6 G). El Automovil que lo precede es el Automovil más cercano del mismo carril con una posición Y mayor.
8. WHEN la distancia entre un Automovil en frenado según el criterio 7 y el Automovil que lo precede vuelve a ser igual o mayor que 8 m, THE Motor_Fisico SHALL restablecer la aceleración que ese Automovil tenía antes de empezar a frenar.
9. IF el intervalo Δt de un cuadro es menor o igual que 0 s o no es un número finito, THEN THE Motor_Fisico SHALL dejar sin cambios el estado de todos los Automovil durante ese cuadro.
10. WHILE el Semaforo está en rojo, THE Motor_Fisico SHALL mantener la posición Y de cada Automovil no exento por el dilema de la luz ámbar (Requisito 16, criterio 4) por debajo de 200 m; si el cálculo del cuadro la lleva a 200 m o más, THE Motor_Fisico SHALL fijar ese Automovil en Y = 199.9 m con velocidad 0 m/s.

### Requirement 4: Frenado brusco y efecto acordeón

**User Story:** Como presentador de la demo, quiero que los autos fantasma provoquen frenados bruscos visibles, para mostrar el efecto acordeón que el agente debe mitigar.

#### Acceptance Criteria

1. WHEN se dispara un Frenado_Brusco sobre un Automovil, THE Motor_Fisico SHALL asignar a ese Automovil una aceleración de -5.88 m/s² (-0.6 G) durante 2.0 segundos de tiempo de simulación o hasta que su velocidad llegue a 0 m/s, lo que ocurra primero, y después restablecer su aceleración a 0 m/s².
2. THE Motor_Fisico SHALL mantener la velocidad de cada Automovil en un valor mayor o igual a 0 m/s durante cualquier frenado, sin permitir movimiento en reversa.
3. WHEN un Automovil registra un Frenado_Brusco, THE Store_Trafico SHALL registrar un evento con el identificador del Automovil, el carril (0, 1 o 2), la posición Y en metros y la marca de tiempo de la simulación en segundos, y conservar como máximo los 500 eventos más recientes, descartando primero el más antiguo.
4. WHILE el Amortiguador está desactivado, WHEN la distancia entre un Automovil y el Automovil que lo precede en el mismo carril baja de 8 m y el precedente está en Frenado_Brusco, THE Motor_Fisico SHALL aplicar al Automovil seguidor un Frenado_Brusco de -5.88 m/s², de modo que el frenado se propague carril atrás como Onda_Choque.
5. WHILE el Amortiguador está activado, WHEN un Automovil en Frenado_Brusco tiene un Automovil seguidor en el mismo carril a 30 m o menos, THE Motor_Fisico SHALL aplicar a ese seguidor una desaceleración de magnitud entre 0.5 m/s² y 2.94 m/s² (0.3 G), sin registrarla como Frenado_Brusco, mientras la distancia al precedente sea mayor de 8 m.
6. IF, con el Amortiguador activado, la distancia de un Automovil seguidor a su precedente en el mismo carril baja de 8 m, THEN THE Motor_Fisico SHALL aplicar a ese seguidor un Frenado_Brusco de -5.88 m/s² y THE Store_Trafico SHALL registrar el evento según el criterio 3.
7. WHEN el usuario activa o desactiva el Amortiguador desde la UI, THE Store_Trafico SHALL actualizar el estado del Amortiguador en el siguiente cuadro de simulación, sin reiniciar las posiciones, velocidades ni el registro de eventos de los Automovil existentes.

### Requirement 5: Datos sintéticos de la demostración

**User Story:** Como presentador de la demo, quiero un escenario precargado con flujo normal y autos fantasma, para reproducir el caos de forma confiable frente al jurado.

#### Acceptance Criteria

1. WHEN la simulación se inicializa, THE Store_Trafico SHALL cargar exactamente 10 Automovil con flujo normal, distribuidos 4 en el carril 0, 3 en el carril 1 y 3 en el carril 2, cada uno con una descripción visible que incluya marca, modelo y color como textos no vacíos.
2. WHEN el usuario presiona el control "Inyectar caos" y no hay Auto_Fantasma en la simulación, THE Store_Trafico SHALL agregar exactamente 2 Auto_Fantasma en carriles y posiciones tomados de datos fijos, de modo que la simulación quede con 12 vehículos en total.
3. IF el usuario presiona el control "Inyectar caos" mientras ya hay Auto_Fantasma en la simulación, THEN THE Store_Trafico SHALL mantener la cantidad de Auto_Fantasma en 2 sin agregar vehículos.
4. WHEN un Auto_Fantasma ha sido inyectado, THE Motor_Fisico SHALL disparar un Frenado_Brusco en ese Auto_Fantasma dentro de los 3 segundos de simulación posteriores a la inyección, para cada uno de los 2 Auto_Fantasma.
5. WHEN el usuario presiona el control "Reiniciar", THE Store_Trafico SHALL eliminar todos los Auto_Fantasma y restaurar los 10 Automovil a los mismos carriles, posiciones, velocidades y descripciones del estado inicial, en cualquier estado en que esté la simulación, incluso con un Frenado_Brusco en curso.
6. THE Store_Trafico SHALL generar el estado inicial y los 2 Auto_Fantasma inyectados a partir de datos fijos sin valores aleatorios, de modo que dos ejecuciones consecutivas de "Reiniciar" seguido de "Inyectar caos" produzcan carriles, posiciones, velocidades y descripciones idénticos.

### Requirement 6: Bucle de simulación a 60 fps

**User Story:** Como responsable de Física, quiero que el bucle de simulación corra a 60 fps en el cliente, para que la animación sea fluida durante la demo.

#### Acceptance Criteria

1. WHILE la simulación está en estado "en ejecución", THE Bucle_Simulacion SHALL invocar al Motor_Fisico exactamente una vez en cada callback de `requestAnimationFrame`, pasándole el tiempo transcurrido desde el cuadro anterior, con un máximo de 50 ms por cuadro (si pasaron más de 50 ms, usa 50 ms).
2. WHILE la simulación está en estado "pausada", THE Bucle_Simulacion SHALL dejar de invocar al Motor_Fisico y conservar sin cambios la posición y la velocidad de todos los automóviles.
3. WHEN la simulación pasa de "pausada" a "en ejecución", THE Bucle_Simulacion SHALL medir el tiempo del primer cuadro desde el momento de la reanudación, de modo que el tiempo en pausa no se sume a ese cuadro.
4. WHEN el componente que aloja el Bucle_Simulacion se desmonta, THE Bucle_Simulacion SHALL cancelar el `requestAnimationFrame` pendiente y no volver a invocar al Motor_Fisico.
5. THE Motor_Fisico SHALL calcular un cuadro con 12 automóviles en menos de 4 ms de promedio, medido sobre 600 cuadros consecutivos en el equipo de escritorio usado en la demo.
6. WHILE la simulación está en estado "en ejecución" con entre 1 y 12 automóviles, THE Bucle_Simulacion SHALL mantener al menos 55 cuadros por segundo de promedio durante una ventana de 10 segundos en el equipo de escritorio usado en la demo.
7. IF el Motor_Fisico lanza un error durante el cálculo de un cuadro, THEN THE Bucle_Simulacion SHALL pasar la simulación al estado "pausada", conservar la posición y la velocidad del último cuadro válido y mostrar un mensaje de error que indique que la simulación se detuvo.
8. THE Bucle_Simulacion SHALL ejecutar la física sin hacer llamadas de red, lo que se verifica con cero solicitudes de red originadas por el Bucle_Simulacion o el Motor_Fisico durante 60 segundos de simulación en estado "en ejecución".

### Requirement 7: Visualización de carriles y velocímetro

**User Story:** Como responsable de UI, quiero una vista abstracta de 3 carriles con un velocímetro, para que el jurado entienda el efecto acordeón de un vistazo.

#### Acceptance Criteria

1. THE Lienzo_Carriles SHALL dibujar exactamente 3 carriles verticales paralelos de igual ancho, separados por líneas divisorias visibles, usando solo formas geométricas (Canvas o SVG) y sin mapas, mosaicos ni imágenes satelitales.
2. WHEN el Store_Trafico cambia, THE Lienzo_Carriles SHALL redibujar en menos de 100 ms cada Automovil dentro de los límites horizontales de su carril (0, 1 o 2) y a una posición vertical proporcional a su posición Y en la vía, de modo que un Automovil más adelantado en la vía aparezca más arriba en el lienzo.
3. WHILE un Automovil tiene aceleración menor o igual a -3 m/s², THE Lienzo_Carriles SHALL dibujar ese Automovil en color rojo; WHILE su aceleración es mayor que -3 m/s², THE Lienzo_Carriles SHALL dibujarlo en un color distinto del rojo.
4. THE Lienzo_Carriles SHALL dibujar cada Auto_Fantasma con al menos un atributo visual (forma, contorno u opacidad) diferente del usado para los automóviles de flujo normal, de modo que se distinga sin interacción del usuario.
5. WHEN el usuario hace clic o toca un Automovil en el Lienzo_Carriles, THE Velocimetro SHALL mostrar la velocidad de ese Automovil en km/h redondeada a número entero (velocidad en m/s × 3.6) y SHALL actualizar ese valor con cada cambio del Store_Trafico mientras ese Automovil siga seleccionado.
6. WHILE ningún Automovil está seleccionado, THE Velocimetro SHALL mostrar la velocidad del Auto_Usuario (Requisito 17), con una etiqueta que lo identifique como "Tu auto" y su descripción.
7. IF el Automovil seleccionado deja de existir en el Store_Trafico (por ejemplo, tras "Reiniciar"), THEN THE Velocimetro SHALL quitar la selección y volver a mostrar el Auto_Usuario.
8. THE Aplicación SHALL mostrar siempre visibles los controles "Iniciar/Pausar", "Inyectar caos", "Reiniciar", "Amortiguador activado/desactivado" y "Pedir asistencia", y las etiquetas de "Iniciar/Pausar" y "Amortiguador activado/desactivado" SHALL reflejar el estado actual de la simulación y del Amortiguador.
9. WHEN se recibe un Mensaje_Asistencia o un Mensaje_Respaldo, THE Aplicación SHALL reemplazar el contenido del panel de texto visible por ese último mensaje; WHILE aún no se ha recibido ningún mensaje, el panel SHALL mostrar un texto indicando que no hay mensajes.
10. THE Lienzo_Carriles SHALL dibujar al final del tramo (Y = 200 m, parte superior del lienzo) una línea de alto y un semáforo pequeño que muestre verde o rojo según el estado actual del Semaforo, junto con los segundos restantes de la fase.

### Requirement 8: Snapshot del tráfico para el agente

**User Story:** Como Arquitecto/AWS, quiero enviar a Bedrock un resumen JSON compacto del tráfico, para que el modelo genere mensajes con contexto real de la simulación.

#### Acceptance Criteria

1. WHEN el usuario solicita asistencia o emite un comando de voz, THE Aplicación SHALL construir, antes de enviar la solicitud al Endpoint_Agente, un Snapshot_Trafico que contenga: la marca de tiempo en formato ISO 8601, el estado del Amortiguador (activo o inactivo), la lista de todos los automóviles presentes en la simulación en ese instante (identificador, descripción, carril, posición Y, velocidad en km/h, aceleración, indicador de Auto_Fantasma), hasta 5 eventos de Frenado_Brusco ordenados del más reciente al más antiguo, el estado del Semaforo (nombre, color y segundos restantes de la fase) y el evento Semaforo_Perdido más reciente (o `null` si no hay ninguno), según el Requisito 18.
2. IF existen menos de 5 eventos de Frenado_Brusco o ningún automóvil en la simulación, THEN THE Aplicación SHALL incluir solo los elementos disponibles y representar la ausencia de elementos como una lista vacía, sin omitir el campo correspondiente.
3. THE Aplicación SHALL serializar el Snapshot_Trafico como JSON válido, con velocidad, aceleración y posición Y redondeadas a 1 decimal.
4. WHEN el Snapshot_Trafico se serializa, THE Aplicación SHALL producir un JSON que, al deserializarse con el parser JSON estándar del navegador y volver a serializarse, genere un texto idéntico al original (verificación manual desde la consola).
5. THE Aplicación SHALL limitar el tamaño del Snapshot_Trafico serializado a 8 KB (8192 bytes en UTF-8).
6. IF el Snapshot_Trafico serializado supera 8192 bytes, THEN THE Aplicación SHALL eliminar automóviles de flujo normal de la lista, conservando siempre los Auto_Fantasma, hasta quedar dentro del límite, e incluir en el snapshot el número total de automóviles y un indicador de que la lista fue recortada.
7. IF la construcción o serialización del Snapshot_Trafico falla, THEN THE Aplicación SHALL no enviar la solicitud al Endpoint_Agente, mostrar al usuario un mensaje de error indicando que no se pudo obtener el contexto del tráfico y mantener la simulación en ejecución sin cambios de estado.

### Requirement 9: Endpoint del agente con AWS Bedrock

**User Story:** Como Arquitecto/AWS, quiero un Route Handler que haga una única llamada a Bedrock, para generar mensajes de asistencia vial en español sin exponer credenciales.

#### Acceptance Criteria

1. WHEN el Endpoint_Agente recibe una solicitud POST cuyo cuerpo es un Snapshot_Trafico válido (JSON que contiene todos los campos definidos en el Requisito 8, criterio 1, con sus tipos correctos, y cuyo tamaño serializado no supera 8 KB), THE Cliente_Bedrock SHALL realizar una única llamada Converse sin streaming a AWS Bedrock en la región us-east-1 con el modelo Claude 3.5 Haiku.
2. IF la llamada con Claude 3.5 Haiku falla por acceso denegado al modelo o por limitación de tasa, THEN THE Cliente_Bedrock SHALL reintentar exactamente una vez con el modelo Amazon Nova Micro, con el mismo Snapshot_Trafico y las mismas instrucciones, y SHALL no hacer más intentos después de ese reintento.
3. WHEN Bedrock devuelve una respuesta con texto no vacío, THE Endpoint_Agente SHALL responder con código HTTP 200 y un JSON que contenga el campo `message` con el Mensaje_Asistencia en español y el campo `source` con el valor `"bedrock"`.
4. THE Cliente_Bedrock SHALL instruir al modelo para que genere un Mensaje_Asistencia en español de México de máximo 3 oraciones y máximo 300 caracteres, con el tono de un agente de movilidad de la CDMX, que mencione los automóviles por el valor del campo descripción del Snapshot_Trafico y no por su identificador, según el Requisito 15.
5. IF el cuerpo de la solicitud no es JSON, le falta algún campo requerido del Snapshot_Trafico, tiene un campo con tipo incorrecto o supera 8 KB, THEN THE Endpoint_Agente SHALL responder con código HTTP 400 y un mensaje de error que indique cuál de esas causas ocurrió, sin invocar a Bedrock.
6. IF el Endpoint_Agente no obtiene una respuesta de Bedrock dentro de 10 segundos contados desde que recibe la solicitud (incluido el reintento con Amazon Nova Micro), THEN THE Endpoint_Agente SHALL cancelar la llamada en curso y aplicar la degradación definida en el Requisito 11.
7. THE Endpoint_Agente SHALL omitir credenciales, encabezados de autenticación y trazas internas del SDK en las respuestas HTTP y en los registros.
8. IF el modelo que responde devuelve texto vacío o solo espacios en blanco, THEN THE Endpoint_Agente SHALL aplicar la degradación definida en el Requisito 11 y responder con el campo `source` con el valor `"fallback"` y un Mensaje_Respaldo en el campo `message`.

### Requirement 10: Comandos de voz y lectura de mensajes

**User Story:** Como responsable de Voz/Pitch, quiero que el conductor hable con el agente y escuche sus respuestas, para demostrar una asistencia vial manos libres.

#### Acceptance Criteria

1. WHEN el Endpoint_Agente devuelve un Mensaje_Asistencia o la Aplicación genera un Mensaje_Respaldo, THE Modulo_Voz SHALL leer el texto completo del mensaje en voz alta con `speechSynthesis` usando el idioma `es-MX` y SHALL mostrar el mismo texto en el panel de texto.
2. WHEN el usuario presiona el control de micrófono y no hay una sesión de reconocimiento activa, THE Modulo_Voz SHALL iniciar una única sesión de reconocimiento de voz en idioma `es-MX` y SHALL mostrar en el control de micrófono un indicador visible de estado "escuchando" hasta que la sesión termine.
3. WHEN el reconocimiento de voz produce una transcripción final con al menos 1 carácter distinto de espacio, THE Aplicación SHALL terminar la sesión de reconocimiento y enviar al Endpoint_Agente una sola solicitud con la transcripción (máximo 500 caracteres, truncada si es más larga) junto con el Snapshot_Trafico vigente en ese momento.
4. WHEN el Endpoint_Agente interpreta el comando de voz como una solicitud de activar el Amortiguador (por ejemplo, "activar amortiguador") o de desactivarlo (por ejemplo, "desactivar amortiguador"), THE Endpoint_Agente SHALL incluir en la respuesta el campo `action` con el valor `"enable_damper"` o `"disable_damper"` respectivamente, además del Mensaje_Asistencia.
5. WHEN la respuesta del Endpoint_Agente incluye el campo `action` con el valor `"enable_damper"` o `"disable_damper"`, THE Store_Trafico SHALL dejar el Amortiguador en estado activo o inactivo respectivamente, sin error si el Amortiguador ya estaba en ese estado.
6. IF el navegador no soporta `SpeechRecognition`, THEN THE Aplicación SHALL deshabilitar el control de micrófono y mostrar el texto "Reconocimiento de voz no disponible en este navegador".
7. IF el navegador no soporta `speechSynthesis`, THEN THE Aplicación SHALL mostrar el mensaje únicamente en el panel de texto, sin mostrar error.
8. WHEN el Modulo_Voz inicia la lectura de un mensaje nuevo mientras otra lectura está en curso, THE Modulo_Voz SHALL cancelar la lectura en curso antes de iniciar la nueva, de modo que nunca se lean dos mensajes al mismo tiempo.
9. IF la sesión de reconocimiento de voz termina por error (permiso de micrófono denegado, sin voz detectada o error del navegador) o termina sin una transcripción final con texto, THEN THE Aplicación SHALL quitar el indicador "escuchando", no enviar ninguna solicitud al Endpoint_Agente, mostrar en el panel de texto un mensaje indicando que no se pudo capturar el comando de voz, y dejar el control de micrófono habilitado para reintentar.
10. IF la solicitud de comando de voz al Endpoint_Agente falla o no responde en 15 segundos, THEN THE Aplicación SHALL generar un Mensaje_Respaldo, mostrarlo y leerlo según el criterio 1, y dejar el estado del Amortiguador sin cambios.
11. IF la respuesta del Endpoint_Agente incluye el campo `action` con un valor distinto de `"enable_damper"` o `"disable_damper"`, THEN THE Store_Trafico SHALL ignorar el campo `action` y dejar el Amortiguador sin cambios, y THE Modulo_Voz SHALL leer igualmente el Mensaje_Asistencia.

### Requirement 11: Degradación controlada ante fallas de Bedrock

**User Story:** Como presentador de la demo, quiero que la Aplicación siga funcionando aunque falten credenciales o se agoten los créditos, para que la demostración no se caiga frente al jurado.

#### Acceptance Criteria

1. IF el Validador_Config reporta una o más variables de entorno faltantes, THEN THE Endpoint_Agente SHALL responder sin llamar a Bedrock, con código HTTP 503, el campo `source` con el valor `"fallback"`, el campo `errorCode` con el valor `"CONFIG_MISSING"` y un Mensaje_Respaldo en el campo `message`.
2. IF Bedrock responde con error de credenciales inválidas, acceso denegado, cuota agotada o limitación de tasa tanto en Claude 3.5 Haiku como en el reintento con Amazon Nova Micro, THEN THE Endpoint_Agente SHALL responder con código HTTP 503, el campo `source` con el valor `"fallback"`, el campo `errorCode` con el valor `"AUTH_ERROR"` para credenciales inválidas o acceso denegado, o `"QUOTA_EXCEEDED"` para cuota agotada o limitación de tasa, y un Mensaje_Respaldo en el campo `message`.
3. IF la solicitud del cliente al Endpoint_Agente es rechazada por error de red o no recibe respuesta en 15 segundos, THEN THE Aplicación SHALL generar localmente un Mensaje_Respaldo que incluya la descripción legible y el carril del Automovil del evento de Frenado_Brusco más reciente y mostrarlo en el panel de mensajes.
4. WHEN la Aplicación recibe una respuesta con `source` igual a `"fallback"` o genera localmente un Mensaje_Respaldo, THE Aplicación SHALL mostrar el indicador "Modo sin IA" junto al panel de mensajes.
5. WHILE la Aplicación espera la respuesta del Endpoint_Agente o muestra el indicador "Modo sin IA", THE Bucle_Simulacion SHALL seguir actualizando la simulación sin pausas, a un mínimo de 55 fps medidos en el navegador de la demo.
6. THE Aplicación SHALL definir todos los Mensaje_Respaldo en español en un único módulo de constantes, con al menos un mensaje para cada caso: `"CONFIG_MISSING"`, `"AUTH_ERROR"`, `"QUOTA_EXCEEDED"`, `"TIMEOUT"`, `"SIGNAL_MISS"` y error de red en el cliente.
7. IF la llamada a Bedrock se cancela al pasar 10 segundos sin respuesta, THEN THE Endpoint_Agente SHALL responder con código HTTP 503, el campo `source` con el valor `"fallback"`, el campo `errorCode` con el valor `"TIMEOUT"` y un Mensaje_Respaldo en el campo `message`.
8. IF la Aplicación debe generar un Mensaje_Respaldo local y no existe ningún evento de Frenado_Brusco registrado, THEN THE Aplicación SHALL mostrar un Mensaje_Respaldo genérico en español que no haga referencia a ningún Automovil.
9. WHEN la Aplicación recibe una respuesta con `source` igual a `"bedrock"`, THE Aplicación SHALL ocultar el indicador "Modo sin IA".

### Requirement 12: PWA instalable y despliegue

**User Story:** Como equipo, queremos ejecutar la Aplicación en local y publicarla en Vercel como PWA instalable, para presentarla desde un teléfono o una laptop.

#### Acceptance Criteria

1. THE Aplicación SHALL incluir un Web App Manifest, enlazado desde todas sus páginas, con nombre, nombre corto de máximo 12 caracteres, color de tema, color de fondo, `start_url` con valor `/`, `display` con valor `standalone` e íconos en formato PNG de 192×192 y 512×512 píxeles.
2. WHEN se carga cualquier página de la Aplicación servida por HTTPS o desde `localhost`, THE Aplicación SHALL registrar un service worker mínimo que reenvíe todas las solicitudes a la red sin crear entradas en Cache Storage, de modo que la Aplicación no funcione sin conexión.
3. WHEN la URL de producción en Vercel se abre en Chrome para Android o en Chrome o Edge de escritorio, THE Aplicación SHALL cumplir los criterios de instalación del navegador, de forma que este muestre la opción de instalar y la Aplicación instalada se abra en una ventana `standalone` sin barra de direcciones.
4. WHEN un integrante con Node.js 20.9 o superior (versión mínima requerida por Next.js 16) ejecuta `npm install` y `npm run dev` con un `.env.local` que define `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION`, THE Aplicación SHALL iniciar en `http://localhost:3000` y mostrar la página principal en un máximo de 60 segundos desde la ejecución de `npm run dev`.
5. WHEN el repositorio se despliega en Vercel con las variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_REGION` configuradas en el proyecto, THE Aplicación SHALL compilar sin cambios en el código, servir la página principal por HTTPS en la URL del despliegue y responder a solicitudes al Endpoint_Agente.
6. IF alguna de las variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` o `AWS_REGION` falta en el entorno local o en Vercel, THEN THE Endpoint_Agente SHALL responder con un error que indique configuración faltante sin incluir valores de credenciales, y THE Aplicación SHALL seguir mostrando la página principal.
7. WHEN se ejecuta `npm run build`, THE Aplicación SHALL completar la compilación con código de salida 0 y sin errores de TypeScript.

### Requirement 13: Repositorio listo para GitHub y documentación

**User Story:** Como integrante del equipo, quiero un README con instrucciones claras, para clonar, configurar y ejecutar el proyecto en minutos.

#### Acceptance Criteria

1. THE Aplicación SHALL incluir en la raíz del repositorio un `README.md` en español con estas secciones, cada una con un encabezado propio: descripción, arquitectura híbrida, requisitos previos, clonación, configuración de `.env.local`, ejecución local, despliegue en Vercel, roles del equipo y guion de demostración.
2. THE README.md SHALL incluir, en las secciones de clonación, ejecución local y despliegue en Vercel, cada comando necesario como bloque de código copiable, en el orden en que deben ejecutarse.
3. THE README.md SHALL indicar en la sección de requisitos previos la versión mínima de cada herramienta necesaria para ejecutar la Aplicación localmente.
4. THE README.md SHALL listar en la sección de configuración de `.env.local` el nombre de cada variable de entorno que usa la Aplicación, su propósito y si es obligatoria u opcional, con valores de ejemplo ficticios en lugar de credenciales reales.
5. THE README.md SHALL indicar que el acceso a los modelos Claude 3.5 Haiku y Amazon Nova Micro debe estar habilitado en AWS Bedrock en la región us-east-1 para la cuenta de las credenciales usadas.
6. THE README.md SHALL describir el comportamiento de la Aplicación en "Modo sin IA": qué condición lo activa (faltan credenciales en `.env.local` o Bedrock no responde), qué funciones siguen disponibles, qué funciones de IA quedan desactivadas y cómo lo ve el usuario en la interfaz.
7. THE Aplicación SHALL organizar el código en módulos separados por rol: servidor y Bedrock (Integrante 1), física y Store_Trafico (Integrante 2), Lienzo_Carriles y Velocimetro (Integrante 3), y Modulo_Voz (Integrante 4), y la sección de roles del equipo del README.md SHALL indicar la ubicación del módulo de cada integrante.
8. THE Aplicación SHALL excluir `.env.local` del control de versiones mediante `.gitignore`, y el repositorio no SHALL contener claves de acceso, secretos ni tokens de AWS en ningún archivo versionado.
9. WHEN un integrante sigue en orden los pasos del README.md a partir de un clon limpio del repositorio, con los requisitos previos ya instalados, THE Aplicación SHALL arrancar en local sin errores en 10 minutos o menos, tanto con credenciales válidas como en "Modo sin IA".

### Requirement 14: Verificación manual de la demo

**User Story:** Como equipo, queremos un checklist de pruebas manuales, para validar la demo sin invertir tiempo en pruebas automatizadas.

#### Acceptance Criteria

1. THE README.md SHALL incluir una sección de checklist de pruebas manuales con al menos un ítem para cada una de estas 8 funcionalidades: inicio de simulación, inyección de caos, activación del Amortiguador, solicitud de asistencia, comando de voz, Modo sin IA, instalación de la PWA y Onda Verde / semáforo.
2. THE README.md SHALL incluir en cada ítem del checklist: la precondición, entre 1 y 5 pasos numerados, el resultado esperado descrito como un comportamiento visible en la interfaz y una casilla de verificación para marcar el ítem como superado.
3. THE README.md SHALL indicar al inicio del checklist el navegador y el tipo de dispositivo (escritorio o móvil) en los que se deben ejecutar las pruebas, incluido el navegador en el que se verifica la instalación de la PWA.
4. THE README.md SHALL definir un checklist que una persona del equipo pueda completar en 10 minutos o menos, con la estimación de tiempo indicada al inicio del checklist.
5. THE Aplicación SHALL excluir de sus dependencias declaradas toda librería de pruebas basadas en propiedades.

### Requirement 15: Localización CDMX

**User Story:** Como presentador de la demo, quiero que la Aplicación se vea y hable como una herramienta de movilidad de la Ciudad de México, para que el jurado la perciba como una solución local y no como un demo técnico abstracto.

#### Acceptance Criteria

1. THE Aplicación SHALL mostrar, siempre visible arriba del Velocimetro, el texto "Vía: " seguido del nombre de la vía simulada (por defecto "Viaducto Miguel Alemán"), junto con el sentido y el tramo, tomados de un único módulo de datos compartido.
2. THE Aplicación SHALL definir el nombre de la vía, el sentido, el tramo y los nombres y posiciones Y de al menos 3 incorporaciones y los datos del Semaforo (nombre "Eje Central", posición Y = 200 m, verde 15 s y rojo 15 s) en un único módulo sin secretos, de modo que cambiar a otra vía (por ejemplo, "Circuito Interior Río Churubusco") solo requiera editar ese módulo.
3. THE Lienzo_Carriles SHALL dibujar cada incorporación como una marca horizontal con su nombre en la posición vertical correspondiente a su posición Y.
4. THE Cliente_Bedrock SHALL instruir al modelo para que hable como el copiloto del Centro de Movilidad de la CDMX y estructure el Mensaje_Asistencia en: lo detectado y la incorporación más cercana, la acción del sistema, y una instrucción con una velocidad sugerida en km/h.
5. THE Endpoint_Agente SHALL calcular de forma determinista, sin IA, la incorporación más cercana al Frenado_Brusco más reciente y la velocidad sugerida, y SHALL enviarlas al modelo como contexto.
6. THE Cliente_Bedrock SHALL instruir al modelo para que se refiera a un Auto_Fantasma como "vehículo sin conexión".
7. THE Aplicación SHALL usar en la interfaz la paleta institucional de movilidad de la CDMX (verde oscuro, gris asfalto y blanco) definida como tokens de color de Tailwind, conservando el rojo para automóviles en frenado y el ámbar para el indicador "Modo sin IA".


### Requirement 16: Semáforo con alto obligatorio

**User Story:** Como presentador de la demo, quiero un semáforo al final del tramo donde todos los autos se detienen en rojo, para mostrar un escenario urbano real de la CDMX con filas y arranques.

#### Acceptance Criteria

1. THE Motor_Fisico SHALL calcular el color del Semaforo únicamente a partir del tiempo de simulación (simTime), como verde si simTime mod 30 < 15 y rojo en otro caso, sin usar el reloj del sistema.
2. WHEN el usuario presiona el control "Reiniciar", THE Store_Trafico SHALL regresar el tiempo de simulación a 0 s, de modo que el Semaforo quede en verde con 15 s restantes.
3. WHILE el Semaforo está en rojo, WHEN un Automovil está antes de la línea de alto (Y < 200 m) y la desaceleración necesaria para detenerse antes de 200 m, calculada como v² / (2 · (200 m − Y)), es mayor o igual que 1.5 m/s² y menor o igual que 5.88 m/s², THE Motor_Fisico SHALL aplicar a ese Automovil esa desaceleración, acotada a 5.88 m/s², para detenerlo antes de la línea, sin registrarla como Frenado_Brusco.
4. IF, en el cuadro en que el Semaforo cambia a rojo, la desaceleración necesaria de un Automovil para detenerse antes de 200 m supera 5.88 m/s² (dilema de la luz ámbar), THEN THE Motor_Fisico SHALL marcar ese Automovil como exento, permitirle continuar con su velocidad y cruzar la línea de alto, y quitar la marca de exento cuando el Automovil sea reposicionado al inicio del tramo.
5. WHILE el Automovil que precede a un Automovil en el mismo carril está deteniéndose por el Semaforo o detenido en la fila del Semaforo, THE Motor_Fisico SHALL aplicar al seguidor la desaceleración necesaria para quedar a 8 m del precedente, acotada a 5.88 m/s², sin registrarla como Frenado_Brusco, salvo que el hueco baje de 8 m, caso en el que aplican el Requisito 3, criterio 7, y el Requisito 4, criterio 4.
6. WHEN el Semaforo cambia a verde, THE Motor_Fisico SHALL acelerar a los Automovil detenidos por el Semaforo con la aceleración de recuperación de crucero hasta su velocidad de crucero.
7. WHEN el Bucle_Simulacion ejecuta un cuadro, THE Store_Trafico SHALL exponer el estado del Semaforo con su color (verde o rojo) y los segundos restantes de la fase actual, redondeados a 1 decimal.

### Requirement 17: Detección de Semaforo_Perdido y Onda Verde

**User Story:** Como conductor, quiero que el copiloto me avise cuando no voy a alcanzar el semáforo en verde y me sugiera una velocidad para llegar justo cuando cambie, para no frenar de golpe y ahorrar gasolina.

#### Acceptance Criteria

1. WHEN el Bucle_Simulacion ejecuta un cuadro, THE Motor_Fisico SHALL calcular el TTA del Auto_Usuario como (200 m − posición Y) / velocidad, en segundos, y SHALL considerar el TTA infinito cuando la velocidad sea 0 m/s.
2. WHEN el Semaforo está en verde, los segundos restantes de verde son menores que el TTA del Auto_Usuario y no se ha registrado un Semaforo_Perdido para ese Auto_Usuario en el ciclo actual de 30 s, THE Store_Trafico SHALL registrar un evento Semaforo_Perdido con el identificador del Auto_Usuario, su posición Y, el TTA, los segundos restantes de verde, la velocidad sugerida en km/h, el índice de ciclo (simTime div 30) y el tiempo de simulación.
3. THE Store_Trafico SHALL registrar como máximo un evento Semaforo_Perdido por ciclo y por Auto_Usuario, y SHALL conservar los 50 eventos Semaforo_Perdido más recientes, descartando primero el más antiguo.
4. THE Motor_Fisico SHALL calcular la velocidad sugerida de Onda_Verde como (200 m − posición Y) / (segundos restantes de verde + 15 s), convertida a km/h, redondeada hacia abajo a múltiplo de 5 y acotada al rango de 10 km/h a 60 km/h.
5. WHEN se registra un evento Semaforo_Perdido, THE Motor_Fisico SHALL activar la Onda_Verde fijando la velocidad objetivo del Auto_Usuario en la velocidad sugerida y llevarlo a ella con una desaceleración de magnitud entre 0.5 m/s² y 2.94 m/s², sin registrarla como Frenado_Brusco.
6. WHEN el Auto_Usuario cruza la línea de alto, el usuario presiona "Reiniciar" o cambia la selección del Automovil, THE Motor_Fisico SHALL desactivar la Onda_Verde y devolver al Automovil que la tenía activa a su velocidad de crucero.
7. WHILE la Onda_Verde está activa, THE Velocimetro SHALL mostrar la etiqueta "Onda Verde: N km/h", con N igual a la velocidad sugerida, junto a la velocidad actual del Auto_Usuario mientras esta baja hacia ese valor.
8. WHEN se registra un evento Semaforo_Perdido y no hay una solicitud al Endpoint_Agente en curso, THE Aplicación SHALL enviar automáticamente una única solicitud al Endpoint_Agente con el campo `trigger` con el valor `"signal_miss"`, sin que el Bucle_Simulacion ni el Motor_Fisico hagan la llamada de red.
9. IF la solicitud con `trigger` igual a `"signal_miss"` falla o el Endpoint_Agente responde con `source` igual a `"fallback"`, THEN THE Aplicación SHALL mostrar y leer el Mensaje_Respaldo local determinista "No alcanzas el semáforo de Eje Central. Suelta el acelerador y mantén N km/h para llegar en verde.", con N igual a la velocidad sugerida del evento.

### Requirement 18: Agente Bedrock para Semaforo_Perdido

**User Story:** Como Arquitecto/AWS, quiero que Bedrock redacte la instrucción de voz del Semaforo_Perdido con los datos calculados por la física, para que el mensaje suene local y sea numéricamente exacto.

#### Acceptance Criteria

1. THE Snapshot_Trafico SHALL incluir el estado del Semaforo (nombre, color y segundos restantes) y el evento Semaforo_Perdido más reciente, o `null` si no se ha registrado ninguno.
2. THE Aplicación SHALL incluir en cada solicitud al Endpoint_Agente un campo opcional `trigger` con uno de los valores `"manual"`, `"voice"` o `"signal_miss"`.
3. WHEN el campo `trigger` tiene el valor `"signal_miss"`, THE Cliente_Bedrock SHALL instruir al modelo para que responda con una instrucción de voz localizada que mencione el Semaforo por su nombre, diga que el conductor no alcanza a pasar, indique soltar el acelerador, dé la velocidad sugerida exacta del evento Semaforo_Perdido y mencione el ahorro de gasolina (por ejemplo: "No alcanzas el semáforo de Eje Central. Suelta el acelerador y mantén 20 km/h para llegar justo cuando cambie a verde, ahorrando gasolina.").
4. THE Cliente_Bedrock SHALL usar en el mensaje la velocidad sugerida calculada por el Motor_Fisico e incluida en el Snapshot_Trafico, de modo que el modelo no calcule valores numéricos.
5. IF el campo `trigger` tiene un valor distinto de `"manual"`, `"voice"` o `"signal_miss"`, THEN THE Endpoint_Agente SHALL responder con código HTTP 400 sin invocar a Bedrock.
