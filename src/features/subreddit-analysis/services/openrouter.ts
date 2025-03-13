/* src/features/subreddit-analysis/services/openrouter.ts */

import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from '../lib/prompts';

export class OpenRouter {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private readonly MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct:free';
  private readonly TIMEOUT = 120000; // Increased to 120 seconds
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.apiKey = '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';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Title': 'SubPirate - Reddit Marketing Analysis',
      'Content-Type': 'application/json'
    };

    // Only add HTTP-Referer in browser environments
    if (typeof window !== 'undefined' && window.location?.origin) {
      headers['HTTP-Referer'] = window.location.origin;
    }

    return headers;
  }

  async analyzeSubreddit(data: any): Promise<any> {
    let retries = 0;
    
    while (retries <= this.MAX_RETRIES) {
      try {
        const prompt = this.buildPrompt(data);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: this.MODEL,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 35000,
            stream: false,
            response_format: {
              type: 'json_schema',
              schema: {
                type: 'object',
                properties: {
                  subreddit: { type: 'string', pattern: "^[^\\n]*$" },
                  subscribers: { type: 'number' },
                  activeUsers: { type: 'number' },
                  marketingFriendliness: {
                    type: 'object',
                    properties: {
                      score: { 
                        type: 'number', 
                        minimum: 30, // ENFORCED MINIMUM - All scores must be at least 30%
                        maximum: 100,
                        multipleOf: 1
                      },
                      reasons: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$",
                          minLength: 10
                        },
                        minItems: 3,
                        maxItems: 10
                      },
                      recommendations: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$",
                          minLength: 20
                        },
                        minItems: 3,
                        maxItems: 10
                      }
                    },
                    required: ['score', 'reasons', 'recommendations'],
                    additionalProperties: false
                  },
                  postingLimits: {
                    type: 'object',
                    properties: {
                      frequency: { type: 'number', minimum: 0 },
                      bestTimeToPost: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      contentRestrictions: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        }
                      }
                    },
                    required: ['frequency', 'bestTimeToPost', 'contentRestrictions'],
                    additionalProperties: false
                  },
                  contentStrategy: {
                    type: 'object',
                    properties: {
                      recommendedTypes: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      topics: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      dos: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      donts: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      }
                    },
                    required: ['recommendedTypes', 'topics', 'dos', 'donts'],
                    additionalProperties: false
                  },
                  strategicAnalysis: {
                    type: 'object',
                    properties: {
                      strengths: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      weaknesses: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      },
                      opportunities: { 
                        type: 'array', 
                        items: { 
                          type: 'string',
                          pattern: "^[^\\n]*$"
                        },
                        minItems: 1
                      }
                    },
                    required: ['strengths', 'weaknesses', 'opportunities'],
                    additionalProperties: false
                  }
                },
                required: ['subreddit', 'subscribers', 'activeUsers', 'marketingFriendliness', 'postingLimits', 'contentStrategy', 'strategicAnalysis'],
                additionalProperties: false
              }
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenRouter API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });

          // Handle specific error cases
          if (response.status === 402) {
            throw new Error('OpenRouter API credits depleted. Please check your balance.');
          } else if (response.status === 429) {
            if (retries < this.MAX_RETRIES) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
              continue;
            }
            throw new Error('Rate limit exceeded. Please try again in a few moments.');
          } else if (response.status === 500) {
            if (retries < this.MAX_RETRIES) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
              continue;
            }
            throw new Error('OpenRouter service is experiencing issues. Please try again later.');
          }

          throw new Error(`OpenRouter API error: ${response.status} - ${errorText || response.statusText}`);
        }

        const result = await response.json();
        
        // Handle potential error in the choices array
        if (!result.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenRouter API');
        }

        return this.transformResponse(result.choices[0].message.content);
      } catch (error: unknown) {
        console.error('OpenRouter analysis error:', error);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            if (retries < this.MAX_RETRIES) {
              retries++;
              console.log(`Retry ${retries} after timeout...`);
              continue;
            }
            throw new Error(`Analysis timed out after ${this.TIMEOUT / 1000} seconds. Please try again with a smaller dataset or contact support if the issue persists.`);
          }
          throw new Error(`Analysis failed: ${error.message}`);
        }
        
        throw new Error('Unknown error during analysis');
      }
    }
  }

  private buildPrompt(data: any): string {
    // Preserve more context while still being efficient
    const simplifiedData = {
      name: data.name,
      title: data.title,
      description: data.description?.substring(0, 1000), // Increased to preserve more context
      rules: Array.isArray(data.rules) ? data.rules.map((rule: { description?: string } | string) => 
        typeof rule === 'string' ? rule : // Keep full rule text
        typeof rule === 'object' ? rule.description : null
      ).filter(Boolean) : [],
      requires_approval: data.requires_approval || false,
      content_categories: data.content_categories || [],
      posting_requirements: {
        karma_required: data.karma_required || false,
        account_age_required: data.account_age_required || false,
        manual_approval: data.requires_approval || false
      }
    };
    
    // Create a more directive blackhat marketing prompt
    return `${ANALYSIS_PROMPT}

Analyze this subreddit from a blackhat marketing perspective:
${JSON.stringify(simplifiedData)}

*** CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY ***
1. You are a blackhat marketing strategist helping users CIRCUMVENT rules
2. ALL SCORES MUST BE BETWEEN 30-100%. THIS IS MANDATORY:
   - NEVER score below 30% - even for the strictest subreddits
   - Most subreddits should score between 50-80%
   - Very permissive subreddits can score 80-100%
3. Focus on EXPLOITABLE LOOPHOLES in rules
4. Provide specific techniques to avoid detection by mods
5. Even strict subreddits can be marketed in with the right approach

Your task is to create a battle plan, not just analyze restrictions.`;
  }

  private transformResponse(responseContent: string): any {
    try {
      // First attempt: direct JSON parse
      return JSON.parse(responseContent);
    } catch (err) {
      // Second attempt: extract JSON from markdown if present
      if (responseContent.includes('```json')) {
        const match = responseContent.match(/```json\n([\s\S]*?)\n```/);
        if (match?.[1]) {
          try {
            return JSON.parse(match[1]);
          } catch (jsonErr) {
            console.error('Failed to parse JSON from markdown block:', jsonErr);
          }
        }
      }

      // Third attempt: find first valid JSON object
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseContent.match(jsonRegex);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (jsonErr) {
          console.error('Failed to parse extracted JSON:', jsonErr);
        }
      }

      throw new Error('Failed to extract valid JSON from response');
    }
  }
} 