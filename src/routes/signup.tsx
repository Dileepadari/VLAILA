import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up - Virtual Labs" }] }),
  component: () => (
    <PageLayout>
      <div className="max-w-md mx-auto my-12 bg-white border rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-vlabs-blue mb-6 text-center">Create your account</h1>
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Full name" />
          <select className="w-full border rounded px-3 py-2 text-sm">
            <option>Role</option>
            <option>Student</option>
            <option>Faculty</option>
            <option>Admin</option>
          </select>
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Course" />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Institute email"
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Password"
          />
          <Link
            to="/onboarding"
            className="block text-center bg-vlabs-blue text-white py-2 rounded"
          >
            Continue
          </Link>
        </div>
      </div>
    </PageLayout>
  ),
});
