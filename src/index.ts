import { Runner, InMemorySessionService, getFunctionCalls, stringifyContent } from '@google/adk';
import * as readline from 'readline/promises';
import { coordinator } from './agents/realEstate/coordinator';
import { financialAnalyst } from './agents/realEstate/financialAnalyst';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: No se encontró la variable GEMINI_API_KEY en el entorno.");
    console.error("Copia el archivo .env.example como .env y coloca tu clave.");
    process.exit(1);
  }

  console.log("⏳ Obteniendo valor UF actualizado...");
  let uf = 38500;
  try {
    const res = await fetch('https://mindicador.cl/api/uf');
    const data = await res.json();
    uf = data.serie[0].valor;
    console.log(`✅ UF Actualizada: $${uf} CLP\n`);
  } catch (error) {
    console.log(`⚠️ No se pudo conectar a mindicador.cl. Usando UF referencial de $${uf} CLP.\n`);
  }

  financialAnalyst.instruction += `\n\nVALOR UF ACTUAL A UTILIZAR: ${uf} CLP. Usa siempre este valor en tus cálculos si el usuario no dice lo contrario.`;

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
          functionCalls.forEach((fc: any) => {
            if (fc.name === 'EvaluationPipeline') {
              console.log('\n  ⏳ Iniciando análisis en Pipeline secuencial...');
              console.log('  1. 📊 Análisis paralelo (Mercado, Plusvalía, Barrio)');
              console.log('  2. 💰 Análisis Financiero Integral');
              console.log('  3. 📑 Síntesis y Recomendación Ejecutiva');
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
