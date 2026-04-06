import { Runner, InMemorySessionService, getFunctionCalls, stringifyContent } from '@google/adk';
import * as readline from 'readline/promises';
import { weatherAgent } from './agents/weatherBot';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: No se encontró la variable GEMINI_API_KEY en el entorno.");
    console.error("Copia el archivo .env.example como .env y coloca tu clave.");
    process.exit(1);
  }

  const sessionService = new InMemorySessionService();
  
  const runner = new Runner({
    appName: 'WeatherAgentTeam',
    agent: weatherAgent,
    sessionService
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("------------------------------------------------------------------");
  console.log("🌦️  Agent Team en línea (WeatherBot + GreetingBot)");
  console.log("Escribe 'salir' para terminar.");
  console.log("------------------------------------------------------------------");
  
  const sessionId = 'session-' + Date.now();
  const userId = 'user-1';

  // Crear la sesión antes de usarla
  await sessionService.createSession({
    appName: 'WeatherAgentTeam',
    userId,
    sessionId,
    state: {}
  });

  while (true) {
    const input = await rl.question('\nTú: ');
    if (input.toLowerCase() === 'salir') break;

    const responseStream = runner.runAsync({
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text: input }] }
    });

    process.stdout.write('Team: ');
    
    for await (const event of responseStream) {
      const functionCalls = getFunctionCalls(event);
      if (functionCalls && functionCalls.length > 0) {
          functionCalls.forEach(fc => {
            console.log(`\n  [Llamada a agente/herramienta] -> ${fc.name}`);
          });
      }
      const text = stringifyContent(event);
      if (text) {
         process.stdout.write(text + '\n');
      }
    }
  }
  rl.close();
}

main().catch(error => {
  console.error("Error crítico en la ejecución del agente:", error);
});
