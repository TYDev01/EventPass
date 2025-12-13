import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PINATA_JWT = process.env.PINATA_JWT;

if (!PINATA_JWT) {
  console.warn(
    "PINATA_JWT is not defined. Pinata metadata API route will fail until the environment variable is configured."
  );
}

type AttributeInput = {
  trait_type: string;
  value: string;
};

type MetadataRequest = {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: AttributeInput[];
};

export async function POST(request: Request) {
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "Pinata credentials not configured" }, { status: 500 });
  }

  const body = (await request.json()) as MetadataRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Missing metadata payload" }, { status: 400 });
  }

  const { name, description, image, external_url: externalUrl, attributes = [] } = body;

  if (!name || !description || !image) {
    return NextResponse.json(
      { error: "Metadata requires name, description, and image fields" },
      { status: 400 }
    );
  }

  const filteredAttributes = Array.isArray(attributes)
    ? attributes.filter(
        (item) =>
          item &&
          typeof item.trait_type === "string" &&
          item.trait_type.trim().length > 0 &&
          typeof item.value === "string" &&
          item.value.trim().length > 0
      )
    : [];

  const pinataPayload = {
    pinataContent: {
      name,
      description,
      image,
      ...(externalUrl ? { external_url: externalUrl } : {}),
      ...(filteredAttributes.length > 0 ? { attributes: filteredAttributes } : {})
    },
    pinataMetadata: {
      name: `${name}-metadata`
    }
  };

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(pinataPayload)
  });

  if (!response.ok) {
    const errorPayload = await safeJson(response);
    return NextResponse.json(
      {
        error: "Unable to upload metadata to Pinata",
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
