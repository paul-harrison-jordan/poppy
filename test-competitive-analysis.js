// Quick test script to verify competitive analysis returns real URLs
// Run with: node test-competitive-analysis.js

const testCompetitiveAnalysis = async () => {
  const testPayload = {
    PRD: "I've created an automated customer support routing system that uses AI to intelligently direct customer inquiries to the right support agents based on the inquiry type, customer tier, and agent expertise.",
    COMPETITORS: ["Zendesk", "Intercom", "Freshdesk"],
    WHY_WE_WIN: "Our AI-powered routing is 40% more accurate than rule-based systems, reducing customer wait times and improving satisfaction.",
    WHY_WE_LOSE: "We lack the extensive integration ecosystem and established brand recognition of larger competitors."
  };

  try {
    console.log('🧪 Testing Competitive Analysis API...\n');
    
    const response = await fetch('http://localhost:3000/api/competitive-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would include auth headers
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Analysis completed successfully!\n');
      
      console.log('📊 Results Summary:');
      console.log(`- Problem: ${result.analysis.problemStatement}`);
      console.log(`- Competitors analyzed: ${result.analysis.competitorApproaches.length}`);
      console.log(`- Processing time: ${result.metadata?.processingTime}ms`);
      console.log(`- Search results found: ${result.metadata?.searchResultsFound}\n`);
      
      console.log('🔗 Source URLs Found:');
      result.analysis.competitorApproaches.forEach(comp => {
        console.log(`\n${comp.competitor}:`);
        if (comp.sources && comp.sources.length > 0) {
          comp.sources.forEach((source, index) => {
            console.log(`  ${index + 1}. ${source.url}`);
            console.log(`     "${source.title}"`);
          });
        } else {
          console.log('  No sources found');
        }
      });
      
      console.log('\n🎯 Key Insights:');
      if (result.analysis.comparison.keyInsights) {
        result.analysis.comparison.keyInsights.forEach((insight, index) => {
          console.log(`  ${index + 1}. ${insight}`);
        });
      }
      
    } else {
      console.log('❌ Analysis failed:', result.error);
    }
    
  } catch (error) {
    console.log('🚨 Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. Your dev server is running: npm run dev');
    console.log('2. You have proper authentication setup');
    console.log('3. Environment variables are configured');
  }
};

// Run the test
testCompetitiveAnalysis();