import type { Dispatch } from '../client';
import type { Template, TemplateRenderOptions, TemplateRenderResponse } from '../types';

/**
 * Templates API for managing message templates
 *
 * @example
 * ```typescript
 * const dispatch = new Dispatch('dp_live_xxx...');
 *
 * // List all templates
 * const templates = await dispatch.templates.list();
 *
 * // Render a template with variables
 * const rendered = await dispatch.templates.render({
 *   slug: 'welcome-email',
 *   channel: 'EMAIL',
 *   variables: { name: 'John' }
 * });
 * ```
 */
export class Templates {
  constructor(private readonly client: Dispatch) {}

  /**
   * List all templates
   *
   * @param options - Filter options
   * @returns Array of templates
   *
   * @example
   * ```typescript
   * // List all templates
   * const templates = await dispatch.templates.list();
   *
   * // Filter by channel
   * const emailTemplates = await dispatch.templates.list({ channel: 'EMAIL' });
   * ```
   */
  async list(options?: {
    channel?: 'EMAIL' | 'SMS';
    isActive?: boolean;
    search?: string;
  }): Promise<Template[]> {
    const params = new URLSearchParams();

    if (options?.channel) params.append('channel', options.channel);
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
    if (options?.search) params.append('search', options.search);

    const query = params.toString();
    const path = `/v1/templates${query ? `?${query}` : ''}`;

    return this.client.request<Template[]>('GET', path);
  }

  /**
   * Get a template by slug
   *
   * @param slug - The template slug
   * @param channel - The template channel (EMAIL or SMS)
   * @returns The template
   *
   * @example
   * ```typescript
   * const template = await dispatch.templates.get('welcome-email', 'EMAIL');
   * console.log('Variables:', template.variables);
   * ```
   */
  async get(slug: string, channel: 'EMAIL' | 'SMS'): Promise<Template> {
    return this.client.request<Template>('GET', `/v1/templates/${channel}/${slug}`);
  }

  /**
   * Render a template with variables
   *
   * @param options - Render options
   * @returns The rendered content
   *
   * @example
   * ```typescript
   * const rendered = await dispatch.templates.render({
   *   slug: 'otp-message',
   *   channel: 'SMS',
   *   variables: { otp: '123456', expires: '10 minutes' }
   * });
   *
   * console.log('Rendered text:', rendered.text);
   * ```
   */
  async render(options: TemplateRenderOptions): Promise<TemplateRenderResponse> {
    if (!options.slug) {
      throw new Error('Template slug is required');
    }

    if (!options.channel) {
      throw new Error('Template channel is required');
    }

    return this.client.request<TemplateRenderResponse>('POST', `/v1/templates/${options.channel}/${options.slug}/render`, {
      variables: options.variables || {},
    });
  }

  /**
   * Validate template variables
   *
   * @param slug - The template slug
   * @param channel - The template channel
   * @param variables - The variables to validate
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const validation = await dispatch.templates.validate(
   *   'welcome-email',
   *   'EMAIL',
   *   { name: 'John' }
   * );
   *
   * if (!validation.valid) {
   *   console.log('Missing variables:', validation.missing);
   * }
   * ```
   */
  async validate(
    slug: string,
    channel: 'EMAIL' | 'SMS',
    variables: Record<string, unknown>
  ): Promise<{
    valid: boolean;
    missing: string[];
    extra: string[];
  }> {
    const template = await this.get(slug, channel);

    const requiredVars = template.variables
      .filter((v) => v.required)
      .map((v) => v.name);

    const definedVars = template.variables.map((v) => v.name);
    const providedVars = Object.keys(variables);

    const missing = requiredVars.filter((v) => !providedVars.includes(v));
    const extra = providedVars.filter((v) => !definedVars.includes(v));

    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }
}
