import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export interface PreparedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

const MAX_EDGE = 1600;

/**
 * Downscales and re-encodes a photo to a size the backend accepts quickly.
 * Returns a file uri (for display/history) and base64 (for upload).
 */
export async function prepareImage(sourceUri: string, sourceWidth?: number, sourceHeight?: number): Promise<PreparedImage> {
  const ctx = ImageManipulator.manipulate(sourceUri);
  if (sourceWidth && sourceHeight) {
    const longest = Math.max(sourceWidth, sourceHeight);
    if (longest > MAX_EDGE) {
      const scale = MAX_EDGE / longest;
      ctx.resize({ width: Math.round(sourceWidth * scale), height: Math.round(sourceHeight * scale) });
    }
  } else {
    // Unknown dimensions: constrain width; height follows aspect ratio.
    ctx.resize({ width: MAX_EDGE });
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
  if (!saved.base64) throw new Error("Image encoding failed");
  return { uri: saved.uri, base64: saved.base64, width: saved.width, height: saved.height };
}
