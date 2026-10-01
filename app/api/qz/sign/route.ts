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

    const keyPath = process.env.QZ_SIGNING_KEY_PATH;

    const passphrase = process.env.QZ_SIGNING_KEY_PASSPHRASE;

    if (!keyPath) {
      throw new Error("QZ_SIGNING_KEY_PATH is not configured.");
    }

    if (!passphrase) {
      throw new Error("QZ_SIGNING_KEY_PASSPHRASE is not configured.");
    }

    const privateKeyPath = path.resolve(process.cwd(), keyPath);

    const encryptedPrivateKey = fs.readFileSync(
      privateKeyPath,
      "utf8"
    );

    const privateKey = crypto.createPrivateKey({
      key: encryptedPrivateKey,
      format: "pem",
      passphrase,
    });

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