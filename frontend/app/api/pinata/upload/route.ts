import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PINATA_JWT = process.env.PINATA_JWT;

if (!PINATA_JWT) {
  console.warn(
    "PINATA_JWT is not defined. Pinata upload API route will fail until the environment variable is configured."
  );
}

const ONE_MB = 1_000_000; // Bytes

export async function POST(request: Request) {
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "Pinata credentials not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file payload" }, { status: 400 });
  }

  if (file.size > ONE_MB) {
    return NextResponse.json({ error: "File exceeds 1MB limit" }, { status: 400 });
  }

  const pinataForm = new FormData();
  pinataForm.append("file", file, file.name);

  const metadata = formData.get("pinataMetadata");
  if (metadata && typeof metadata === "string") {
    pinataForm.append("pinataMetadata", metadata);
  }

  const options = formData.get("pinataOptions");
  if (options && typeof options === "string") {
    pinataForm.append("pinataOptions", options);
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`
    },
    body: pinataForm
  });

  if (!response.ok) {
    const errorPayload = await safeJson(response);
    return NextResponse.json(
      {
        error: "Unable to upload file to Pinata",
        details: errorPayload ?? (await response.text())
      },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({
    cid: data.IpfsHash,
    pinSize: data.PinSize,
    timestamp: data.Timestamp
  });
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
