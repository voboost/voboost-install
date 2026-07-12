/**
 * Inject BEM classes onto HTML elements generated from markdown.
 * Replaces tag-only elements with BEM-classed elements.
 *
 * @param html - Raw HTML string from markdown
 * @param block - BEM block name (e.g., 'page-title', 'license-content')
 * @returns HTML string with BEM classes on every element
 *
 * Example:
 *   injectBemClasses('<h1>Title</h1><p>Text</p>', 'page-title')
 *   → '<h1 class="page-title__h1">Title</h1><p class="page-title__p">Text</p>'
 */
export function injectBemClasses(html: string, block: string): string {
    const tagMap: Record<string, string> = {
        h1: `${block}__h1`,
        h2: `${block}__h2`,
        h3: `${block}__h3`,
        h4: `${block}__h4`,
        p: `${block}__p`,
        ul: `${block}__ul`,
        ol: `${block}__ol`,
        li: `${block}__li`,
        a: `${block}__a`,
        strong: `${block}__strong`,
        em: `${block}__em`,
        blockquote: `${block}__blockquote`,
        img: `${block}__img`,
        code: `${block}__code`,
        pre: `${block}__pre`,
    };

    let result = html;
    for (const [tag, className] of Object.entries(tagMap)) {
        // Match opening tags, preserving existing attributes
        const regex = new RegExp(`<${tag}(\\s|>)`, 'gi');
        result = result.replace(regex, (match, after) => {
            if (after === '>') {
                return `<${tag} class="${className}">`;
            }
            return `<${tag} class="${className}"${after}`;
        });
    }

    return result;
}
