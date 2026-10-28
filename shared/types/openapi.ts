// OpenAPI 3.x / Swagger 2.0 Types (subset used for importing specs as collections)
export interface OpenApiServerVariable {
  default?: string;
  enum?: string[];
}

export interface OpenApiServer {
  url?: string;
  variables?: Record<string, OpenApiServerVariable>;
}

export interface OpenApiSchemaObject {
  $ref?: string;
  additionalProperties?: boolean | OpenApiSchemaObject;
  allOf?: OpenApiSchemaObject[];
  anyOf?: OpenApiSchemaObject[];
  default?: unknown;
  enum?: unknown[];
  example?: unknown;
  format?: string;
  items?: OpenApiSchemaObject;
  oneOf?: OpenApiSchemaObject[];
  properties?: Record<string, OpenApiSchemaObject>;
  required?: string[];
  type?: string | string[];
}

export interface OpenApiExample {
  value?: unknown;
}

export interface OpenApiMediaType {
  example?: unknown;
  examples?: Record<string, OpenApiExample>;
  schema?: OpenApiSchemaObject;
}

// `in: 'body' | 'formData'` and the inline `type`/`format`/`enum`/`default` fields are Swagger 2.0 only
export interface OpenApiParameter {
  $ref?: string;
  default?: unknown;
  enum?: unknown[];
  example?: unknown;
  format?: string;
  in?: 'path' | 'query' | 'header' | 'cookie' | 'body' | 'formData';
  name?: string;
  required?: boolean;
  schema?: OpenApiSchemaObject;
  type?: string;
}

export interface OpenApiRequestBody {
  $ref?: string;
  content?: Record<string, OpenApiMediaType>;
  required?: boolean;
}

export type OpenApiSecurityRequirement = Record<string, string[]>;

export interface OpenApiSecurityScheme {
  $ref?: string;
  in?: 'header' | 'query' | 'cookie';
  name?: string;
  scheme?: string;
  type?: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'basic';
}

export interface OpenApiOperation {
  consumes?: string[];
  deprecated?: boolean;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  security?: OpenApiSecurityRequirement[];
  servers?: OpenApiServer[];
  summary?: string;
  tags?: string[];
}

export type OpenApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

export type OpenApiPathItem = {
  $ref?: string;
  parameters?: OpenApiParameter[];
  servers?: OpenApiServer[];
} & Partial<Record<OpenApiMethod, OpenApiOperation>>;

export interface OpenApiInfo {
  description?: string;
  title?: string;
  version?: string;
}

export interface OpenApiComponents {
  parameters?: Record<string, OpenApiParameter>;
  requestBodies?: Record<string, OpenApiRequestBody>;
  schemas?: Record<string, OpenApiSchemaObject>;
  securitySchemes?: Record<string, OpenApiSecurityScheme>;
}

// `host`, `basePath`, `schemes`, `definitions` and `securityDefinitions` are Swagger 2.0 only
export interface OpenApiDocument {
  basePath?: string;
  components?: OpenApiComponents;
  consumes?: string[];
  definitions?: Record<string, OpenApiSchemaObject>;
  host?: string;
  info: OpenApiInfo;
  openapi?: string;
  paths?: Record<string, OpenApiPathItem>;
  schemes?: string[];
  security?: OpenApiSecurityRequirement[];
  securityDefinitions?: Record<string, OpenApiSecurityScheme>;
  servers?: OpenApiServer[];
  swagger?: string;
  webhooks?: Record<string, OpenApiPathItem>;
}
