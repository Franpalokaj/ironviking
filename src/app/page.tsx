import { redirect } from "next/navigation";
import { db } from "@/db";
import { players } from "@/db/schema";
import { sql } from "drizzle-orm";

export default async function Home() {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(players);
    if (Number(count) === 0) {
      redirect("/setup");
    }
  } catch {
    redirect("/setup");
  }
  redirect("/dashboard");
}
