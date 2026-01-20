"use client";

import * as Sentry from "@sentry/nextjs";
import Head from "next/head";
import { useState } from "react";

export default function SentryExamplePage() {
  const [isError, setIsError] = useState(false);

  const createError = async () => {
    setIsError(true);
    throw new Error("Sentry Frontend Error");
  };

  const triggerApiError = async () => {
    const response = await fetch("/api/sentry-example-api");
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "API Error");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <Head>
        <title>Sentry Example</title>
      </Head>

      <h1 style={{ marginBottom: "1rem" }}>Sentry Example Page</h1>

      <p style={{ marginBottom: "2rem", color: "#666" }}>
        Click the buttons below to trigger test errors and verify Sentry is working correctly.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#e53e3e",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
          onClick={createError}
        >
          Trigger Frontend Error
        </button>

        <button
          type="button"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#3182ce",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
          onClick={triggerApiError}
        >
          Trigger API Error
        </button>

        <button
          type="button"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#805ad5",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
          onClick={() => {
            Sentry.captureMessage("Test message from Sentry Example Page");
            alert("Message sent to Sentry!");
          }}
        >
          Send Test Message
        </button>
      </div>

      {isError && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#fed7d7",
            borderRadius: "0.375rem",
            color: "#c53030",
          }}
        >
          An error was triggered! Check your Sentry dashboard.
        </div>
      )}

      <div style={{ marginTop: "3rem", padding: "1rem", backgroundColor: "#f7fafc", borderRadius: "0.375rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>How to use:</h2>
        <ol style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>Click one of the buttons above to trigger an error</li>
          <li>Go to your Sentry dashboard to see the captured error</li>
          <li>Errors should appear within a few seconds</li>
        </ol>
      </div>
    </div>
  );
}
