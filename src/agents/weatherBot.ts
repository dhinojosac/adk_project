import { LlmAgent } from '@google/adk';
import { weatherTool } from '../tools';
import { greeterAgent } from './greeter';
import { AgentTool } from '@google/adk';

export const weatherAgent = new LlmAgent({
  name: 'WeatherBot',
  instruction: `Eres el agente principal. Tu propósito superior es ayudar al usuario con su clima local, pero con habilidades de derivación.
- Ante preguntas sobre el clima, DEBES usar tu herramienta "get_weather".
- Ante cualquier expresión de saludo ("hola", "buenos días") o de despedida ("adiós", "nos vemos"), DEBES transferir el control al agente "GreetingBot".`,
  model: 'gemini-2.5-flash',
  tools: [weatherTool, new AgentTool({ agent: greeterAgent })],
  // Input Guardrail (Safety pre-modelo)
  beforeModelCallback: (params) => {
    const contents = params.request.contents;
    if (!contents || contents.length === 0) return undefined;
    
    const lastMsg = contents[contents.length - 1];
    if (lastMsg.role === 'user' && lastMsg.parts?.[0]?.text) {
      const input = lastMsg.parts[0].text.toLowerCase();
      // Guardrail súper básico de ejemplo
      if (input.includes('violencia') || input.includes('destruir')) {
        return {
          content: {
            role: 'model',
            parts: [{ text: "Guardrail activado: No puedo conversar sobre temas maliciosos o violentos." }]
          }
        };
      }
    }
  },
  // Tool Guardrail (Validación pre-acción)
  beforeToolCallback: (params) => {
    if (params.tool.name === 'get_weather') {
      console.log(`[Seguridad/Auditoría] Validando parámetros de get_weather: ${JSON.stringify(params.args)}`);
    }
    return undefined;
  }
});
