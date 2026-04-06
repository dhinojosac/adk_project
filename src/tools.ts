import { FunctionTool } from '@google/adk';
import { z } from 'zod';

export const weatherTool = new FunctionTool({
  name: 'get_weather',
  description: 'Obtiene el clima actual de una ubicación específica.',
  parameters: z.object({
    location: z.string().describe('La ciudad y el estado, ej. Santiago, Chile'),
  }),
  execute: async (input) => {
    // Simulamos consultar API del clima
    const weathers = ['Soleado, 25°C', 'Lluvioso, 18°C', 'Nublado, 20°C', 'Templado, 22°C'];
    const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
    return `El clima en ${input.location} es: ${randomWeather}`;
  }
});
