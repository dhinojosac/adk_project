import { FunctionTool } from '@google/adk';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// 💰 Herramientas Financieras Inmobiliarias — Chile
// ═══════════════════════════════════════════════════════════

// Removed getUfValueTool

/**
 * Simula un crédito hipotecario chileno
 */
export const calculateMortgageTool = new FunctionTool({
  name: 'calculate_mortgage',
  description: `Simula un crédito hipotecario en Chile. Calcula el dividendo mensual, total pagado y total intereses.
  Tasas típicas en Chile 2026: entre 4.0% y 5.5% anual.
  Plazos comunes: 15, 20, 25 o 30 años.
  Pie mínimo en Chile: 10-20% del valor de la propiedad.`,
  parameters: z.object({
    precio_propiedad_uf: z.number().describe('Precio de la propiedad en UF'),
    escenarios: z.array(z.object({
      pie_porcentaje: z.number().describe('Porcentaje de pie (ej: 20 para 20%)'),
      tasa_anual_porcentaje: z.number().describe('Tasa de interés anual (ej: 4.5 para 4.5%)'),
      plazo_anos: z.number().describe('Plazo del crédito en años (ej: 25)'),
    })).describe('Lista de escenarios hipotecarios a simular'),
    uf_value_clp: z.number().describe('Valor actual de la UF en CLP').optional(),
  }),
  execute: async ({ precio_propiedad_uf, escenarios, uf_value_clp }: any) => {
    const uf = uf_value_clp || 38500;
    
    const resultados = escenarios.map((escenario: any) => {
      const { pie_porcentaje, tasa_anual_porcentaje, plazo_anos } = escenario;
      const pie_uf = precio_propiedad_uf * (pie_porcentaje / 100);
      const monto_credito_uf = precio_propiedad_uf - pie_uf;
      
      const tasa_mensual = (tasa_anual_porcentaje / 100) / 12;
      const n_cuotas = plazo_anos * 12;
      
      const dividendo_uf = monto_credito_uf * 
        (tasa_mensual * Math.pow(1 + tasa_mensual, n_cuotas)) / 
        (Math.pow(1 + tasa_mensual, n_cuotas) - 1);
      
      const total_pagado_uf = dividendo_uf * n_cuotas;
      const total_intereses_uf = total_pagado_uf - monto_credito_uf;

      return {
        escenario: {
          pie_porcentaje: `${pie_porcentaje}%`,
          tasa_anual: `${tasa_anual_porcentaje}%`,
          plazo: `${plazo_anos} años`,
        },
        resumen: {
          pie_uf: parseFloat(pie_uf.toFixed(1)),
          monto_credito_uf: parseFloat(monto_credito_uf.toFixed(1)),
        },
        dividendo_mensual: {
          uf: parseFloat(dividendo_uf.toFixed(2)),
          clp: Math.round(dividendo_uf * uf),
          clp_formatted: `$${Math.round(dividendo_uf * uf).toLocaleString('es-CL')} CLP`,
        },
        totales: {
          total_pagado_uf: parseFloat(total_pagado_uf.toFixed(1)),
          total_intereses_uf: parseFloat(total_intereses_uf.toFixed(1)),
          costo_total_clp: `$${Math.round(total_pagado_uf * uf).toLocaleString('es-CL')} CLP`,
        }
      };
    });

    return {
      status: 'success',
      precio_propiedad: `${precio_propiedad_uf} UF ($${Math.round(precio_propiedad_uf * uf).toLocaleString('es-CL')} CLP)`,
      resultados_escenarios: resultados
    };
  }
});

/**
 * Calcula el Cap Rate de una propiedad
 */
export const calculateCapRateTool = new FunctionTool({
  name: 'calculate_cap_rate',
  description: `Calcula la tasa de capitalización (Cap Rate) de una propiedad inmobiliaria.
  Cap Rates típicos en Santiago: 3.5% - 6%.
  Un Cap Rate > 5% es considerado bueno en Chile.`,
  parameters: z.object({
    precio_propiedad_uf: z.number().describe('Precio de la propiedad en UF'),
    arriendo_mensual_clp: z.number().describe('Arriendo mensual bruto en CLP'),
    gastos_comunes_clp: z.number().describe('Gastos comunes mensuales en CLP'),
    contribuciones_anuales_clp: z.number().describe('Contribuciones anuales (impuesto territorial) en CLP. Si no se sabe, estimar como 0.8% del valor comercial.').optional(),
    vacancia_porcentaje: z.number().describe('Porcentaje estimado de vacancia anual (ej: 5 para 5%). Típico: 5-8%').optional(),
    uf_value_clp: z.number().describe('Valor actual de la UF en CLP').optional(),
  }),
  execute: async ({ precio_propiedad_uf, arriendo_mensual_clp, gastos_comunes_clp, contribuciones_anuales_clp, vacancia_porcentaje, uf_value_clp }: any) => {
    const uf = uf_value_clp || 38500;
    const vacancia = (vacancia_porcentaje || 5) / 100;
    const precio_clp = precio_propiedad_uf * uf;
    
    // Ingresos
    const ingreso_bruto_anual = arriendo_mensual_clp * 12;
    const ingreso_efectivo = ingreso_bruto_anual * (1 - vacancia);
    
    // Gastos
    const gastos_comunes_anual = gastos_comunes_clp * 12;
    const contribuciones = contribuciones_anuales_clp || (precio_clp * 0.008);
    const mantencion_anual = precio_clp * 0.01; // 1% del valor para mantención
    const total_gastos = gastos_comunes_anual + contribuciones + mantencion_anual;
    
    // NOI y Cap Rate
    const noi = ingreso_efectivo - total_gastos;
    const cap_rate = (noi / precio_clp) * 100;
    const rentabilidad_bruta = (ingreso_bruto_anual / precio_clp) * 100;

    return {
      status: 'success',
      ingresos: {
        arriendo_bruto_anual: `$${ingreso_bruto_anual.toLocaleString('es-CL')} CLP`,
        vacancia: `${(vacancia * 100).toFixed(0)}%`,
        ingreso_efectivo_anual: `$${Math.round(ingreso_efectivo).toLocaleString('es-CL')} CLP`,
      },
      gastos: {
        gastos_comunes_anual: `$${gastos_comunes_anual.toLocaleString('es-CL')} CLP`,
        contribuciones_anual: `$${Math.round(contribuciones).toLocaleString('es-CL')} CLP`,
        mantencion_anual: `$${Math.round(mantencion_anual).toLocaleString('es-CL')} CLP`,
        total_gastos_anual: `$${Math.round(total_gastos).toLocaleString('es-CL')} CLP`,
      },
      resultados: {
        noi_anual: `$${Math.round(noi).toLocaleString('es-CL')} CLP`,
        cap_rate: `${cap_rate.toFixed(2)}%`,
        rentabilidad_bruta: `${rentabilidad_bruta.toFixed(2)}%`,
        evaluacion: cap_rate > 5 ? '✅ Buena rentabilidad' : cap_rate > 3.5 ? '⚠️ Rentabilidad aceptable' : '❌ Rentabilidad baja',
      }
    };
  }
});

/**
 * Compara arrendar vs comprar en un horizonte temporal
 */
export const compareRentVsBuyTool = new FunctionTool({
  name: 'compare_rent_vs_buy',
  description: `Compara financieramente arrendar vs comprar una propiedad en Chile, 
  considerando plusvalía, costo de oportunidad del pie, y acumulación de patrimonio.`,
  parameters: z.object({
    arriendo_mensual_clp: z.number().describe('Arriendo mensual actual en CLP'),
    precio_compra_uf: z.number().describe('Precio de compra en UF'),
    pie_porcentaje: z.number().describe('Porcentaje de pie (ej: 20)'),
    tasa_hipotecaria_anual: z.number().describe('Tasa hipotecaria anual (ej: 4.5)'),
    plazo_credito_anos: z.number().describe('Plazo del crédito en años (ej: 25)'),
    plusvalia_anual_porcentaje: z.number().describe('Plusvalía anual estimada (ej: 4.0 para 4%)'),
    reajuste_arriendo_anual: z.number().describe('Reajuste anual del arriendo (ej: 3.5 para 3.5%)').optional(),
    horizonte_anos: z.number().describe('Horizonte de evaluación en años (ej: 10)'),
    uf_value_clp: z.number().describe('Valor actual de la UF en CLP').optional(),
  }),
  execute: async ({ arriendo_mensual_clp, precio_compra_uf, pie_porcentaje, tasa_hipotecaria_anual, plazo_credito_anos, plusvalia_anual_porcentaje, reajuste_arriendo_anual, horizonte_anos, uf_value_clp }: any) => {
    const uf = uf_value_clp || 38500;
    const reajuste = (reajuste_arriendo_anual || 3.5) / 100;
    const plusvalia = plusvalia_anual_porcentaje / 100;
    
    const pie_uf = precio_compra_uf * (pie_porcentaje / 100);
    const monto_credito = precio_compra_uf - pie_uf;
    const tasa_mensual = (tasa_hipotecaria_anual / 100) / 12;
    const n_cuotas = plazo_credito_anos * 12;
    
    const dividendo_uf = monto_credito * 
      (tasa_mensual * Math.pow(1 + tasa_mensual, n_cuotas)) / 
      (Math.pow(1 + tasa_mensual, n_cuotas) - 1);
    const dividendo_clp = dividendo_uf * uf;

    // Simulación año a año
    const analisis_por_ano: Array<{ano: number, arriendo_acum: number, dividendo_acum: number, valor_propiedad_uf: number, equity_uf: number}> = [];
    let arriendo_acum = 0;
    let dividendo_acum = 0;
    let arriendo_actual = arriendo_mensual_clp;

    for (let year = 1; year <= horizonte_anos; year++) {
      arriendo_acum += arriendo_actual * 12;
      dividendo_acum += dividendo_clp * 12;
      arriendo_actual *= (1 + reajuste);
      
      const valor_propiedad = precio_compra_uf * Math.pow(1 + plusvalia, year);
      // Equity simplificado (valor propiedad - deuda restante aprox)
      const cuotas_pagadas = year * 12;
      const deuda_restante = monto_credito * (Math.pow(1 + tasa_mensual, n_cuotas) - Math.pow(1 + tasa_mensual, cuotas_pagadas)) / (Math.pow(1 + tasa_mensual, n_cuotas) - 1);
      const equity = valor_propiedad - deuda_restante;

      analisis_por_ano.push({
        ano: year,
        arriendo_acum: Math.round(arriendo_acum),
        dividendo_acum: Math.round(dividendo_acum),
        valor_propiedad_uf: parseFloat(valor_propiedad.toFixed(1)),
        equity_uf: parseFloat(equity.toFixed(1)),
      });
    }

    const ultimo = analisis_por_ano[analisis_por_ano.length - 1];
    const diferencia_gasto = ultimo.arriendo_acum - ultimo.dividendo_acum;

    return {
      status: 'success',
      parametros: {
        arriendo_inicial: `$${arriendo_mensual_clp.toLocaleString('es-CL')} CLP/mes`,
        dividendo_estimado: `$${Math.round(dividendo_clp).toLocaleString('es-CL')} CLP/mes`,
        diferencia_mensual: `$${Math.round(dividendo_clp - arriendo_mensual_clp).toLocaleString('es-CL')} CLP/mes`,
        pie_requerido: `${pie_uf.toFixed(0)} UF ($${Math.round(pie_uf * uf).toLocaleString('es-CL')} CLP)`,
      },
      resultado_a_horizonte: {
        horizonte: `${horizonte_anos} años`,
        total_gastado_arrendando: `$${ultimo.arriendo_acum.toLocaleString('es-CL')} CLP`,
        total_gastado_comprando: `$${ultimo.dividendo_acum.toLocaleString('es-CL')} CLP`,
        valor_propiedad_final: `${ultimo.valor_propiedad_uf} UF`,
        equity_acumulado: `${ultimo.equity_uf} UF ($${Math.round(ultimo.equity_uf * uf).toLocaleString('es-CL')} CLP)`,
        patrimonio_generado_arrendando: '0 UF (el arriendo no genera patrimonio)',
      },
      veredicto: diferencia_gasto > 0 
        ? `✅ Comprar ahorra $${diferencia_gasto.toLocaleString('es-CL')} CLP en gastos a ${horizonte_anos} años, MÁS generas ${ultimo.equity_uf} UF en patrimonio.`
        : `⚠️ Comprar cuesta $${Math.abs(diferencia_gasto).toLocaleString('es-CL')} CLP más en gastos a ${horizonte_anos} años, PERO generas ${ultimo.equity_uf} UF en patrimonio.`,
    };
  }
});

/**
 * Calcula el costo de oportunidad y retorno compuesto
 */
export const opportunityCostTool = new FunctionTool({
  name: 'calculate_opportunity_cost',
  description: `Calcula el costo de oportunidad de invertir el pie (down payment) en un instrumento financiero 
  (ej. depósito a plazo, fondo mutuo, S&P 500) en lugar de usarlo para comprar la propiedad.`,
  parameters: z.object({
    monto_inicial_uf: z.number().describe('Monto inicial a invertir en UF (usualmente el pie de la propiedad)'),
    tasa_retorno_anual_porcentaje: z.number().describe('Tasa de retorno anual esperada (ej: 5.0 para 5%)'),
    horizonte_anos: z.number().describe('Horizonte de evaluación en años'),
    uf_value_clp: z.number().describe('Valor actual de la UF en CLP').optional(),
  }),
  execute: async ({ monto_inicial_uf, tasa_retorno_anual_porcentaje, horizonte_anos, uf_value_clp }: any) => {
    const uf = uf_value_clp || 38500;
    const tasa = tasa_retorno_anual_porcentaje / 100;
    
    // Interés compuesto: A = P(1 + r)^t
    const monto_final_uf = monto_inicial_uf * Math.pow(1 + tasa, horizonte_anos);
    const ganancia_uf = monto_final_uf - monto_inicial_uf;

    return {
      status: 'success',
      parametros: {
        inversion_inicial: `${monto_inicial_uf.toFixed(1)} UF ($${Math.round(monto_inicial_uf * uf).toLocaleString('es-CL')} CLP)`,
        tasa_retorno_anual: `${tasa_retorno_anual_porcentaje}%`,
        horizonte: `${horizonte_anos} años`,
      },
      resultado: {
        monto_final_uf: parseFloat(monto_final_uf.toFixed(1)),
        ganancia_uf: parseFloat(ganancia_uf.toFixed(1)),
        monto_final_clp: `$${Math.round(monto_final_uf * uf).toLocaleString('es-CL')} CLP`,
        ganancia_clp: `$${Math.round(ganancia_uf * uf).toLocaleString('es-CL')} CLP`,
      },
      conclusion: `Si inviertes ${monto_inicial_uf.toFixed(1)} UF al ${tasa_retorno_anual_porcentaje}% anual por ${horizonte_anos} años, tendrías un total de ${monto_final_uf.toFixed(1)} UF. Tu ganancia neta sería de ${ganancia_uf.toFixed(1)} UF.`
    };
  }
});
