import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const toSign = request.nextUrl.searchParams.get("request");

    if (!toSign) {
      return new NextResponse("Missing request parameter", {
        status: 400,
      });
    }

    const privateKeyPath = path.join(
      process.cwd(),
      "private",
      "qz",
      "private-key.pem"
    );

    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    const signature = crypto.sign(
      "RSA-SHA512",
      Buffer.from(toSign, "utf8"),
      privateKey
    );

    return new NextResponse(signature.toString("base64"), {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("QZ signing error:", error);

    return new NextResponse("Signing failed", {
      status: 500,
    });
  }
}