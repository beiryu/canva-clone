const SERPER_IMAGES_ENDPOINT = "https://google.serper.dev/images";

// Serper defaults to the US/English locale, which returns different results for
// the same Vietnamese query.
const DEFAULT_COUNTRY = "vn";
const DEFAULT_LANGUAGE = "vi";

export type SerperImage = {
  title: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  source: string;
  domain: string;
  link: string;
  googleUrl: string;
  copyright?: string;
  position: number;
};

type SearchGoogleImagesRequest = {
  query: string;
  num?: number;
  /** Serper `gl` — country the search is run from. */
  country?: string;
  /** Serper `hl` — interface/results language. */
  language?: string;
};

/**
 * Search Google Images through Serper. Each call costs one Serper credit.
 */
export async function searchGoogleImages({
  query,
  num = 30,
  country = DEFAULT_COUNTRY,
  language = DEFAULT_LANGUAGE,
}: SearchGoogleImagesRequest): Promise<SerperImage[]> {
  const response = await fetch(SERPER_IMAGES_ENDPOINT, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num, gl: country, hl: language }),
  });

  if (!response.ok) {
    throw new Error(`Serper request failed: ${response.status}`);
  }

  const json = (await response.json()) as { images?: SerperImage[] };

  return json.images ?? [];
}
