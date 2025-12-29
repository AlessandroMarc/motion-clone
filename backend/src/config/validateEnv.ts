import { loadEnv } from './loadEnv.js';

loadEnv();

type EnvVarConfig = {
  name: string;
  required: boolean;
  fallbacks?: string[];
  validateUrl?: boolean;
  group?: string; // For conditional groups (e.g., Google Calendar)
};

// Schema: Define all environment variables in one place
const ENV_VAR_SCHEMA: EnvVarConfig[] = [
  // Supabase - required
  {
    name: 'SUPABASE_URL',
    required: true,
    fallbacks: ['NEXT_PUBLIC_SUPABASE_URL'],
    validateUrl: true,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    fallbacks: ['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  },
  // Google Calendar OAuth - conditionally required (all or none)
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    group: 'google_calendar',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    group: 'google_calendar',
  },
  {
    name: 'GOOGLE_REDIRECT_URI',
    required: false,
    group: 'google_calendar',
    validateUrl: true,
  },
  {
    name: 'FRONTEND_URL',
    required: false,
    group: 'google_calendar',
    validateUrl: true,
  },
];

// Optional variables (only generate warnings)
const OPTIONAL_VARS: string[] = ['PORT'];

/**
 * Gets the value of an environment variable, checking fallbacks if provided.
 */
function getEnvValue(config: EnvVarConfig): string | undefined {
  const value = process.env[config.name];
  if (value && value.trim().length > 0) {
    return value.trim();
  }

  if (config.fallbacks) {
    for (const fallback of config.fallbacks) {
      const fallbackValue = process.env[fallback];
      if (fallbackValue && fallbackValue.trim().length > 0) {
        return fallbackValue.trim();
      }
    }
  }

  return undefined;
}

/**
 * Validates URL format if validateUrl is true.
 */
function validateUrlFormat(name: string, value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return `${name} has invalid protocol: "${url.protocol}". Expected http or https.`;
    }
    return null;
  } catch {
    return `${name} is not a valid URL: "${value}". Expected a full URL.`;
  }
}

/**
 * Validates all required environment variables.
 * Throws an error with details if any are missing.
 */
export function validateEnvOrThrow(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check optional variables for warnings
  for (const varName of OPTIONAL_VARS) {
    if (!process.env[varName]) {
      warnings.push(`${varName} not set, using default value`);
    }
  }

  // Validate each variable in schema
  const groupVars = new Map<
    string,
    { configs: EnvVarConfig[]; values: Map<string, string | undefined> }
  >();

  for (const config of ENV_VAR_SCHEMA) {
    const value = getEnvValue(config);
    const varName = config.fallbacks
      ? `${config.name} (or ${config.fallbacks.join(', ')})`
      : config.name;

    // Handle grouped variables (conditionally required)
    if (config.group) {
      if (!groupVars.has(config.group)) {
        groupVars.set(config.group, { configs: [], values: new Map() });
      }
      const group = groupVars.get(config.group)!;
      group.configs.push(config);
      group.values.set(config.name, value);
      continue;
    }

    // Validate required variables
    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${varName}`);
      continue;
    }

    // Validate URL format if specified
    if (value && config.validateUrl) {
      const urlError = validateUrlFormat(varName, value);
      if (urlError) {
        errors.push(urlError);
      }
    }
  }

  // Validate grouped variables (all or none)
  for (const [groupName, group] of groupVars.entries()) {
    const values = Array.from(group.values.values());
    const hasSome = values.some(v => v !== undefined);
    const hasAll = values.every(v => v !== undefined);

    if (hasSome && !hasAll) {
      const missing = group.configs
        .filter(c => !group.values.get(c.name))
        .map(c => c.name);
      errors.push(
        `${groupName} integration is partially configured. Missing: ${missing.join(', ')}`
      );
    }

    // Validate URL formats for grouped variables
    for (const config of group.configs) {
      const value = group.values.get(config.name);
      if (value && config.validateUrl) {
        const urlError = validateUrlFormat(config.name, value);
        if (urlError) {
          errors.push(urlError);
        }
      }
    }
  }

  // Output warnings
  if (warnings.length > 0) {
    console.warn('Environment variable warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Throw error if validation failed
  if (errors.length > 0) {
    console.error('Environment variable validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error(
      '\nPlease check your .env file and ensure all required variables are set.'
    );
    process.exit(1);
  }
}
