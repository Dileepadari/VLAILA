import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Virtual Labs" }] }),
  component: () => (
    <PageLayout>
      <div className="max-w-md mx-auto my-12 bg-white border rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-vlabs-blue mb-6 text-center">Sign in</h1>
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Roll no / Unique ID" />
          <input type="password" className="w-full border rounded px-3 py-2 text-sm" placeholder="Password" />
          <button className="w-full bg-vlabs-blue text-white py-2 rounded">Login</button>
          <div className="text-center text-xs text-muted-foreground">or</div>
          <button className="w-full border py-2 rounded text-sm">Continue with Google</button>
          <p className="text-xs text-center mt-4">No account? <Link to="/signup" className="vlabs-link">Sign up</Link></p>
        </div>
      </div>
    </PageLayout>
  ),
});
