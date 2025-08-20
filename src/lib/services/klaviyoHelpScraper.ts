import * as cheerio from 'cheerio';

export interface KlaviyoHelpArticle {
  url: string;
  title: string;
  content: string;
  sections: {
    heading: string;
    content: string;
    level: number; // h1, h2, h3 etc
    subSections?: string[];
  }[];
  navigation: string[];
  limitations: string[];
  prerequisites: string[];
  keyFeatures: string[];
  uiElements: string[];
  codeExamples: string[];
  links: { text: string; url: string }[];
  callouts: { type: string; content: string }[];
  structuralElements: {
    hasTabs: boolean;
    hasSteps: boolean;
    hasCodeBlocks: boolean;
    hasImages: boolean;
    hasCallouts: boolean;
  };
}

export class KlaviyoHelpScraper {
  private baseUrl = 'https://help.klaviyo.com';
  
  async scrapeArticle(url: string): Promise<KlaviyoHelpArticle> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('h1').first().text().trim() || 
                   $('title').text().replace(' | Klaviyo', '').trim();
      
      const sections: KlaviyoHelpArticle['sections'] = [];
      const navigation: string[] = [];
      const limitations: string[] = [];
      const prerequisites: string[] = [];
      const keyFeatures: string[] = [];
      const uiElements: string[] = [];
      const codeExamples: string[] = [];
      const links: { text: string; url: string }[] = [];
      const callouts: { type: string; content: string }[] = [];
      
      // Extract main content area
      const contentArea = $('.article-body, .content-body, main').first();
      
      // Extract code examples
      contentArea.find('code, pre, .code-block, .highlight').each((_, element) => {
        const codeText = $(element).text().trim();
        if (codeText && codeText.length > 10) { // Only capture substantial code
          codeExamples.push(codeText);
        }
      });
      
      // Extract links
      contentArea.find('a').each((_, element) => {
        const $link = $(element);
        const text = $link.text().trim();
        const href = $link.attr('href');
        if (text && href && !href.startsWith('#')) {
          links.push({ text, url: href });
        }
      });
      
      // Extract callouts (notes, warnings, tips)
      contentArea.find('.note, .warning, .tip, .callout, .alert').each((_, element) => {
        const $callout = $(element);
        const type = $callout.attr('class')?.split(' ')[0] || 'note';
        const content = $callout.text().trim();
        if (content) {
          callouts.push({ type, content });
        }
      });
      
      // Extract UI elements mentioned in text
      const uiElementPatterns = [
        /button|tab|menu|dropdown|field|input|checkbox|radio|toggle|slider|modal|dialog|popup|panel|sidebar|toolbar|navbar|breadcrumb/gi
      ];
      const fullText = contentArea.text();
      uiElementPatterns.forEach(pattern => {
        const matches = fullText.match(pattern) || [];
        uiElements.push(...matches.map(m => m.toLowerCase()));
      });
      
      // Extract sections with headings
      contentArea.find('h1, h2, h3, h4, h5, h6').each((_, element) => {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        const level = parseInt(element.tagName.charAt(1)); // Extract number from h1, h2, etc.
        
        // Collect content until next heading
        let content = '';
        const subSections: string[] = [];
        let $current = $heading.next();
        
        while ($current.length && !$current.is('h1, h2, h3, h4, h5, h6')) {
          if ($current.is('p, ul, ol, div:not(.sidebar)')) {
            content += $current.text().trim() + '\n';
          }
          
          // Extract sub-bullets or numbered items as sub-sections
          if ($current.is('ul, ol')) {
            $current.find('li').each((_, li) => {
              const liText = $(li).text().trim();
              if (liText && liText.length > 5) {
                subSections.push(liText);
              }
            });
          }
          
          $current = $current.next();
        }
        
        if (headingText && content) {
          sections.push({
            heading: headingText,
            content: content.trim(),
            level,
            subSections: subSections.length > 0 ? subSections : undefined
          });
          
          // Extract navigation steps
          if (headingText.toLowerCase().includes('navigate') || 
              headingText.toLowerCase().includes('how to') ||
              headingText.toLowerCase().includes('steps')) {
            const steps = content.match(/\d+\.\s+[^\n]+/g) || [];
            navigation.push(...steps);
          }
          
          // Extract limitations
          if (headingText.toLowerCase().includes('limitation') || 
              headingText.toLowerCase().includes('restriction') ||
              headingText.toLowerCase().includes('note')) {
            const limits = content.split('\n').filter(line => 
              line.toLowerCase().includes('cannot') ||
              line.toLowerCase().includes('not supported') ||
              line.toLowerCase().includes('limited to') ||
              line.toLowerCase().includes('maximum') ||
              line.toLowerCase().includes('minimum')
            );
            limitations.push(...limits);
          }
          
          // Extract prerequisites
          if (headingText.toLowerCase().includes('prerequisite') || 
              headingText.toLowerCase().includes('before you begin') ||
              headingText.toLowerCase().includes('requirement')) {
            prerequisites.push(content.trim());
          }
          
          // Extract key features
          if (headingText.toLowerCase().includes('feature') || 
              headingText.toLowerCase().includes('capabilities') ||
              headingText.toLowerCase().includes('what you can do')) {
            const features = content.split('\n').filter(line => 
              line.trim().length > 5 && (line.includes('•') || line.includes('-') || /^\d+\./.test(line.trim()))
            );
            keyFeatures.push(...features.map(f => f.replace(/^[•\-\d\.\s]+/, '').trim()));
          }
        }
      });
      
      // Get full article content for context
      const fullContent = contentArea.text()
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Extract navigation breadcrumbs if available
      $('.breadcrumb, .breadcrumbs').find('a, span').each((_, el) => {
        const breadcrumb = $(el).text().trim();
        if (breadcrumb && !breadcrumb.includes('Home')) {
          navigation.unshift(`Section: ${breadcrumb}`);
        }
      });
      
      // Determine structural elements
      const structuralElements = {
        hasTabs: $('.tab, .tabs, [role="tab"]').length > 0,
        hasSteps: /step\s+\d+|^\s*\d+\./gm.test(fullContent),
        hasCodeBlocks: codeExamples.length > 0,
        hasImages: $('img').length > 0,
        hasCallouts: callouts.length > 0
      };
      
      return {
        url,
        title,
        content: fullContent,
        sections,
        navigation: [...new Set(navigation)], // Remove duplicates
        limitations: [...new Set(limitations)],
        prerequisites: [...new Set(prerequisites)],
        keyFeatures: [...new Set(keyFeatures)],
        uiElements: [...new Set(uiElements)],
        codeExamples: [...new Set(codeExamples)],
        links: links.slice(0, 10), // Limit to avoid too many
        callouts,
        structuralElements
      };
    } catch (error) {
      console.error('Error scraping Klaviyo help article:', error);
      throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async scrapeMultipleArticles(urls: string[]): Promise<KlaviyoHelpArticle[]> {
    const validUrls = urls.filter(url => 
      url.trim() && url.includes('klaviyo.com')
    );
    
    if (validUrls.length === 0) {
      throw new Error('No valid Klaviyo help URLs provided');
    }
    
    const articles = await Promise.allSettled(
      validUrls.map(url => this.scrapeArticle(url))
    );
    
    return articles
      .filter((result): result is PromiseFulfilledResult<KlaviyoHelpArticle> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }
  
  extractStyleAndTone(articles: KlaviyoHelpArticle[]): {
    commonPhrases: string[];
    structurePattern: string[];
    toneIndicators: string[];
  } {
    const commonPhrases: string[] = [];
    const structurePattern: string[] = [];
    const toneIndicators: string[] = [];
    
    // Analyze structure patterns
    const headingPatterns = new Set<string>();
    articles.forEach(article => {
      article.sections.forEach(section => {
        const heading = section.heading.toLowerCase();
        if (heading.includes('overview')) headingPatterns.add('Overview section');
        if (heading.includes('how to')) headingPatterns.add('How-to guides');
        if (heading.includes('example')) headingPatterns.add('Examples section');
        if (heading.includes('troubleshoot')) headingPatterns.add('Troubleshooting');
        if (heading.includes('best practice')) headingPatterns.add('Best practices');
      });
    });
    structurePattern.push(...Array.from(headingPatterns));
    
    // Extract common phrases
    const phrasePatterns = [
      /To\s+\w+,\s+follow these steps:/gi,
      /Navigate to\s+[\w\s]+/gi,
      /Click\s+(?:on\s+)?the\s+[\w\s]+(?:button|link|tab)/gi,
      /Select\s+[\w\s]+from the\s+(?:dropdown|menu)/gi,
      /You can\s+[\w\s]+by/gi,
      /This allows you to\s+[\w\s]+/gi,
      /Note:\s+[\w\s]+/gi,
      /Important:\s+[\w\s]+/gi
    ];
    
    articles.forEach(article => {
      phrasePatterns.forEach(pattern => {
        const matches = article.content.match(pattern) || [];
        commonPhrases.push(...matches.slice(0, 2)); // Limit to avoid too many
      });
    });
    
    // Detect tone indicators
    const formalWords = ['utilize', 'implement', 'configure', 'establish'];
    const friendlyWords = ['simply', 'easily', 'quickly', 'just'];
    
    let formalCount = 0;
    let friendlyCount = 0;
    
    articles.forEach(article => {
      const lowerContent = article.content.toLowerCase();
      formalWords.forEach(word => {
        if (lowerContent.includes(word)) formalCount++;
      });
      friendlyWords.forEach(word => {
        if (lowerContent.includes(word)) friendlyCount++;
      });
    });
    
    if (formalCount > friendlyCount) {
      toneIndicators.push('Professional and formal');
    } else {
      toneIndicators.push('Friendly and approachable');
    }
    
    // Check for use of "you" vs passive voice
    const hasYou = articles.some(a => a.content.includes('you'));
    if (hasYou) {
      toneIndicators.push('Direct address (uses "you")');
    }
    
    return {
      commonPhrases: [...new Set(commonPhrases)].slice(0, 10),
      structurePattern,
      toneIndicators
    };
  }
}