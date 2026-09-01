"""Página pública do Media Kit da Ananda."""

import os
from urllib.parse import quote

from flask import Blueprint, current_app, make_response, render_template

from services.media_kit_data import media_kit_data


media_kit_bp = Blueprint("media_kit", __name__)


@media_kit_bp.get("/media-kit")
def media_kit():
    data = media_kit_data.get(current_app.logger)
    email = os.environ.get(
        "MEDIA_KIT_CONTACT_EMAIL", "gabrielshimabuko01@gmail.com"
    ).strip()
    instagram_url = os.environ.get("MEDIA_KIT_INSTAGRAM_URL", "").strip()
    subject = quote("Proposta de parceria — Viajando com Ananda")
    response = make_response(
        render_template(
            "media_kit.html",
            media=data,
            contact_email=email,
            email_subject=subject,
            instagram_url=instagram_url if instagram_url.startswith("https://") else "",
        )
    )
    response.headers["Cache-Control"] = "public, max-age=300"
    return response
