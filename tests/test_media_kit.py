import os
import unittest
from unittest.mock import patch

from app import app
from services.media_kit_data import MediaKitDataService


class MediaKitRouteTest(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()

    def test_media_kit_renders_confirmed_metrics(self):
        response = self.client.get("/media-kit")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.content_type)
        self.assertIn("11,3 mil", response.get_data(as_text=True))
        self.assertIn("7,74%", response.get_data(as_text=True))

    def test_media_kit_is_isolated_from_chat_assets(self):
        body = self.client.get("/media-kit").get_data(as_text=True)

        self.assertIn("media-kit.css", body)
        self.assertIn("media-kit.js", body)
        self.assertNotIn("static/style.css", body)
        self.assertNotIn("static/chat.js", body)

    def test_existing_home_still_responds(self):
        self.assertEqual(self.client.get("/").status_code, 200)


class MediaKitDataServiceTest(unittest.TestCase):
    @patch.dict(
        os.environ,
        {
            "MEDIA_KIT_METRICS_CSV_URL": "https://example.com/metrics.csv",
            "MEDIA_KIT_AUDIENCE_CSV_URL": "https://example.com/audience.csv",
            "MEDIA_KIT_CONTENT_CSV_URL": "",
            "MEDIA_KIT_QUOTES_CSV_URL": "",
            "MEDIA_KIT_TESTIMONIALS_CSV_URL": "",
            "MEDIA_KIT_CACHE_SECONDS": "600",
        },
        clear=False,
    )
    def test_normalises_sheet_rows(self):
        service = MediaKitDataService()

        def rows(url):
            if "metrics" in url:
                return [{
                    "key": "followers", "value": "12.500",
                    "display_value": "12,5 mil", "label": "seguidores",
                    "period": "atual", "updated_at": "2026-09-01",
                    "order": "1", "active": "TRUE",
                }]
            return [{
                "dimension": "age", "label": "25–34", "value": "46",
                "display_value": "46%", "order": "1", "active": "TRUE",
            }]

        with patch.object(service, "_rows", side_effect=rows):
            data = service.get()

        self.assertEqual(data["metrics"][0]["value"], 12500)
        self.assertEqual(data["audience_groups"]["age"][0]["bar_value"], 46)

    @patch.dict(
        os.environ,
        {
            "MEDIA_KIT_METRICS_CSV_URL": "",
            "MEDIA_KIT_AUDIENCE_CSV_URL": "",
            "MEDIA_KIT_CONTENT_CSV_URL": "",
            "MEDIA_KIT_QUOTES_CSV_URL": "",
            "MEDIA_KIT_TESTIMONIALS_CSV_URL": "",
        },
        clear=False,
    )
    def test_uses_local_fallback_without_sheet_urls(self):
        data = MediaKitDataService().get()

        self.assertEqual(data["metrics"][0]["display_value"], "11,3 mil")
        self.assertEqual(data["metrics"][1]["display_value"], "1,3 milhão")


if __name__ == "__main__":
    unittest.main()
