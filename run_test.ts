import { Runner, InMemorySessionService, getFunctionCalls, stringifyContent } from '@google/adk';
import { coordinator } from './src/agents/realEstate/coordinator';
import { financialAnalyst } from './src/agents/realEstate/financialAnalyst';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const uf = 38500;
  financialAnalyst.instruction += `\n\nVALOR UF ACTUAL A UTILIZAR: ${uf} CLP. Usa siempre este valor en tus cálculos si el usuario no dice lo contrario.`;

  const sessionService = new InMemorySessionService();
  const runner = new Runner({ appName: 'RealEstateEvaluator', agent: coordinator, sessionService });
  const sessionId = 'session-' + Date.now();
  const userId = 'user-1';

  await sessionService.createSession({ appName: 'RealEstateEvaluator', userId, sessionId, state: {} });

  const turns = [
      "Hola, quiero evaluar un departamento que estoy pensando comprar en Santiago",
      "Tiene dos dormitorios y dos baños, dos terrazas con vista norte, logia para lavadora, estacionamiento y bodega en Ricardo Lyon 3443.",
      "Pago de arriendo 650.000 CLP. Gastos comunes 100.000 CLP. No tengo el valor aún de venta del propietario, pero es lo que también busco evaluar con esto. Tiene aproximadamente 60 m² y una superficie útil de 55 m²."
  ];

  for (let i = 0; i < turns.length; i++) {
      console.log(`\n\n=== TURNO ${i + 1} (Humano) ===\nTú: ${turns[i]}\n===============================`);
      console.log("🏠 Asesor: ");
      const responseStream = runner.runAsync({
        userId,
        sessionId,
        newMessage: { role: 'user', parts: [{ text: turns[i] }] }
      });

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
      
      // Wait a little before the next turn
  }
}

main();
