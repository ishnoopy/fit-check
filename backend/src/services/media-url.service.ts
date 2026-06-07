function isS3Key(value: string) {
  return value.startsWith("uploads/");
}

export async function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return value ?? null;
  }

  if (!isS3Key(value)) {
    return value;
  }

  return `/api/media/${value}`;
}
