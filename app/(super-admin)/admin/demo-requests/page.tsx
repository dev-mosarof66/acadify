import { DemoRequestsBoard } from "@/components/super-admin/demo-requests-board";
import { PageHeader } from "@/components/super-admin/ui";
import { getDemoRequests, getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Demo Requests" };

export default async function DemoRequestsPage() {
  const [requests, now] = await Promise.all([getDemoRequests(), getRequestTime()]);
  const waiting = requests.filter((d) => d.status === "new").length;
  return (
    <>
      <PageHeader title="Demo Requests" description={`Requests from the website's contact form · ${waiting} waiting for a call`} />
      {/* Keyed on the data so a refresh after saving resets the board's local copy */}
      <DemoRequestsBoard key={requests.map((r) => `${r.dbId}:${r.status}`).join(",")} requests={requests} now={now} />
    </>
  );
}
