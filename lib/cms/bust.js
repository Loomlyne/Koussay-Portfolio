import { revalidatePath, revalidateTag } from "next/cache";

export function bustProjectsCache() {
  revalidateTag("projects", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/project", "layout");
  revalidatePath("/api/media", "layout");
}
