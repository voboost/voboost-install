export interface Instruction {
    image: string;
    title: string;
    description: string;
}

/**
 * Parse HTML generated from a connection step MD file.
 * Expected structure:
 *   <h1>Title</h1>
 *   <p>Description text</p>
 *   <p><img src="/images/..." alt="..."></p>
 */
export function parseInstructionHtml(html: string): Instruction {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const h1 = doc.querySelector('h1');
    const title = h1?.textContent?.trim() || '';

    const img = doc.querySelector('img');
    const image = img?.getAttribute('src') || '';

    // Description is the first <p> that does not contain an <img>
    const paragraphs = doc.querySelectorAll('p');
    let description = '';
    for (const p of paragraphs) {
        if (!p.querySelector('img')) {
            description = p.textContent?.trim() || '';
            break;
        }
    }

    return { image, title, description };
}
