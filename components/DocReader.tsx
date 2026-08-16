"use client";
import { useRef } from "react";
import { ListenBar } from "./ListenBar";

export function DocReader({ slug, title, html }: { slug: string; title: string; html: string }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
      <ListenBar docSlug={slug} label={`Listen to ${title}`} contentRef={contentRef} />
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
