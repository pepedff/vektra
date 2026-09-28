import { OverviewView } from "@/features/extension/client-views";
import { latestPublished, myLicenses } from "@/server/client-queries";

export const dynamic = "force-dynamic";

export default async function ClientHome() {
  const [licenses, latest] = await Promise.all([myLicenses(), latestPublished()]);
  return <OverviewView licenses={licenses} latest={latest} />;
}
