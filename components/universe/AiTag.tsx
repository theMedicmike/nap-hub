// Plain-words label required on every public AI image. People in the art are fictional.
export function AiTag({ person = true, className = "" }: { person?: boolean; className?: string }) {
  return (
    <span className={`ai-tag ${className}`}>
      AI-generated image{person ? ", not a real person" : ""}
    </span>
  );
}
