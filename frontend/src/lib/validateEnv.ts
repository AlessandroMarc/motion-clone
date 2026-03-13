interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables for the frontend.
 * Returns a validation result with errors and warnings.
 */
function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Supabase URL (required)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.trim().length === 0) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_URL (required)');
  } else {
    // Validate URL format
    try {
      const url = new URL(supabaseUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push(
          `NEXT_PUBLIC_SUPABASE_URL has invalid protocol: "${url.protocol}". Expected http or https.`
        );
      }
    } catch {
      errors.push(
        `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${supabaseUrl}". Expected a full URL like "https://your-project.supabase.co".`
      );
    }
  }

  // Validate Supabase Anon Key (required)
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey || supabaseAnonKey.trim().length === 0) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (required)');
  }

  // Optional variables - just warnings
  if (!process.env.NEXT_PUBLIC_API_URL) {
    warnings.push(
      'NEXT_PUBLIC_API_URL not set, will use default based on NODE_ENV'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment variables and throws an error if validation fails.
 * This is the main function to call at startup.
 * Works in both browser and Node.js (Next.js SSR) environments.
 *
 * Behavior:
 * - Always validates and throws in production deployments (e.g., Vercel)
 * - Skips throwing (only warns) in CI environments (GitHub Actions, etc.)
 * - Skips validation in test environment
 */
export function validateEnvOrThrow(): void {
  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn('Environment variable warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (!result.valid) {
    const errorMessage = [
      'Environment variable validation failed:',
      ...result.errors.map(error => `  - ${error}`),
      '',
      'Please check your .env file and ensure all required variables are set.',
      'Required variables:',
      '  - NEXT_PUBLIC_SUPABASE_URL',
      '  - NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].join('\n');

    // Next.js statically replaces process.env.FOO at build time for non-NEXT_PUBLIC_
    // variables, so direct access like process.env.CI gets inlined as undefined.
    // Using bracket notation on the process.env object prevents static replacement,
    // allowing us to read CI and GITHUB_ACTIONS at actual runtime (including prerender).
    const env = process.env;
    const isCI = env['CI'] === 'true' || env['GITHUB_ACTIONS'] === 'true';

    if (isCI) {
      console.warn(
        `[CI Mode] ${errorMessage}\n` +
          'Continuing build in CI mode - validation will occur at runtime in production.'
      );
      return;
    }

    // In production deployments (Vercel, etc.), fail the build
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}
