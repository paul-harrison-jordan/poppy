import { JobsExtractorAgent, JobsExtractionResult } from '../agents/jobsExtractor';
import { ScopeAnalyzerAgent, ScopeAnalysisResult } from '../agents/scopeAnalyzer';
import { CompetitiveLandscaperAgent, CompetitiveLandscapeResult } from '../agents/competitiveLandscaper';
import { RoadmapPositionerAgent, RoadmapPositionResult } from '../agents/roadmapPositioner';
import { EngineeringEstimatorAgent, EngineeringEstimateResult } from '../agents/engineeringEstimator';
import { PRDWriterAgent, PRDSection } from '../agents/prdWriter';
import { PMPreferenceProfile } from '../types/knowledge';

export interface AnalysisBundle {
  jobs: JobsExtractionResult;
  scope: ScopeAnalysisResult;
  competitive: CompetitiveLandscapeResult;
  roadmap: RoadmapPositionResult;
  engineering: EngineeringEstimateResult;
}

export class PRDOrchestrator {
  private jobsExtractor: JobsExtractorAgent;
  private scopeAnalyzer: ScopeAnalyzerAgent;
  private competitiveLandscaper: CompetitiveLandscaperAgent;
  private roadmapPositioner: RoadmapPositionerAgent;
  private engineeringEstimator: EngineeringEstimatorAgent;
  private prdWriter: PRDWriterAgent;

  constructor() {
    this.jobsExtractor = new JobsExtractorAgent();
    this.scopeAnalyzer = new ScopeAnalyzerAgent();
    this.competitiveLandscaper = new CompetitiveLandscaperAgent();
    this.roadmapPositioner = new RoadmapPositionerAgent();
    this.engineeringEstimator = new EngineeringEstimatorAgent();
    this.prdWriter = new PRDWriterAgent();
  }

  async generateAnalysisBundle(
    initialInput: string, 
    pmProfile?: PMPreferenceProfile,
    competitorUrls?: string[]
  ): Promise<AnalysisBundle> {
    console.log(`[PRDOrchestrator] Starting analysis bundle generation for: "${initialInput}"`);
    if (competitorUrls && competitorUrls.length > 0) {
      console.log(`[PRDOrchestrator] Will analyze competitor help docs: ${competitorUrls.join(', ')}`);
    }
    const startTime = Date.now();

    try {
      // Phase 1: Parallel Analysis (fast)
      console.log(`[PRDOrchestrator] Phase 1: Running parallel analysis agents`);
      
      // Use real help docs analysis if competitor URLs are provided
      let competitiveResult;
      if (competitorUrls && competitorUrls.length > 0) {
        console.log(`[PRDOrchestrator] Analyzing ${competitorUrls.length} competitor help docs with real data`);
        const competitiveAnalysis = await this.competitiveLandscaper.analyzeWithHelpDocs(initialInput, competitorUrls);
        competitiveResult = { success: true, result: competitiveAnalysis };
      } else {
        competitiveResult = await this.competitiveLandscaper.execute({ jobs: initialInput });
      }

      const [jobsResult, roadmapResult] = await Promise.all([
        this.jobsExtractor.execute({ input: initialInput }),
        this.roadmapPositioner.execute({ 
          currentRoadmap: JSON.stringify(pmProfile?.personal_context?.teamStrategy || []),
          featureIdea: initialInput 
        })
      ]);

      // Validate Phase 1 results
      if (!jobsResult.success) {
        throw new Error(`Jobs extraction failed: ${jobsResult.error}`);
      }
      if (!competitiveResult.success) {
        throw new Error(`Competitive analysis failed: ${competitiveResult.error || 'Unknown error'}`);
      }
      if (!roadmapResult.success) {
        throw new Error(`Roadmap positioning failed: ${roadmapResult.error}`);
      }

      const extractedJobs = (jobsResult.result as { jobs: unknown[] }).jobs;
      console.log(`[PRDOrchestrator] Phase 1 completed. Extracted ${extractedJobs.length} jobs`);

      // Phase 2: Scope Definition (dependent on jobs)
      console.log(`[PRDOrchestrator] Phase 2: Running scope analysis`);
      const scopeResult = await this.scopeAnalyzer.execute({
        jobs: JSON.stringify(extractedJobs),
        constraints: pmProfile?.personal_context?.teamStrategy || 'Standard development constraints'
      });

      if (!scopeResult.success) {
        throw new Error(`Scope analysis failed: ${scopeResult.error}`);
      }

      const scopeAnalysis = scopeResult.result as { inScope: unknown[], outOfScope: unknown[] };
      console.log(`[PRDOrchestrator] Phase 2 completed. In-scope: ${scopeAnalysis.inScope.length}, Out-scope: ${scopeAnalysis.outOfScope.length}`);

      // Phase 3: Engineering Analysis (dependent on scope)
      console.log(`[PRDOrchestrator] Phase 3: Running engineering estimation`);
      const engineeringResult = await this.engineeringEstimator.execute({
        scope: JSON.stringify(scopeResult.result),
        teamStructure: this.formatTeamStructure(pmProfile)
      });

      if (!engineeringResult.success) {
        throw new Error(`Engineering estimation failed: ${engineeringResult.error}`);
      }

      const engineeringAnalysis = engineeringResult.result as { storyPoints: number };
      console.log(`[PRDOrchestrator] Phase 3 completed. Estimated ${engineeringAnalysis.storyPoints} story points`);

      const bundle: AnalysisBundle = {
        jobs: jobsResult.result as JobsExtractionResult,
        scope: scopeResult.result as ScopeAnalysisResult,
        competitive: competitiveResult.result as CompetitiveLandscapeResult,
        roadmap: roadmapResult.result as RoadmapPositionResult,
        engineering: engineeringResult.result as EngineeringEstimateResult
      };

      const totalTime = Date.now() - startTime;
      console.log(`[PRDOrchestrator] Analysis bundle completed in ${totalTime}ms`);

      return bundle;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`[PRDOrchestrator] Failed after ${totalTime}ms:`, error);
      throw error;
    }
  }

  async generateSections(analysisBundle: AnalysisBundle): Promise<PRDSection[]> {
    console.log(`[PRDOrchestrator] Generating PRD sections`);
    
    const sectionGenerators = [
      { name: 'executive_summary', dependencies: ['jobs', 'competitive'] },
      { name: 'problem_statement', dependencies: ['jobs', 'scope'] }
    ];

    const sections: PRDSection[] = [];

    for (const section of sectionGenerators) {
      const filteredContext = this.filterContext(analysisBundle, section.dependencies);
      
      console.log(`[PRDOrchestrator] Generating ${section.name} section`);
      const result = await this.prdWriter.execute({
        sectionName: section.name,
        context: JSON.stringify(filteredContext)
      });

      if (result.success) {
        const prdSection = result.result as PRDSection;
        sections.push(prdSection);
        console.log(`[PRDOrchestrator] ${section.name} section generated (${prdSection.content.length} chars)`);
      } else {
        console.error(`[PRDOrchestrator] Failed to generate ${section.name}:`, result.error);
        // Add placeholder section so we don't break the flow
        sections.push({
          sectionName: section.name,
          content: `# ${section.name.replace('_', ' ').toUpperCase()}\n\nError generating this section: ${result.error}`
        });
      }
    }

    return sections;
  }

  private filterContext(analysisBundle: AnalysisBundle, dependencies: string[]): Partial<AnalysisBundle> {
    const filteredContext: Partial<AnalysisBundle> = {};
    
    dependencies.forEach(dep => {
      if (dep === 'jobs' && analysisBundle.jobs) {
        filteredContext.jobs = analysisBundle.jobs;
      }
      if (dep === 'scope' && analysisBundle.scope) {
        filteredContext.scope = analysisBundle.scope;
      }
      if (dep === 'competitive' && analysisBundle.competitive) {
        filteredContext.competitive = analysisBundle.competitive;
      }
      if (dep === 'roadmap' && analysisBundle.roadmap) {
        filteredContext.roadmap = analysisBundle.roadmap;
      }
      if (dep === 'engineering' && analysisBundle.engineering) {
        filteredContext.engineering = analysisBundle.engineering;
      }
    });

    return filteredContext;
  }

  private formatTeamStructure(pmProfile?: PMPreferenceProfile): string {
    if (!pmProfile?.personal_context?.teamStrategy) {
      return 'Standard development team';
    }

    // Extract team info from profile or use defaults
    return `Team context: ${pmProfile.personal_context.teamStrategy}`;
  }
}