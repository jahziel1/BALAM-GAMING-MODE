use reqwest::blocking::Client;
use serde::Deserialize;
use std::time::Duration;
use tracing::{info, warn};

const MS_STORE_API_BASE: &str = "https://displaycatalog.md.mp.microsoft.com/v7.0";

/// Microsoft Store API adapter for fetching Xbox/UWP game artwork.
/// Uses the public DisplayCatalog API (no authentication required).
pub struct MicrosoftStoreAdapter {
    client: Client,
    market: String,
    language: String,
}

#[derive(Debug, Deserialize)]
struct ProductsResponse {
    #[serde(rename = "Products")]
    products: Vec<Product>,
}

#[derive(Debug, Deserialize)]
struct Product {
    #[serde(rename = "LocalizedProperties")]
    localized_properties: Vec<LocalizedProperty>,
}

#[derive(Debug, Deserialize)]
struct LocalizedProperty {
    #[serde(rename = "ProductTitle")]
    product_title: String,
    #[serde(rename = "Images")]
    images: Vec<Image>,
}

#[derive(Debug, Deserialize)]
struct Image {
    #[serde(rename = "ImagePurpose")]
    image_purpose: String,
    #[serde(rename = "Uri")]
    uri: String,
    #[serde(rename = "Width")]
    width: u32,
    #[serde(rename = "Height")]
    height: u32,
}

/// Game artwork URLs fetched from Microsoft Store
#[derive(Debug, Clone)]
pub struct GameArtwork {
    pub cover_url: Option<String>,
    pub hero_url: Option<String>,
    pub logo_url: Option<String>,
}

impl MicrosoftStoreAdapter {
    /// Creates a new Microsoft Store adapter with default settings.
    #[must_use]
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent("BalamConsole/1.0")
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            market: "US".to_string(),
            language: "en-US".to_string(),
        }
    }

    /// Fetch artwork for a game by PackageFamilyName.
    ///
    /// Uses the public Microsoft Store DisplayCatalog API (no auth required).
    ///
    /// # Arguments
    /// * `package_family_name` - The Xbox/UWP PackageFamilyName (e.g., "Microsoft.XboxApp_8wekyb3d8bbwe")
    ///
    /// # Returns
    /// `Ok(GameArtwork)` with URLs for cover, hero, and logo images
    /// `Err(String)` if the API request fails
    ///
    /// # Example
    /// ```rust
    /// let adapter = MicrosoftStoreAdapter::new();
    /// let artwork = adapter.fetch_artwork("Microsoft.MinecraftUWP_8wekyb3d8bbwe")?;
    /// if let `Some`(cover) = artwork.cover_url {
    ///     println!("Cover: {}", cover);
    /// }
    /// ```
    pub fn fetch_artwork(&self, package_family_name: &str) -> Result<GameArtwork, String> {
        info!("Fetching MS Store artwork for: {}", package_family_name);

        // Construct lookup URL (public API, no auth needed)
        let url = format!(
            "{}/products/lookup?market={}&languages={}&alternateId=PackageFamilyName&value={}",
            MS_STORE_API_BASE, self.market, self.language, package_family_name
        );

        // Make HTTP request
        let response = self
            .client
            .get(&url)
            .send()
            .map_err(|e| format!("Network error: {e}"))?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(format!("HTTP Error: {status}"));
        }

        // Parse JSON response
        let products_response: ProductsResponse = response.json().map_err(|e| format!("JSON parse error: {e}"))?;

        // Extract first product
        let product = products_response
            .products
            .first()
            .ok_or_else(|| format!("No product found for {package_family_name}"))?;

        let localized = product
            .localized_properties
            .first()
            .ok_or_else(|| "No localized properties found".to_string())?;

        info!("Found product: {}", localized.product_title);

        // Extract images by purpose
        let mut cover_url = None;
        let mut hero_url = None;
        let mut logo_url = None;

        for image in &localized.images {
            let full_url = if image.uri.starts_with("//") {
                let uri = &image.uri;
                format!("https:{uri}")
            } else {
                image.uri.clone()
            };

            match image.image_purpose.as_str() {
                // Cover/Poster image (vertical, for grid view)
                "Poster" | "BoxArt" if cover_url.is_none() => {
                    info!(
                        "  Found cover: {} ({}x{})",
                        image.image_purpose, image.width, image.height
                    );
                    cover_url = Some(full_url);
                },
                // Hero banner (horizontal, for featured view)
                "SuperHeroArt" | "TitledHeroArt" if hero_url.is_none() => {
                    info!(
                        "  Found hero: {} ({}x{})",
                        image.image_purpose, image.width, image.height
                    );
                    hero_url = Some(full_url);
                },
                // Logo (transparent PNG)
                "Logo" if logo_url.is_none() => {
                    info!(
                        "  Found logo: {} ({}x{})",
                        image.image_purpose, image.width, image.height
                    );
                    logo_url = Some(full_url);
                },
                _ => {},
            }

            // Stop early if we have all three
            if cover_url.is_some() && hero_url.is_some() && logo_url.is_some() {
                break;
            }
        }

        if cover_url.is_none() && hero_url.is_none() && logo_url.is_none() {
            warn!("No suitable images found for {}", package_family_name);
        }

        Ok(GameArtwork {
            cover_url,
            hero_url,
            logo_url,
        })
    }
}

impl Default for MicrosoftStoreAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = MicrosoftStoreAdapter::new();
        assert_eq!(adapter.market, "US");
        assert_eq!(adapter.language, "en-US");
    }

    #[test]
    fn test_url_construction() {
        let adapter = MicrosoftStoreAdapter::new();
        let package_name = "Microsoft.WindowsCalculator_8wekyb3d8bbwe";

        // This test just verifies URL format, doesn't make actual request
        let expected_base = "https://displaycatalog.md.mp.microsoft.com/v7.0/products/lookup";
        let url = format!(
            "{}/products/lookup?market={}&languages={}&alternateId=PackageFamilyName&value={}",
            MS_STORE_API_BASE, adapter.market, adapter.language, package_name
        );

        assert!(url.starts_with(expected_base));
        assert!(url.contains("PackageFamilyName"));
        assert!(url.contains(package_name));
    }

    // Integration test (requires network, disabled by default)
    #[test]
    #[ignore = "requires network access"]
    fn test_fetch_calculator_artwork() {
        let adapter = MicrosoftStoreAdapter::new();
        let result = adapter.fetch_artwork("Microsoft.WindowsCalculator_8wekyb3d8bbwe");

        assert!(result.is_ok());
        let artwork = result.unwrap();

        // Calculator might not have all image types, just check that we got something
        println!("Cover: {:?}", artwork.cover_url);
        println!("Hero: {:?}", artwork.hero_url);
        println!("Logo: {:?}", artwork.logo_url);

        assert!(
            artwork.cover_url.is_some() || artwork.hero_url.is_some() || artwork.logo_url.is_some(),
            "Expected at least one image type to be available"
        );
    }
}
