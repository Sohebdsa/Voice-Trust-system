import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2>Page Not Found</h2>
      <p style={{ color: "var(--muted-2)", margin: "12px 0 24px" }}>
        The requested record or screen could not be found.
      </p>
      <Link href="/" className="btn btn-primary">
        Return to starting page
      </Link>
    </div>
  );
}

