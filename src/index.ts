import { Runner, InMemorySessionService, getFunctionCalls, stringifyContent } from '@google/adk';
import * as readline from 'readline/promises';
import { coordinator } from './agents/realEstate/coordinator';
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
    appName: 'RealEstateEvaluator',
    agent: coordinator,
    sessionService
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🏠  Evaluador Inmobiliario — Equipo de Agentes ADK");
  console.log("   Analistas: Mercado | Plusvalía | Financiero | Barrio");
  console.log("══════════════════════════════════════════════════════════════");
  console.log("Escribe 'salir' para terminar.\n");
  
  const sessionId = 'session-' + Date.now();
  const userId = 'user-1';

  await sessionService.createSession({
    appName: 'RealEstateEvaluator',
    userId,
    sessionId,
    state: {}
  });

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    const responseStream = runner.runAsync({
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text: input }] }
    });

    process.stdout.write('\n🏠 Asesor: ');
    
    for await (const event of responseStream) {
      const functionCalls = getFunctionCalls(event);
      if (functionCalls && functionCalls.length > 0) {
          functionCalls.forEach(fc => {
            if (fc.name === 'EvaluationPipeline') {
              console.log('\n  ⏳ Iniciando análisis con 4 especialistas en paralelo...');
              console.log('  📊 Mercado | 📈 Plusvalía | 💰 Financiero | 🏘️ Barrio');
              console.log('  (esto puede tomar 1-2 minutos)\n');
            } else {
              console.log(`  [🔧 ${fc.name}]`);
            }
          });
      }
      const text = stringifyContent(event);
      if (text) {
         process.stdout.write(text);
      }
    }
    console.log('\n');
  }
  rl.close();
}

main().catch(error => {
  console.error("Error crítico en la ejecución del agente:", error);
});
