// Cache for fetched metadata to avoid repeated requests
const metadataCache = new Map<string, { image: string; name?: string }>();

export async function getImageFromMetadata(metadataUri: string, fallbackImage: string): Promise<string> {
  if (!metadataUri || metadataUri.length === 0) {
    return fallbackImage;
  }

  // Check cache first
  if (metadataCache.has(metadataUri)) {
    return metadataCache.get(metadataUri)!.image;
  }

  try {
    // Convert IPFS gateway if needed
    let fetchUrl = metadataUri;
    if (metadataUri.startsWith('ipfs://')) {
      fetchUrl = metadataUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch metadata from ${fetchUrl}`);
      return fallbackImage;
    }

    const metadata = await response.json();
    const imageUrl = metadata.image || metadata.imageUrl || fallbackImage;
    
    // Convert IPFS image URL if needed
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('ipfs://')) {
      finalImageUrl = imageUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }

    // Cache the result
    metadataCache.set(metadataUri, { image: finalImageUrl, name: metadata.name });
    
    return finalImageUrl;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return fallbackImage;
  }
}

export function clearMetadataCache() {
  metadataCache.clear();
}
