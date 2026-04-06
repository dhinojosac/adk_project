# 🌦️ Agent Team - Google ADK Tutorial (TypeScript) ✅ Probado y Funcionando

Este proyecto es una implementación completa y directa en **TypeScript** del tutorial de "[Build your first intelligent agent team](https://adk.dev/tutorials/agent-team/)" del **Agent Development Kit (ADK)** de Google.

Dado que requería un intérprete de Python no disponible en el sistema, lo hemos construido íntegramente utilizando Node.js y la librería `@google/adk`.

## 🛠️ Requisitos
- Node.js versión `20` o superior.
- Clave de API válida de Gemini.

## 🚀 Instalación y Configuración

1. **Instalar Dependencias**
   ```bash
   npm install
   ```

2. **Configurar el Entorno**
   Renombra el archivo `.env.example` a `.env` y coloca tu clave de API:
   ```env
   GEMINI_API_KEY=tu_clave_aqui
   ```

3. **Compilar el Código**
   El código está implementado en TypeScript bajo la arquitectura propuesta por ADK. Para verificar los tipos o crear una build de producción:
   ```bash
   npx tsc
   ```

## 🎮 Ejecutar el Agente

Puedes ejecutar directamente el proyecto sin transpilarlo manualmente usando `ts-node`:

```bash
npm start
```
> *(Deberás agregar el script en tu package.json o correr `npx ts-node src/index.ts`)*

## 🧠 Estructura del "Agent Team"

El tutorial cubre los siguientes componentes:

1. **Agentes y Delegación (`src/agents/`)**
   - **WeatherBot:** El LLMAgent principal configurado para contestar cosas de clima que además tiene a *GreetingBot* y la función *get_weather* inyectados como tools.
   - **GreetingBot:** Un agente secundario delegado únicamente para saludar y despedirse.

2. **Herramientas Personalizadas (`src/tools.ts`)**
   - Herramienta para consultar el clima usando Zod como validador de interfaz de entrada de datos a la herramienta.

3. **Guardrails de Seguridad (`src/agents/weatherBot.ts`)**
   - **Manejo de Input (beforeModelCallback):** Intercepta inputs maliciosos del usuario antes de que el prompt llegue al modelo (ej: bloquea palabras como "violencia").
   - **Manejo de Herramientas (beforeToolCallback):** Un simple Logger/Inspector para auditar con qué parámetros el modelo está invocado funciones delicadas.

4. **Runner Interactivo y Memory Session (`src/index.ts`)**
   - Utilizamos un `InMemorySessionService` provisto por ADK — sin necesidad de drivers de base de datos.
   - Integrado en un Loop estándar de consola donde el streaming o resolución de Eventos es mostrado en pantalla.

## 🌟 Documentación Original de Google ADK
- [Documentación oficial y ejemplos (adk.dev)](https://adk.dev)
- Esta estructura servirá como plantilla para la creación de proyectos ADK modernos en JS/TS.
