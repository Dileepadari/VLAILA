import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import vlabsOverridesCss from "../vlabs-overrides.css?url";
import labOverridesCss from "../lab-overrides.css?url";
import { RoleProvider } from "@/lib/role";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VLAILA — Virtual Labs AI Lab Assistant" },
      {
        name: "description",
        content: "Proactive, experiment-grounded AI lab assistant for Virtual Labs India.",
      },
      { name: "author", content: "Virtual Labs" },
      { property: "og:title", content: "VLAILA — Virtual Labs AI Lab Assistant" },
      {
        property: "og:description",
        content: "Proactive, experiment-grounded AI lab assistant for Virtual Labs India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@virtuallabs" },
    ],
    links: [
      /*
       * Only what both templates share lives here. Virtual Labs runs two
       * distinct designs -- the Bootstrap 3 portal at vlab.co.in and the
       * Bootstrap 5 lab template at *.vlabs.ac.in -- whose grids and resets
       * cannot coexist on one page, so RootShell picks a set per route.
       */
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "/vl/fa/css/font-awesome.min.css" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/vl/images/favicon/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * The vlab.co.in portal's own stylesheets, served verbatim from /vl/css.
 * Tailwind is already linked ahead of these so that Bootstrap 3 wins on shared
 * selectors and base elements; the overrides file then reconciles what
 * Tailwind's preflight resets and Bootstrap never restores.
 */
function PortalStyles() {
  return (
    <>
      <link rel="stylesheet" href="/vl/css/bootstrap.css" />
      <link rel="stylesheet" href="/vl/css/main.css" />
      <link rel="stylesheet" href="/vl/css/custom.css" />
      <link rel="stylesheet" href="/vl/css/skdslider.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Roboto:400,400i,500,500i,700,700i,900,900i|Source+Sans+Pro:400,400i,600,600i,700,700i,900,900i"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Roboto+Condensed:300,300i,400,400i,700,700i"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Lora:400,400i,700,700i"
      />
      <link rel="stylesheet" href={vlabsOverridesCss} />
    </>
  );
}

/** The lab template's stylesheets, as served by any *.vlabs.ac.in lab. */
function LabTemplateStyles() {
  return (
    <>
      <link rel="stylesheet" href="/vlabs/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/vlabs/css/vlabs-style.css" />
      <link rel="stylesheet" href="/vlabs/css/toast.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Open+Sans&family=Raleway&display=swap"
      />
      <link rel="stylesheet" href={labOverridesCss} />
    </>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLabTemplate = pathname.startsWith("/labs/");

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {isLabTemplate ? <LabTemplateStyles /> : <PortalStyles />}
      </head>
      <body className="vlabs">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <Outlet />
      </RoleProvider>
    </QueryClientProvider>
  );
}
