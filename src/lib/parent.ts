import { mockParentHome, type ParentHome } from "@/lib/mock/parent";

const useMock = process.env.USE_MOCK_DB === "true";

export async function getParentHome(space: {
  name: string;
  subject: string | null;
  slug: string | null;
}): Promise<ParentHome | null> {
  if (useMock) return mockParentHome(space);
  return null;
}

export type { ParentHome };
