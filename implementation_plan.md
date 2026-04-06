# Real Estate Evaluator Upgrades (Architecture & Code)

This implementation plan focuses on executing the architectural improvements, tool optimizations, coordinating agent upgrades, and bug fixes as summarized in the request.

## User Review Required
> [!IMPORTANT]
> - Please review the new sequential workflow and confirm if `index.ts` is the best place to perform the one-time fetch of the UF value. 
> - Review the `inputSchema` for the bridge tool over the pipeline. I plan to define the schema using `z.object` inside a `FunctionTool` wrapper or within the `AgentTool` configuration, given the framework's capabilities.
> - Verify the proposed `opportunityCostTool` methodology.

## Proposed Changes

---
### 1. Architecture & Orchestration (Pipeline)

#### [MODIFY] [pipeline.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/agents/realEstate/pipeline.ts)
- Modify `parallelAnalysis` to only include `[marketAnalyst, plusvaliaAnalyst, neighborhoodAnalyst]`.
- Update `evaluationPipeline` to be a 3-step sequence: `[parallelAnalysis, financialAnalyst, synthesizer]`. This resolves the logical race condition, ensuring financial analysis uses results from the first three.

#### [MODIFY] [marketAnalyst.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/agents/realEstate/marketAnalyst.ts)
#### [MODIFY] [plusvaliaAnalyst.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/agents/realEstate/plusvaliaAnalyst.ts)
#### [MODIFY] [neighborhoodAnalyst.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/agents/realEstate/neighborhoodAnalyst.ts)
- Update prompts in all three parallel agents to strictly return **ONLY structured JSON**.
- Apply **Negative Prompts** to enforce limits (e.g., Neighborhood Analyst should strictly NOT perform financial/price evaluations, etc.).

---
### 2. Tools & Performance Optimization

#### [MODIFY] [financialTools.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/tools/financialTools.ts)
- Drop `getUfValueTool`.
- Update `calculateMortgageTool` to replace the individual params with an array parameter strictly handling **multiple mortgage scenarios** in a single call.
- Modify `compareRentVsBuyTool` to use `plazo_credito_anos` as a dynamic parameter instead of being hardcoded to 25.
- Add new `opportunityCostTool` to compute compound interest and opportunity costs associated with the mortgage "pie" (down payment).

#### [MODIFY] [financialAnalyst.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/agents/realEstate/financialAnalyst.ts)
- Update tools to reflect the changes in `financialTools.ts`.
- Adjust instruction to use the multi-scenario batch process of `calculateMortgageTool` and use `opportunityCostTool` instead of mental math.
- Update instruction to expect the UF value dynamically injected (via `index.ts`).

#### [MODIFY] [index.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/index.ts)
- Add startup logic to fetch the UF value from `mindicador.cl`.
- Inject the fetched UF value into `financialAnalyst.ts` via string modification (`financialAnalyst.instruction += "\nUF Value: " + uf;`) before starting the runner.

---
### 3. Coordinator Agent Improvements

#### [MODIFY] [coordinator.ts](file:///c:/Users/dhino/Documents/Codes-2026/ADK_project/src/agents/realEstate/coordinator.ts)
- Introduce a Zod `z.object` schema to effectively type and format the input message to the evaluation pipeline. I will achieve this by replacing the free-form string formatting with a robust typed invocation using `FunctionTool` wrapping the pipeline if `AgentTool` doesn't natively accept rigid z.object inputs.
- Add strict **Commercial Sanity Validation**: Check if user input is logical (not substituting thousands of UF for millions of CLP incorrectly) before running the pipeline.
- Make the **Trigger strict**: Do not evaluate missing any core field (Address, m², Sale Price, and Monthly Rent).

## Open Questions
- To correctly replace the `EvaluationPipeline` trigger in the coordinator: is there a preferred method to wrap the Pipeline Agent into a strictly typed tool? If not specified, I will use a custom `FunctionTool` that parses the structured input and internally delegates context to the `evaluationPipeline` using the Session state.

## Verification Plan
### Automated Tests
- None specified, but I will run the bot manually using `npm run start` (or similar start script) relying on terminal input to ensure it starts without typescript errors and that the pipeline triggers successfully without crashing.

### Manual Verification
- A user test session mocking all 4 parameters to evaluate property outputs and ensure JSON contracts function seamlessly behind the scenes. Review if UF is fetched accurately upon startup.
