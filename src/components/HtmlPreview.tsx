'use client';

interface Props {
  html: string;
  width?: number;
  height?: number;
}

export default function HtmlPreview({ html, width = 300, height = 250 }: Props) {
  return (
    <div className="inline-block border border-gray-600 overflow-hidden bg-white" style={{ width, height }}>
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        scrolling="no"
        className="block"
        style={{ width, height, overflow: 'hidden', border: 'none' }}
      />
    </div>
  );
}
