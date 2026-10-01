"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    qz: any;
  }
}

export default function QZTestPage() {
  const [status, setStatus] = useState("Waiting...");
  const [printers, setPrinters] = useState<string[]>([]);

  async function testQZ() {
    try {
      if (!window.qz) {
        throw new Error("QZ library has not loaded yet.");
      }

      const qz = window.qz;

      setStatus("Configuring certificate...");

      qz.security.setCertificatePromise(
        (resolve: (certificate: string) => void, reject: (error: any) => void) => {
          fetch("/qz/digital-certificate.txt", {
            cache: "no-store",
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Could not load QZ certificate.");
              }

              return response.text();
            })
            .then(resolve)
            .catch(reject);
        }
      );

      qz.security.setSignatureAlgorithm("SHA512");

      qz.security.setSignaturePromise(
        (toSign: string) => {
          return (
            resolve: (signature: string) => void,
            reject: (error: any) => void
          ) => {
            fetch(
              `/api/qz/sign?request=${encodeURIComponent(toSign)}`,
              {
                cache: "no-store",
              }
            )
              .then((response) => {
                if (!response.ok) {
                  throw new Error("Server signing failed.");
                }

                return response.text();
              })
              .then(resolve)
              .catch(reject);
          };
        }
      );

      setStatus("Connecting to QZ Tray...");

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      setStatus("Connected. Testing signed request...");

      const result = await qz.printers.find();

      const printerList = Array.isArray(result)
        ? result
        : [result];

      setPrinters(printerList);

      setStatus(
        "SUCCESS: Signed QZ request completed."
      );
    } catch (error) {
      console.error("QZ test error:", error);

      setStatus(
        `FAILED: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return (
    <>
      <Script
        src="/qz/qz-tray.js"
        strategy="beforeInteractive"
      />

      <main style={{ padding: 40 }}>
        <h1>QZ Signing Test</h1>

        <button
          onClick={testQZ}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Test QZ Signing
        </button>

        <h2>Status</h2>

        <p>{status}</p>

        <h2>Printers</h2>

        <pre>
          {JSON.stringify(printers, null, 2)}
        </pre>
      </main>
    </>
  );
}