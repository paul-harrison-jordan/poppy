export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
      items?: {
        type: string;
      };
      additionalProperties?: {
        type: string;
      };
    }>;
  };
  execute: (params: any) => Promise<any>;
} 