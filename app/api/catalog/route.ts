import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";
import { userFromRequest } from "@/lib/tg-auth";
import { productCategories, products } from "@/lib/content";

export const dynamic = "force-dynamic";

/** Закрытые товары (restricted) отдаются только верифицированным специалистам. */
export async function GET(req: Request) {
  const tg = userFromRequest(req);
  let verified = false;
  if (tg) {
    try {
      verified = (await upsertUser(tg)).is_verified;
    } catch (e) {
      console.error(e);
    }
  }
  const visible = products
    .filter((p) => !p.restricted || verified)
    .map(({ priceB2b, ...p }) => (verified && priceB2b ? { ...p, price: priceB2b } : p));
  const lockedCount = products.filter((p) => p.restricted).length;
  return NextResponse.json({
    authorized: !!tg,
    verified,
    categories: productCategories.filter((c) => verified || visible.some((p) => p.category === c.id)),
    products: visible,
    lockedCount: verified ? 0 : lockedCount,
  });
}
