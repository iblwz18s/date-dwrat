import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "مستخرج بيانات الدورات الذكي" },
      {
        name: "description",
        content:
          "ارفع صورة ملصق دورة أو ورشة أو مناقشة علمية واستخرج التفاصيل تلقائياً وأضفها لتقويمك مع تذكير قبل ٣٠ دقيقة.",
      },
      { name: "author", content: "Lovable" },
      // PWA
      { name: "theme-color", content: "#6B5CE7" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "الدورات الذكي" },
      { name: "msapplication-TileColor", content: "#6B5CE7" },
      // Open Graph
      { property: "og:title", content: "مستخرج بيانات الدورات الذكي" },
      {
        property: "og:description",
        content: "استخراج بيانات الدورات من الصور وإضافتها للتقويم بنقرة واحدة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "مستخرج بيانات الدورات الذكي" },
      { name: "twitter:description", content: "Event Genie extracts event details from images and adds them to your calendar with reminders." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3659b3f9-7f31-485f-b97e-492798a26f8e/id-preview-8016e391--fd5edefa-2edd-4656-be72-5a7969810f53.lovable.app-1777753554560.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3659b3f9-7f31-485f-b97e-492798a26f8e/id-preview-8016e391--fd5edefa-2edd-4656-be72-5a7969810f53.lovable.app-1777753554560.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
