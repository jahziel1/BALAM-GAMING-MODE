use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub title: String,
    pub path: String,
    pub image: Option<String>, // URL or Base64
    pub last_played: Option<u64>, // Timestamp
}