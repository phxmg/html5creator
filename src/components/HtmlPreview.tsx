'use client';

interface Props {
  html: string;
  width?: number;
  height?: number;
}

export default function HtmlPreview({ html, width = 300, height = 250 }: Props) {
  return (
    <div className="inline-block border border-gray-700 rounded-lg overflow-hidden shadow-lg bg-white">
      <iframe
        srcDoc={html}
        width={width}
        height={height}
        sandbox="allow-scripts"
        className="block"
        style={{ width, height }}
      />
    </div>
  );
}
