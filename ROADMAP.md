# 🗺️ Roadmap: Siguientes Pasos Avanzados — ADK Agent Team

Ahora que tenemos el Agent Team base funcionando (WeatherBot + GreetingBot + Guardrails), hay un abanico enorme de capacidades que el SDK de ADK expone y que podemos aprovechar progresivamente.

He organizado las ideas en **fases**, de menor a mayor complejidad.

---

## Fase 1 — Enriquecer el equipo actual

Estas mejoras se aplican directamente sobre lo que ya tenemos.

### 1.1 🔍 Google Search Tool (Grounding)
Conectar el agente a Google Search para que responda con datos reales, no solo mocks.

```typescript
import { GOOGLE_SEARCH } from '@google/adk';

const weatherAgent = new LlmAgent({
  // ...
  tools: [weatherTool, greetingTool, GOOGLE_SEARCH],
});
```
> **Impacto:** El modelo puede buscar en Google cuando no sabe algo. Ideal para sustituir nuestro mock de clima con resultados reales.

### 1.2 🧠 Estado de sesión persistente (Session State)
Actualmente usamos `InMemorySessionService`. Podemos guardar preferencias del usuario entre turnos:

```typescript
// En el beforeModelCallback o afterToolCallback:
context.session.state['ciudad_favorita'] = 'Santiago';

// En la instrucción del agente (template dinámico):
instruction: (context) => {
  const fav = context.session.state['ciudad_favorita'];
  return `Eres WeatherBot. ${fav ? `La ciudad favorita del usuario es ${fav}.` : ''}`;
}
```
> **Impacto:** El bot "recuerda" al usuario dentro de la sesión. Se puede evolucionar a persistencia real con `DatabaseSessionService` + PostgreSQL.

### 1.3 🛡️ Guardrails más sofisticados
Pasar de un filtro de palabras a un clasificador LLM que evalúe el contenido:

```typescript
beforeModelCallback: async (params) => {
  // Usar un segundo modelo ligero como "juez"
  const verdict = await classifyInput(lastUserMessage);
  if (verdict === 'unsafe') {
    return { content: { role: 'model', parts: [{ text: 'Contenido bloqueado.' }] } };
  }
  return undefined;
}
```

---

## Fase 2 — Workflows: Agentes Orquestados

ADK ofrece 3 tipos de agentes de flujo que no usan LLM sino que orquestan a otros agentes de forma determinista.

### 2.1 📋 SequentialAgent (Pipeline)
Ejecutar agentes en cadena. Ejemplo: un pipeline de análisis.

```
[Recopilar Datos] → [Analizar] → [Formatear Respuesta]
```

```typescript
import { SequentialAgent } from '@google/adk';

const pipeline = new SequentialAgent({
  name: 'AnalysisPipeline',
  subAgents: [dataCollector, analyzer, formatter],
});
```
> **Caso de uso:** Tomar un texto del usuario → resumirlo → traducirlo → presentarlo bonito.

### 2.2 🔄 LoopAgent (Iteración con criterio de salida)
Un agente que itera sobre sus sub-agentes hasta que uno "escala" (via `ExitLoopTool`) o se alcanza un máximo.

```typescript
import { LoopAgent } from '@google/adk';

const refinementLoop = new LoopAgent({
  name: 'QualityRefinementLoop',
  subAgents: [drafter, reviewer],  // draft → review → draft → review...
  maxIterations: 3,
});
```
> **Caso de uso:** Un agente redacta, otro revisa, el loop se repite hasta que el revisor da "OK".

### 2.3 ⚡ ParallelAgent (Ejecución simultánea)
Correr múltiples agentes en paralelo y combinar resultados.

```typescript
import { ParallelAgent } from '@google/adk';

const multiSearch = new ParallelAgent({
  name: 'MultiSourceSearch',
  subAgents: [weatherAgent, newsAgent, trafficAgent],
});
```
> **Caso de uso:** Pedir clima + noticias + tráfico en paralelo antes de un viaje.

---

## Fase 3 — Conectar al mundo exterior

### 3.1 🔌 MCP Toolset (Model Context Protocol)
Conectar herramientas externas vía el estándar MCP. Cualquier servidor MCP se convierte en un set de tools automáticamente.

```typescript
import { MCPToolset, StreamableHTTPConnectionParamsSchema } from '@google/adk';

const connectionParams = StreamableHTTPConnectionParamsSchema.parse({
  type: 'StreamableHTTPConnectionParams',
  url: 'http://localhost:8788/mcp',
});

const mcpTools = new MCPToolset(connectionParams);

const agent = new LlmAgent({
  tools: [mcpTools],  // ¡Todas las tools del servidor MCP disponibles!
});
```
> **Caso de uso:** Conectar tu agente a un servidor MCP que exponga Slack, GitHub, bases de datos, etc.

### 3.2 🌐 A2A (Agent-to-Agent Protocol)
Conectar agentes desplegados en diferentes servicios/servidores usando el protocolo A2A.

```typescript
import { RemoteA2AAgent } from '@google/adk';

const remoteExpert = new RemoteA2AAgent({
  name: 'ExternalExpert',
  agentCard: 'http://expert-service.example.com/.well-known/agent.json',
});

// Luego úsalo como sub-agente
const coordinator = new LlmAgent({
  tools: [new AgentTool({ agent: remoteExpert })],
});
```
> **Caso de uso:** Tu WeatherBot delega preguntas de finanzas a un agente experto corriendo en otro servidor.

### 3.3 🔧 Herramientas con APIs reales
Reemplazar nuestro mock de clima con una API real (ej: OpenWeatherMap):

```typescript
const weatherTool = new FunctionTool({
  name: 'get_weather',
  description: 'Obtiene el clima real de una ubicación.',
  parameters: z.object({
    location: z.string().describe('Ciudad, ej: Santiago, Chile'),
  }),
  execute: async (input) => {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${input.location}&appid=${API_KEY}&units=metric&lang=es`
    );
    const data = await res.json();
    return `${data.weather[0].description}, ${data.main.temp}°C, humedad ${data.main.humidity}%`;
  }
});
```

---

## Fase 4 — Plugin System & Observabilidad

### 4.1 📊 Plugin de Logging/Telemetría
Crear un plugin personalizado que registre globalmente todo lo que pasa:

```typescript
class TelemetryPlugin extends BasePlugin {
  constructor() { super('telemetry'); }

  async beforeModelCallback({ callbackContext, llmRequest }) {
    console.log(`[📡 Telemetry] Model call at ${new Date().toISOString()}`);
    return undefined;
  }

  async afterToolCallback({ tool, toolArgs, result }) {
    // Enviar métricas a un servicio externo
    await sendMetrics({ tool: tool.name, args: toolArgs, result, timestamp: Date.now() });
    return undefined;
  }
}

const runner = new Runner({
  plugins: [new TelemetryPlugin()],
  // ...
});
```

### 4.2 💾 Plugin de Caché de LLM
Evitar llamadas repetidas al modelo para las mismas preguntas:

```typescript
class CachePlugin extends BasePlugin {
  private cache = new Map<string, LlmResponse>();

  async beforeModelCallback({ llmRequest }) {
    const key = JSON.stringify(llmRequest.contents);
    if (this.cache.has(key)) return this.cache.get(key);
    return undefined;
  }

  async afterModelCallback({ llmResponse, llmRequest }) {
    const key = JSON.stringify(llmRequest.contents);
    this.cache.set(key, llmResponse);
    return undefined;
  }
}
```

---

## Fase 5 — Producción y UI

### 5.1 🖥️ Interfaz Web con Dev UI
ADK JS incluye un `dev/` folder con un servidor y browser UI precompilado. Podemos exponerlo:

```bash
npx @google/adk-dev web .
```
> Esto lanza un panel visual donde puedes chatear con tus agentes, ver el trace de eventos, y depurar en tiempo real.

### 5.2 🚀 Deploy como API REST
Usar el `A2AAgentExecutor` integrado para exponer tu agente como un endpoint HTTP:

```typescript
import { toA2a } from '@google/adk';
const app = await toA2a(weatherAgent, { port: 3000 });
// Tu agente ahora es accesible en http://localhost:3000/a2a
```

### 5.3 🐳 Containerización
Empaquetar el agente en un contenedor Docker para deploy en Cloud Run, GKE, etc.:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
COPY .env ./
CMD ["node", "dist/index.js"]
```

---

## Resumen de complejidad y prioridad sugerida

| # | Feature | Complejidad | Valor |
|---|---------|------------|-------|
| 1.1 | Google Search Tool | ⭐ Baja | 🔥🔥🔥 Alto |
| 1.2 | Session State | ⭐ Baja | 🔥🔥 Medio |
| 1.3 | Guardrails LLM | ⭐⭐ Media | 🔥🔥 Medio |
| 2.1 | SequentialAgent | ⭐⭐ Media | 🔥🔥🔥 Alto |
| 2.2 | LoopAgent | ⭐⭐ Media | 🔥🔥 Medio |
| 2.3 | ParallelAgent | ⭐⭐ Media | 🔥🔥 Medio |
| 3.1 | MCP Toolset | ⭐⭐⭐ Alta | 🔥🔥🔥 Alto |
| 3.2 | A2A Protocol | ⭐⭐⭐ Alta | 🔥🔥 Medio |
| 3.3 | APIs reales | ⭐ Baja | 🔥🔥🔥 Alto |
| 4.1 | Plugin Telemetría | ⭐⭐ Media | 🔥🔥 Medio |
| 4.2 | Plugin Caché | ⭐⭐ Media | 🔥🔥 Medio |
| 5.1 | Dev UI | ⭐ Baja | 🔥🔥🔥 Alto |
| 5.2 | Deploy REST | ⭐⭐ Media | 🔥🔥🔥 Alto |
| 5.3 | Docker | ⭐⭐ Media | 🔥🔥 Medio |

> [!TIP]
> **Mi recomendación:** Empezar por **1.1 (Google Search)** + **3.3 (API real de clima)** para tener un bot realmente útil, y luego saltar a **2.1 (SequentialAgent)** para aprender los workflows. Después explorar **3.1 (MCP)** que es donde el SDK realmente brilla en extensibilidad.
