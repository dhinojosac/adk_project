# 🏠 Evaluador Inmobiliario — Multi-Agent System con Google ADK (TypeScript)

Sistema multi-agente de evaluación inmobiliaria para el mercado chileno, construido con el **Agent Development Kit (ADK)** de Google en TypeScript.

Analiza propiedades en Santiago de Chile considerando precio de mercado, plusvalía, análisis financiero y calidad de vida del barrio, generando un informe ejecutivo integral con recomendación de compra.

## 🧠 Arquitectura del Sistema

```
Usuario
  └─► Coordinator (conversacional, recopila datos)
        └─► EvaluationPipeline (SequentialAgent)
              ├─► ParallelAnalysis
              │     ├─► MarketAnalyst      (Google Search → comparables de mercado)
              │     ├─► PlusvaliaAnalyst   (Google Search → tendencias de plusvalía)
              │     └─► NeighborhoodAnalyst (Google Search → calidad de vida)
              ├─► FinancialAnalyst         (4 herramientas financieras)
              └─► Synthesizer              (informe ejecutivo de 8 secciones)
```

### Agentes

| Agente | Modelo | Rol | Herramientas |
|--------|--------|-----|--------------|
| **Coordinator** | gemini-2.5-flash | Conversa con el usuario, valida datos y delega al pipeline | AgentTool (pipeline) |
| **MarketAnalyst** | gemini-2.5-flash | Busca comparables y estima precio de mercado (UF/m²) | Google Search |
| **PlusvaliaAnalyst** | gemini-2.5-flash | Investiga tendencias de plusvalía y proyecciones a 5-10 años | Google Search |
| **NeighborhoodAnalyst** | gemini-2.5-flash | Evalúa calidad de vida del barrio (7 categorías, score 1-10) | Google Search |
| **FinancialAnalyst** | gemini-2.5-flash | Simula hipoteca, Cap Rate, arriendo vs compra, costo de oportunidad | 4 FunctionTools |
| **Synthesizer** | gemini-2.5-flash | Combina todos los análisis en un informe ejecutivo de 8 puntos | — |

### Herramientas Financieras (`src/tools/financialTools.ts`)

| Herramienta | Descripción |
|-------------|-------------|
| `calculate_mortgage` | Simula crédito hipotecario chileno con múltiples escenarios (pie, tasa, plazo) |
| `calculate_cap_rate` | Calcula Cap Rate (NOI / Valor) con vacancia, gastos comunes y mantención |
| `compare_rent_vs_buy` | Compara arrendar vs comprar en horizontes de 10, 15 y 20 años |
| `calculate_opportunity_cost` | Evalúa retorno alternativo del pie invertido en instrumentos financieros |

## 🔑 Características Clave

- **Estimación de precio sin valor de venta**: Si el usuario no conoce el precio de venta, el MarketAnalyst estima uno basado en comparables y el FinancialAnalyst lo utiliza automáticamente con un sistema de fallback de 3 niveles.
- **Valor UF en tiempo real**: Consulta automáticamente [mindicador.cl](https://mindicador.cl) para obtener el valor UF actualizado.
- **Análisis paralelo**: Los 3 analistas de investigación (mercado, plusvalía, barrio) corren simultáneamente para máxima eficiencia.
- **Informe ejecutivo de 8 secciones**: Resumen, veredicto de precio, análisis financiero, plusvalía, calidad de vida, pros/contras, recomendación final y puntos ciegos.
- **Generalizado por comuna**: Funciona para cualquier comuna de Santiago, no está hardcodeado para una zona específica.

## 🛠️ Requisitos

- Node.js versión `20` o superior
- Clave de API de Gemini (con facturación habilitada para evitar rate limits)

## 🚀 Instalación y Configuración

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar el entorno**
   Copia `.env.example` a `.env` y agrega tu clave:
   ```env
   GEMINI_API_KEY=tu_clave_aqui
   ```

## 🎮 Uso

### Modo interactivo (conversacional)
```bash
npm start
```
El sistema iniciará una conversación donde te pedirá los datos de la propiedad paso a paso.

### Modo test (input predefinido)
```bash
npx ts-node run_test.ts
```
Ejecuta una evaluación completa con datos de ejemplo predefinidos (Ricardo Lyon 3443).

## 📁 Estructura del Proyecto

```
src/
├── index.ts                          # Entry point interactivo
├── agents/
│   └── realEstate/
│       ├── coordinator.ts            # Agente principal (conversacional)
│       ├── pipeline.ts               # ParallelAgent + SequentialAgent
│       ├── marketAnalyst.ts          # Análisis de mercado y comparables
│       ├── plusvaliaAnalyst.ts        # Tendencias de plusvalía
│       ├── neighborhoodAnalyst.ts    # Calidad de vida del barrio
│       ├── financialAnalyst.ts       # Análisis financiero con tools
│       └── synthesizer.ts            # Generador de informe ejecutivo
└── tools/
    └── financialTools.ts             # 4 herramientas de cálculo financiero
```

## 📊 Ejemplo de Informe Generado

El sistema genera un informe ejecutivo con las siguientes secciones:

1. **Resumen Ejecutivo** — Visión general de la propiedad y conclusión principal
2. **Veredicto de Precio** — Precio estimado, comparación con mercado, rango de negociación
3. **Análisis Financiero** — Dividendo vs arriendo, Cap Rate, proyección patrimonial
4. **Plusvalía y Proyección** — Tendencia de zona, factores positivos y riesgos
5. **Calidad de Vida** — Score del barrio (7 categorías), pros y contras
6. **Pros y Contras** — Lista consolidada a favor y en contra de comprar
7. **Recomendación Final** — COMPRAR / NO COMPRAR / NEGOCIAR con nivel de confianza
8. **Puntos Ciegos** — Información faltante para decisión 100% informada

## 📚 Referencias

- [Google ADK Documentation](https://adk.dev)
- [Gemini API](https://ai.google.dev)
- [mindicador.cl API](https://mindicador.cl) (valor UF en tiempo real)
