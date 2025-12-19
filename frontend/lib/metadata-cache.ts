// Cache for fetched metadata to avoid repeated requests
const metadataCache = new Map<string, { image: string; name?: string; description?: string; location?: string }>();

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

    // Extract location and description from attributes
    const attributes = metadata.attributes || [];
    const locationAttr = attributes.find((attr: any) => attr.trait_type === 'Location');
    const location = locationAttr?.value || '';
    const description = metadata.description || '';

    // Cache the result
    metadataCache.set(metadataUri, { 
      image: finalImageUrl, 
      name: metadata.name,
      description,
      location
    });
    
    return finalImageUrl;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return fallbackImage;
  }
}

export async function getFullMetadata(metadataUri: string) {
  if (!metadataUri || metadataUri.length === 0) {
    return null;
  }

  // Trigger cache population by calling getImageFromMetadata
  await getImageFromMetadata(metadataUri, '');
  
  // Return cached metadata
  return metadataCache.get(metadataUri) || null;
}

export function clearMetadataCache() {
  metadataCache.clear();
}
