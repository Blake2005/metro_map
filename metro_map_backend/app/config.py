from pydantic_settings import BaseSettings, SettingsConfigDict

# Application settings that are loaded from environment variables / a .env file through pydantic-settings.
class Settings(BaseSettings):
    metro_api_url: str
    gtfs_url: str
    routes_tracked : frozenset[int]
    db_path: str
    static_db_path: str
    gtfs_static_url: str
    polling_interval: float = 10.0
    request_timeout_secs: float = 8.0

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )

settings = Settings()

ROUTES: dict[int, str] = {
    902: "METRO_GREEN_LINE",
    901: "METRO_BLUE_LINE",
    903: "METRO_RED_LINE",
    904: "METRO_ORANGE_LINE",
    905: "METRO_GOLD_LINE",
}