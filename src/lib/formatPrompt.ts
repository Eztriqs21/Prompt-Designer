/**
 * Lightweight prompt text formatter (OpenCode palette tokenized).
 * Converts raw generated prompt text into structured HTML for display using the
 * OpenCode design tokens (no blue). Headings/keywords -> purple, strings/code
 * -> green, links -> orange. Falls back to escaped raw text on error. Input is
 * escaped, so the emitted HTML is safe.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-accent-purple">$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="text-secondary-midGray italic">$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code class="text-small bg-primary-dark/40 border border-secondary-borderGray rounded px-1.5 py-0.5 text-success-green">$1</code>',
    );
}

export function formatPromptContent(raw: string): string {
  try {
    if (!raw) return '';

    let text = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const lines = text.split('\n');
    const htmlParts: string[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          htmlParts.push(
            `<pre class="bg-primary-dark/40 border border-secondary-borderGray rounded-md px-4 py-3 my-3 overflow-x-auto"><code class="text-small text-secondary-midGray leading-relaxed">${escapeHtml(
              codeContent.trim(),
            )}</code></pre>`,
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          if (inList) {
            htmlParts.push('</ul>');
            inList = false;
          }
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      if (trimmed === '') {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push('<div class="h-3"></div>');
        continue;
      }

      const sectionMatch = trimmed.match(/^===+\s*SECTION\s+\d+:\s*(.+?)\s*===+$/i);
      if (sectionMatch) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push(
          `<h3 class="text-body font-semibold text-accent-purple mt-4 mb-2">${escapeHtml(
            sectionMatch[1],
          )}</h3>`,
        );
        continue;
      }

      if (/^#{1,3}\s/.test(trimmed)) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        const level = trimmed.match(/^(#{1,3})/)?.[1].length || 1;
        const headerText = trimmed.replace(/^#{1,3}\s+/, '');
        const cls =
          level === 1
            ? 'text-body font-semibold text-accent-purple mt-4 mb-2'
            : 'text-small font-medium text-accent-purple mt-3 mb-1.5';
        htmlParts.push(`<h4 class="${cls}">${processInline(escapeHtml(headerText))}</h4>`);
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) {
          htmlParts.push('<ul class="pl-4 mb-2 space-y-1">');
          inList = true;
        }
        const bulletText = trimmed.replace(/^[-*]\s+/, '');
        htmlParts.push(
          `<li class="text-small text-secondary-midGray leading-relaxed pl-3 border-l border-secondary-borderGray">${processInline(
            escapeHtml(bulletText),
          )}</li>`,
        );
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          htmlParts.push(
            `<div class="flex gap-3 mb-1.5"><span class="text-small text-secondary-midGray/40 font-medium mt-0.5 shrink-0">${numMatch[1]}.</span><span class="text-small text-secondary-midGray leading-relaxed">${processInline(
              escapeHtml(numMatch[2]),
            )}</span></div>`,
          );
        }
        continue;
      }

      if (/^[-*_]{3,}$/.test(trimmed)) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push('<hr class="border-secondary-borderGray my-4" />');
        continue;
      }

      if (trimmed.startsWith('>')) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        const quoteText = trimmed.replace(/^>\s*/, '');
        htmlParts.push(
          `<blockquote class="border-l-2 border-secondary-borderGray pl-4 my-2 text-small text-secondary-midGray italic">${processInline(
            escapeHtml(quoteText),
          )}</blockquote>`,
        );
        continue;
      }

      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push(
        `<p class="text-small text-secondary-midGray leading-relaxed mb-2">${processInline(
          escapeHtml(trimmed),
        )}</p>`,
      );
    }

    if (inList) htmlParts.push('</ul>');
    if (inCodeBlock) {
      htmlParts.push(
        `<pre class="bg-primary-dark/40 border border-secondary-borderGray rounded-md px-4 py-3 my-3 overflow-x-auto"><code class="text-small text-secondary-midGray leading-relaxed">${escapeHtml(
          codeContent.trim(),
        )}</code></pre>`,
      );
    }

    return htmlParts.join('\n');
  } catch {
    return `<pre class="text-small text-secondary-midGray whitespace-pre-wrap leading-relaxed">${escapeHtml(
      raw,
    )}</pre>`;
  }
}
