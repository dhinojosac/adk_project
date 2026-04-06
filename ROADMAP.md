# 🗺️ Roadmap: Siguientes Pasos Avanzados — ADK Agent Team

Ahora que tenemos el Agent Team base funcionando (WeatherBot + GreetingBot + Guardrails), hay un abanico enorme de capacidades que el SDK de ADK expone y que podemos aprovechar progresivamente.

Organizado en **5 fases**, de menor a mayor complejidad. Cada item incluye **casos de uso reales** para dar contexto práctico.

---

## Fase 1 — Enriquecer el equipo actual

Estas mejoras se aplican directamente sobre lo que ya tenemos, sin cambiar la arquitectura.

### 1.1 🔍 Google Search Tool (Grounding)

Conectar el agente a Google Search para que responda con datos reales, no solo mocks.

```typescript
import { GOOGLE_SEARCH } from '@google/adk';

const weatherAgent = new LlmAgent({
  // ...
  tools: [weatherTool, greetingTool, GOOGLE_SEARCH],
});
```

**Casos de uso reales:**
- 🏋️ *Asistente personal:* "¿Qué restaurantes buenos hay cerca de Plaza Italia?" → busca en Google en tiempo real.
- 📰 *Bot de noticias:* "¿Qué pasó hoy en Chile?" → el modelo busca noticias actuales y las resume.
- 💊 *Asistente médico-informativo:* "¿Cuáles son los efectos secundarios del ibuprofeno?" → busca fuentes confiables y cita la fuente.

> **Impacto:** El modelo deja de inventar — tiene acceso a información real y actualizada. Es una sola línea de código.

---

### 1.2 🧠 Estado de sesión persistente (Session State)

Actualmente usamos `InMemorySessionService`. Podemos guardar preferencias y contexto del usuario entre turnos:

```typescript
// Guardar preferencias en el estado de sesión:
context.session.state['ciudad_favorita'] = 'Santiago';
context.session.state['unidad_temp'] = 'celsius';

// Instrucción dinámica que se adapta al usuario:
instruction: (context) => {
  const fav = context.session.state['ciudad_favorita'];
  const unidad = context.session.state['unidad_temp'] || 'celsius';
  return `Eres WeatherBot. ${fav ? `La ciudad favorita del usuario es ${fav}.` : ''}
          Siempre responde temperaturas en ${unidad}.`;
}
```

**Casos de uso reales:**
- 🛒 *Asistente de compras:* Recuerda que el usuario prefiere envío express y talla M. "Agrégame la polera azul" → ya sabe la talla.
- 📚 *Tutor educativo:* Guarda el nivel del alumno y los temas ya cubiertos. No repite contenido ya enseñado.
- 🏥 *Triaje médico:* Mantiene los síntomas declarados en turnos anteriores para no volver a preguntar.
- 🌦️ *Nuestro WeatherBot:* "¿Y mañana?" → Sabe que hablábamos de Santiago sin que el usuario lo repita.

> **Evolución futura:** Migrar a `DatabaseSessionService` + PostgreSQL para persistir entre reinicios del servidor.

---

### 1.3 🛡️ Guardrails más sofisticados

Pasar de un filtro de palabras a un clasificador LLM que evalúe el contenido semántico:

```typescript
beforeModelCallback: async (params) => {
  // Usar un segundo modelo ligero (flash) como "juez de seguridad"
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const judge = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Clasifica este mensaje como SAFE o UNSAFE. 
               Responde solo con una palabra: "${lastUserMessage}"`,
  });
  
  if (judge.text?.trim() === 'UNSAFE') {
    return { content: { role: 'model', parts: [{ text: 'Lo siento, no puedo ayudarte con eso.' }] } };
  }
  return undefined; // Continuar normalmente
}
```

**Casos de uso reales:**
- 🏦 *Bot bancario:* Detectar intentos de phishing o ingeniería social ("dame las credenciales del admin").
- 👶 *App infantil:* Filtrar contenido adulto incluso cuando se usan eufemismos o jerga.
- 🏢 *Chatbot corporativo:* Bloquear consultas que intentan extraer datos confidenciales de la empresa.

---

## Fase 2 — Workflows: Agentes Orquestados

ADK ofrece 3 tipos de agentes de flujo que **no usan LLM** sino que orquestan a otros agentes de forma determinista. Son el verdadero poder de ADK para construir sistemas complejos y predecibles.

### 2.1 📋 SequentialAgent (Pipeline)

Ejecutar agentes en cadena, donde la salida de uno alimenta al siguiente.

```
[Recopilar Datos] → [Analizar] → [Formatear Respuesta]
```

```typescript
import { SequentialAgent, LlmAgent } from '@google/adk';

// Paso 1: Extraer datos clave de un texto
const extractor = new LlmAgent({
  name: 'DataExtractor',
  model: 'gemini-2.5-flash',
  instruction: 'Del texto que recibas, extrae: nombres, fechas, montos y entidades. Devuélvelo como JSON.',
});

// Paso 2: Analizar los datos extraídos
const analyzer = new LlmAgent({
  name: 'DataAnalyzer',
  model: 'gemini-2.5-flash',
  instruction: 'Del JSON que recibas, identifica patrones, anomalías y genera insights.',
});

// Paso 3: Redactar informe ejecutivo
const reporter = new LlmAgent({
  name: 'ReportWriter',
  model: 'gemini-2.5-flash',
  instruction: 'Genera un informe ejecutivo en español, claro y breve, a partir del análisis recibido.',
});

const analysisPipeline = new SequentialAgent({
  name: 'AnalysisPipeline',
  subAgents: [extractor, analyzer, reporter],
});
```

**Casos de uso reales:**

| Caso de uso | Paso 1 | Paso 2 | Paso 3 |
|-------------|--------|--------|--------|
| 📄 **Análisis de CV** | Extraer datos del CV | Evaluar fit con requisitos del puesto | Generar recomendación para RRHH |
| 📧 **Procesador de emails** | Clasificar urgencia/tema | Extraer action items | Redactar borrador de respuesta |
| 🔬 **Revisión de papers** | Extraer metodología y resultados | Verificar consistencia estadística | Escribir peer review |
| 📊 **Reporte financiero** | Parsear datos de un estado financiero | Calcular ratios y tendencias | Generar resumen para directorio |
| 🌍 **Planificador de viajes** | Recopilar destino + fechas + presupuesto | Buscar vuelos + hoteles + actividades | Armar itinerario día por día |

---

### 2.2 🔄 LoopAgent (Iteración con criterio de salida)

Un agente que itera sobre sus sub-agentes hasta que uno "escala" (via `ExitLoopTool`) o se alcanza un `maxIterations`.

```typescript
import { LoopAgent, LlmAgent, ExitLoopTool } from '@google/adk';

// El escritor genera o mejora el contenido
const writer = new LlmAgent({
  name: 'Writer',
  model: 'gemini-2.5-flash',
  instruction: `Eres un copywriter experto. Escribe o mejora el texto según el feedback recibido.
                Si no hay feedback previo, genera el contenido inicial.`,
});

// El revisor evalúa la calidad y da feedback, o aprueba
const reviewer = new LlmAgent({
  name: 'Reviewer',
  model: 'gemini-2.5-flash',
  instruction: `Eres un editor exigente. Evalúa el texto recibido.
                Si cumple con los estándares de calidad, usa la herramienta exit_loop.
                Si no, da feedback concreto y específico para mejorar.`,
  tools: [new ExitLoopTool()],
});

const qualityLoop = new LoopAgent({
  name: 'WritingQualityLoop',
  subAgents: [writer, reviewer],
  maxIterations: 5,  // Máximo 5 rondas de revisión
});
```

**Casos de uso reales:**

| Caso de uso | Agente A (hace) | Agente B (revisa/decide) | Criterio de salida |
|-------------|-----------------|--------------------------|-------------------|
| ✍️ **Blog post writer** | Redacta artículo | Revisa SEO, tono, estructura | Texto aprobado o 3 iteraciones |
| 🐛 **Auto-debugger** | Genera fix para un bug | Ejecuta tests y evalúa si pasan | Tests pasan o 5 intentos |
| 🎨 **Generador de prompts** | Crea prompt para imagen | Evalúa si el prompt es suficientemente descriptivo | Prompt cumple criterios |
| 📝 **Traductor iterativo** | Traduce texto | Verifica fidelidad y naturalidad | Traducción aprobada |
| 📋 **Generador de contratos** | Redacta cláusula legal | Revisa por inconsistencias o lagunas | Cláusula es sólida legalmente |

---

### 2.3 ⚡ ParallelAgent (Ejecución simultánea)

Correr múltiples agentes en paralelo y combinar resultados. Ideal cuando necesitas múltiples perspectivas o fuentes independientes.

```typescript
import { ParallelAgent, SequentialAgent, LlmAgent } from '@google/adk';

// Tres agentes buscan información desde ángulos distintos
const techAnalyst = new LlmAgent({
  name: 'TechAnalyst',
  instruction: 'Analiza el aspecto tecnológico del tema.',
});

const marketAnalyst = new LlmAgent({
  name: 'MarketAnalyst',
  instruction: 'Analiza el aspecto de mercado y competencia.',
});

const legalAnalyst = new LlmAgent({
  name: 'LegalAnalyst',
  instruction: 'Analiza riesgos legales y regulatorios.',
});

// Ejecutar los 3 en paralelo
const parallelAnalysis = new ParallelAgent({
  name: 'MultiAngleAnalysis',
  subAgents: [techAnalyst, marketAnalyst, legalAnalyst],
});

// Luego un agente sintetizador combina todo
const synthesizer = new LlmAgent({
  name: 'Synthesizer',
  instruction: 'Combina los 3 análisis anteriores en un informe ejecutivo unificado.',
});

// Pipeline completo: análisis paralelo → síntesis
const fullAnalysis = new SequentialAgent({
  name: 'CompleteDueDiligence',
  subAgents: [parallelAnalysis, synthesizer],
});
```

**Casos de uso reales:**

| Caso de uso | Agente 1 | Agente 2 | Agente 3 | Sintetizador |
|-------------|----------|----------|----------|-------------|
| 🏠 **Evaluador inmobiliario** | Análisis de precio/m² | Análisis de barrio/seguridad | Análisis legal del título | Informe de inversión |
| 💼 **Due diligence startup** | Tech stack review | Market analysis | Legal risks | Investment memo |
| 🩺 **Segunda opinión médica** | Diagnóstico clínico | Evidencia de laboratorio | Historial del paciente | Recomendación unificada |
| 📰 **Fact checker** | Buscar en fuentes oficiales | Buscar en redes sociales | Buscar en publicaciones académicas | Veredicto de veracidad |
| 🚗 **Planificador de viaje** | Buscar vuelos | Buscar hoteles | Buscar actividades | Itinerario consolidado |

### 🧩 Combinando workflows (Patrón avanzado)

Los 3 tipos de agentes se pueden combinar para crear sistemas sofisticados:

```
                    ┌─ TechAnalyst ─┐
[Input] → Extractor → │  MarketAnalyst │ → Synthesizer → ┌─ Writer ─┐ → [Output]
                    └─ LegalAnalyst ─┘                  └─ Reviewer ┘ 
                                                            (loop)
          Sequential     Parallel          Sequential      Loop
```

> Un pipeline que: extrae datos → los analiza desde 3 ángulos en paralelo → sintetiza → y luego itera el informe final hasta que el revisor aprueba.

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

**Casos de uso reales:**
- 💬 *Slack Bot inteligente:* Conectar MCP server de Slack → el agente puede leer/enviar mensajes, buscar en canales, gestionar threads.
- 🐙 *DevOps agent:* Conectar MCP server de GitHub → crear PRs, revisar issues, disparar CI/CD.
- 🗃️ *Consultor de datos:* Conectar MCP server de PostgreSQL → el agente consulta tu base de datos con lenguaje natural.
- 📁 *Asistente de archivos:* Conectar MCP server de Google Drive → buscar, leer y organizar documentos.
- 🏠 *Smart Home:* Conectar MCP server de Home Assistant → "apaga las luces del living" ejecuta acciones reales.

> **Poder:** No necesitas escribir tools manualmente. Cualquier MCP server existente se conecta con 3 líneas.

---

### 3.2 🌐 A2A (Agent-to-Agent Protocol)

Conectar agentes desplegados en diferentes servicios/servidores usando el protocolo estándar A2A.

```typescript
import { RemoteA2AAgent, AgentTool } from '@google/adk';

const remoteExpert = new RemoteA2AAgent({
  name: 'FinanceExpert',
  agentCard: 'https://finance-agent.company.com/.well-known/agent.json',
});

const coordinator = new LlmAgent({
  name: 'Coordinator',
  instruction: 'Eres un coordinador. Delega preguntas financieras al experto.',
  tools: [new AgentTool({ agent: remoteExpert })],
});
```

**Casos de uso reales:**
- 🏢 *Empresa con departamentos:* Cada departamento tiene su agente especializado (RRHH, Finanzas, Legal). Un agente coordinador delega según el tema.
- 🌍 *Multi-idioma:* Un agente en español delega a un agente especializado en japonés para consultas sobre ese mercado.
- 🤝 *Ecosistema de partners:* Tu agente de travel se conecta a un agente de aerolínea (de otra empresa) vía A2A para cotizar vuelos.

---

### 3.3 🔧 Herramientas con APIs reales

Reemplazar nuestros mocks con servicios reales:

```typescript
// Clima real (OpenWeatherMap)
const weatherTool = new FunctionTool({
  name: 'get_weather',
  description: 'Obtiene el clima real de una ubicación.',
  parameters: z.object({
    location: z.string().describe('Ciudad, ej: Santiago, Chile'),
  }),
  execute: async ({ location }) => {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=metric&lang=es`
    );
    const data = await res.json();
    return { description: data.weather[0].description, temp: data.main.temp, humidity: data.main.humidity };
  }
});

// Enviar emails (SendGrid/Resend)
const emailTool = new FunctionTool({
  name: 'send_email',
  description: 'Envía un email a un destinatario.',
  parameters: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    await resend.emails.send({ from: 'bot@tudominio.com', to, subject, html: body });
    return { status: 'sent', to };
  }
});

// Buscar en base de datos
const searchDBTool = new FunctionTool({
  name: 'search_products',
  description: 'Busca productos en el catálogo.',
  parameters: z.object({
    query: z.string().describe('Término de búsqueda'),
    max_results: z.number().default(5),
  }),
  execute: async ({ query, max_results }) => {
    const results = await db.query('SELECT * FROM productos WHERE nombre ILIKE $1 LIMIT $2', [`%${query}%`, max_results]);
    return results.rows;
  }
});
```

**Ideas de tools prácticas:**

| Tool | API/Servicio | Qué hace |
|------|-------------|----------|
| `get_weather` | OpenWeatherMap | Clima real por ciudad |
| `send_email` | Resend / SendGrid | Enviar correos |
| `create_calendar` | Google Calendar API | Agendar reuniones |
| `search_products` | PostgreSQL / MongoDB | Buscar en catálogo |
| `get_exchange_rate` | exchangerate-api.com | Tipo de cambio actual |
| `create_ticket` | Jira / Linear API | Crear tickets de soporte |
| `search_docs` | Pinecone / Qdrant | RAG sobre documentos internos |
| `send_whatsapp` | Twilio WhatsApp API | Enviar mensajes WhatsApp |

---

## Fase 4 — Plugin System & Observabilidad

### 4.1 📊 Plugin de Logging/Telemetría

Crear un plugin personalizado que registre globalmente todo lo que pasa:

```typescript
class TelemetryPlugin extends BasePlugin {
  private logs: Array<{event: string, data: any, timestamp: number}> = [];

  constructor() { super('telemetry'); }

  async beforeModelCallback({ callbackContext, llmRequest }) {
    this.logs.push({ event: 'model_call', data: { model: llmRequest.model }, timestamp: Date.now() });
    console.log(`[📡 Telemetry] Model request at ${new Date().toISOString()}`);
    return undefined;
  }

  async afterToolCallback({ tool, toolArgs, result }) {
    this.logs.push({ event: 'tool_call', data: { tool: tool.name, args: toolArgs }, timestamp: Date.now() });
    // Enviar métricas a un servicio externo (Datadog, Grafana, etc.)
    await sendMetrics({ tool: tool.name, args: toolArgs, result, timestamp: Date.now() });
    return undefined;
  }

  // Exportar logs al finalizar
  async afterRunCallback() {
    await fs.writeFile('session_log.json', JSON.stringify(this.logs, null, 2));
  }
}

const runner = new Runner({
  plugins: [new TelemetryPlugin()],
  // ...
});
```

**Casos de uso reales:**
- 📈 *Dashboard de uso:* ¿Cuántas veces se llama cada tool? ¿Cuánto tarda el modelo? → Alimentar Grafana.
- 🔍 *Debugging en producción:* Guardar el trace completo de cada conversación para reproducir bugs.
- 💰 *Control de costos:* Contar tokens consumidos por sesión para estimar gastos de API.

---

### 4.2 💾 Plugin de Caché de LLM

Evitar llamadas repetidas al modelo para las mismas preguntas:

```typescript
class CachePlugin extends BasePlugin {
  private cache = new Map<string, LlmResponse>();

  constructor() { super('llm_cache'); }

  async beforeModelCallback({ llmRequest }) {
    const key = JSON.stringify(llmRequest.contents);
    if (this.cache.has(key)) {
      console.log('[💾 Cache] HIT — respuesta cacheada');
      return this.cache.get(key);
    }
    return undefined;
  }

  async afterModelCallback({ llmResponse, llmRequest }) {
    const key = JSON.stringify(llmRequest.contents);
    this.cache.set(key, llmResponse);
    return undefined;
  }
}
```

**Casos de uso reales:**
- 🔄 *FAQ bot:* Si 100 personas preguntan "¿cuál es el horario?", la respuesta se cachea después de la primera vez.
- 🧪 *Tests automatizados:* Correr tests de agentes sin gastar tokens usando respuestas cacheadas.
- ⚡ *Latencia:* Responder instantáneamente preguntas frecuentes sin esperar al modelo.

---

### 4.3 🛡️ Plugin de Política de Seguridad Global

```typescript
class SecurityPolicyPlugin extends BasePlugin {
  constructor() { super('security_policy'); }

  // Bloquear preguntas sobre datos sensibles globalmente
  async onUserMessageCallback({ userMessage }) {
    const text = userMessage.parts?.[0]?.text || '';
    if (/RUT|contraseña|password|tarjeta de crédito/i.test(text)) {
      return { role: 'model', parts: [{ text: '🔒 Por política, no puedo procesar datos sensibles.' }] };
    }
    return undefined;
  }

  // Sanitizar outputs — nunca exponer datos internos
  async afterModelCallback({ llmResponse }) {
    const text = llmResponse.content?.parts?.[0]?.text || '';
    if (text.includes('API_KEY') || text.includes('process.env')) {
      llmResponse.content.parts[0].text = '[CONTENIDO REDACTADO POR SEGURIDAD]';
    }
    return undefined;
  }
}
```

---

## Fase 5 — Producción y UI

### 5.1 🖥️ Interfaz Web con Dev UI

ADK JS incluye un servidor y browser UI precompilado. Podemos exponerlo:

```bash
npx @google/adk-dev web .
```
> Esto lanza un panel visual donde puedes chatear con tus agentes, ver el trace de eventos, y depurar en tiempo real.

**Valor:** Ideal para demos, debugging, y para que stakeholders no-técnicos prueben el agente sin tocar la terminal.

---

### 5.2 🚀 Deploy como API REST

Usar el módulo A2A integrado para exponer tu agente como un endpoint HTTP que cualquier frontend puede consumir:

```typescript
import { toA2a } from '@google/adk';

// Expone el agente como servidor A2A
const app = await toA2a(weatherAgent, { port: 3000 });
// Tu agente ahora es accesible en http://localhost:3000
```

**Casos de uso reales:**
- 📱 *App móvil:* Tu app React Native llama al endpoint y presenta la respuesta del agente.
- 💬 *Widget de chat:* Embeber un chat widget en tu sitio web que se conecte a este endpoint.
- 🔗 *Integración con otros sistemas:* Cualquier backend puede llamar a tu agente vía HTTP.

---

### 5.3 🐳 Containerización y Deploy Cloud

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

```bash
# Construir y publicar
docker build -t adk-agent-team .
docker run -p 3000:3000 --env-file .env adk-agent-team

# Deploy a Google Cloud Run
gcloud run deploy adk-agent --source . --allow-unauthenticated
```

**Plataformas sugeridas:**
| Plataforma | Ventaja | Costo aprox. |
|------------|---------|-------------|
| Cloud Run | Autoescalado, sin servidor, integrado con Google | Pay-per-use (~$0) |
| Railway | Deploy en 1 click desde GitHub | $5/mes |
| Fly.io | Baja latencia global | $3-5/mes |
| VPS (Hetzner) | Control total | €4/mes |

---

## Resumen de complejidad y prioridad sugerida

| # | Feature | Complejidad | Valor | Estado |
|---|---------|------------|-------|--------|
| 1.1 | Google Search Tool | ⭐ Baja | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 1.2 | Session State | ⭐ Baja | 🔥🔥 Medio | ⬜ Pendiente |
| 1.3 | Guardrails LLM | ⭐⭐ Media | 🔥🔥 Medio | ⬜ Pendiente |
| 2.1 | SequentialAgent | ⭐⭐ Media | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 2.2 | LoopAgent | ⭐⭐ Media | 🔥🔥 Medio | ⬜ Pendiente |
| 2.3 | ParallelAgent | ⭐⭐ Media | 🔥🔥 Medio | ⬜ Pendiente |
| 3.1 | MCP Toolset | ⭐⭐⭐ Alta | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 3.2 | A2A Protocol | ⭐⭐⭐ Alta | 🔥🔥 Medio | ⬜ Pendiente |
| 3.3 | APIs reales | ⭐ Baja | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 4.1 | Plugin Telemetría | ⭐⭐ Media | 🔥🔥 Medio | ⬜ Pendiente |
| 4.2 | Plugin Caché | ⭐⭐ Media | 🔥🔥 Medio | ⬜ Pendiente |
| 4.3 | Plugin Seguridad | ⭐⭐ Media | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 5.1 | Dev UI | ⭐ Baja | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 5.2 | Deploy REST | ⭐⭐ Media | 🔥🔥🔥 Alto | ⬜ Pendiente |
| 5.3 | Docker + Cloud | ⭐⭐ Media | 🔥🔥 Medio | ⬜ Pendiente |

---

## 🎯 Ruta recomendada de aprendizaje

```
Semana 1:  1.1 (Google Search) + 3.3 (API real de clima)
           → Bot con datos reales y útiles

Semana 2:  2.1 (SequentialAgent) + 2.2 (LoopAgent)
           → Entender workflows deterministas

Semana 3:  4.1 (Telemetría) + 4.3 (Seguridad)
           → Plugins y observabilidad

Semana 4:  3.1 (MCP) + 5.2 (Deploy REST)
           → Conectar al mundo y exponerlo como API

Semana 5:  2.3 (Parallel) + 3.2 (A2A)
           → Arquitectura distribuida de agentes
```

> **Filosofía:** Cada semana agrega una capa nueva de sofisticación sobre la anterior. Al final de las 5 semanas tendrás un sistema multi-agente productivo, observado, seguro y desplegado en la nube.
