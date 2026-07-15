/**
 * Lightweight prompt text formatter.
 * Converts raw generated prompt text into structured HTML for display.
 * Falls back to escaped raw text if anything goes wrong.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInlineFormatting(text: string): string {
  return text
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90 font-semibold">$1</strong>')
    // Italic: *text*
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="text-white/60 italic">$1</em>')
    // Inline code: `text`
    .replace(/`([^`]+)`/g, '<code class="text-[12px] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-indigo-300/80">$1</code>');
}

export function formatPromptContent(raw: string): string {
  try {
    if (!raw) return '';

    // Normalize line endings
    let text = raw.replace(/\r\n/g, '\n');

    // Collapse 3+ consecutive newlines to 2
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    text = text.trim();

    const lines = text.split('\n');
    const htmlParts: string[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code block: ``` ... ```
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          htmlParts.push(`<pre class="bg-black/40 border border-white/[0.05] rounded-lg px-4 py-3 my-3 overflow-x-auto"><code class="text-[12px] font-mono text-white/70 leading-relaxed">${escapeHtml(codeContent.trim())}</code></pre>`);
          codeContent = '';
          inCodeBlock = false;
        } else {
          // Close any open list
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

      // Empty line = paragraph break
      if (trimmed === '') {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push('<div class="h-3"></div>');
        continue;
      }

      // Section header: === SECTION N: NAME ===
      const sectionMatch = trimmed.match(/^===+\s*SECTION\s+\d+:\s*(.+?)\s*===+$/i);
      if (sectionMatch) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push(
          `<h3 class="text-[14px] font-semibold text-white/90 mt-5 mb-2 tracking-wide">${escapeHtml(sectionMatch[1])}</h3>`
        );
        continue;
      }

      // Standalone header-like lines (all caps, or starts with #)
      if (/^#{1,3}\s/.test(trimmed)) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        const level = trimmed.match(/^(#{1,3})/)?.[1].length || 1;
        const headerText = trimmed.replace(/^#{1,3}\s+/, '');
        const cls = level === 1
          ? 'text-[15px] font-bold text-white/90 mt-5 mb-2'
          : level === 2
            ? 'text-[14px] font-semibold text-white/85 mt-4 mb-2'
            : 'text-[13px] font-medium text-white/80 mt-3 mb-1.5';
        htmlParts.push(`<h4 class="${cls}">${processInlineFormatting(escapeHtml(headerText))}</h4>`);
        continue;
      }

      // Bullet points: - text or * text
      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) {
          htmlParts.push('<ul class="ml-4 mb-2 space-y-1">');
          inList = true;
        }
        const bulletText = trimmed.replace(/^[-*]\s+/, '');
        htmlParts.push(
          `<li class="text-[13px] text-white/65 leading-relaxed pl-1 relative before:content-[''] before:absolute before:-left-3 before:top-[9px] before:w-1 before:h-1 before:rounded-full before:bg-white/20">${processInlineFormatting(escapeHtml(bulletText))}</li>`
        );
        continue;
      }

      // Numbered list: 1. text
      if (/^\d+\.\s+/.test(trimmed)) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          htmlParts.push(
            `<div class="flex gap-3 mb-1.5 ml-2"><span class="text-[12px] text-white/30 font-mono mt-0.5 shrink-0">${numMatch[1]}.</span><span class="text-[13px] text-white/65 leading-relaxed">${processInlineFormatting(escapeHtml(numMatch[2]))}</span></div>`
          );
        }
        continue;
      }

      // Horizontal rule: --- or ***
      if (/^[-*_]{3,}$/.test(trimmed)) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push('<hr class="border-white/[0.06] my-4" />');
        continue;
      }

      // Blockquote: > text
      if (trimmed.startsWith('>')) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        const quoteText = trimmed.replace(/^>\s*/, '');
        htmlParts.push(
          `<blockquote class="border-l-2 border-white/10 pl-4 my-2 text-[13px] text-white/45 italic">${processInlineFormatting(escapeHtml(quoteText))}</blockquote>`
        );
        continue;
      }

      // Regular paragraph
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push(
        `<p class="text-[13px] text-white/60 leading-[1.7] mb-2">${processInlineFormatting(escapeHtml(trimmed))}</p>`
      );
    }

    // Close any open elements
    if (inList) htmlParts.push('</ul>');
    if (inCodeBlock) {
      htmlParts.push(`<pre class="bg-black/40 border border-white/[0.05] rounded-lg px-4 py-3 my-3 overflow-x-auto"><code class="text-[12px] font-mono text-white/70 leading-relaxed">${escapeHtml(codeContent.trim())}</code></pre>`);
    }

    return htmlParts.join('\n');
  } catch {
    // Fallback: return escaped raw text
    return `<pre class="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-white/70">${escapeHtml(raw)}</pre>`;
  }
}
