import { ParallelAgent, SequentialAgent } from '@google/adk';
import { marketAnalyst } from './marketAnalyst';
import { plusvaliaAnalyst } from './plusvaliaAnalyst';
import { financialAnalyst } from './financialAnalyst';
import { neighborhoodAnalyst } from './neighborhoodAnalyst';
import { synthesizer } from './synthesizer';

/**
 * Los 4 analistas corren en paralelo para máxima eficiencia.
 * Cada uno investiga un ángulo diferente de la propiedad.
 */
export const parallelAnalysis = new ParallelAgent({
  name: 'ParallelAnalysis',
  description: 'Ejecuta 4 análisis en paralelo: mercado, plusvalía, financiero y barrio.',
  subAgents: [marketAnalyst, plusvaliaAnalyst, financialAnalyst, neighborhoodAnalyst],
});

/**
 * Pipeline completo: análisis paralelo → síntesis en informe ejecutivo.
 */
export const evaluationPipeline = new SequentialAgent({
  name: 'EvaluationPipeline',
  description: 'Pipeline completo de evaluación inmobiliaria. Ejecuta 4 análisis en paralelo y luego sintetiza en un informe ejecutivo con recomendación.',
  subAgents: [parallelAnalysis, synthesizer],
});
