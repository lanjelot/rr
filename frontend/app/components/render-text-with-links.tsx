
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function linkElement(href: string, key: number) {
  return (
    <a
      key={key}
      href={href}
      className="text-blue-400 hover:text-blue-600 break-all"
      target="_blank"
      rel="noopener noreferrer"
    >
      {href}
    </a>
  );
}

export function renderTextWithLinks(text: string) {
  return text.split(URL_REGEX).map((part, index) =>
    part.match(URL_REGEX) ? linkElement(part, index) : part
  );
}

export function renderTextWithLinksAndBreaks(text: string) {
  return text.split(URL_REGEX).flatMap((part, index) => {
    if (part.match(URL_REGEX)) return [linkElement(part, index)];
    return part.split("\n").flatMap((line, lineIndex) =>
      lineIndex === 0 ? [line] : [<br key={`${index}-${lineIndex}`} />, line]
    );
  });
}
