import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const body = await req.json();

  logger.error(
    {
      source: "frontend",
      ...body,
    },
    "Frontend error",
  );

  return new Response(null, { status: 204 });
}
