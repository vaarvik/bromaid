type Json = Record<string, unknown> | readonly Record<string, unknown>[];

export function JsonLd({ data, id }: { readonly data: Json; readonly id?: string }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
